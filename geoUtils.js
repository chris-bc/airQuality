// Global var for map so we can manipulate it along the way
var geoMap;
var columnIndices;
var latestDataUrl = "http://bennettscash.no-ip.org/geoLatest.pl";
var unitId = "UnitNumber";

// DEBUG
latestDataUrl = "http://127.0.0.1/geoLatest.pl";

// Set the map div and sensor listing to 100% - navbar size and load latest data
$( document ).ready(function() {
    setElementSize();
    loadLatestData();
  });

window.onresize = function(event) {
    setElementSize();
}

function setElementSize() {
    $("#navMap").css("height", $(window).height() - parseInt($("#myNav").css("height")) );
    $("#mapSensors").css("height", $(window).height() - parseInt($("#myNav").css("height")) );
    $("#navMap").css("padding-top", $("#myNav").css("height"));
    $("#navData").css("padding-top", $("#myNav").css("height"));
    $("#navChart").css("padding-top", $("#myNav").css("height"));
    $("#navAbout").css("padding-top", $("#myNav").css("height"));
}

function initMap() {
    var centre = new google.maps.LatLng(-25.4904429, 147.3062684);
    var zoom = 4;
    var dataCols = {};
    if (columnIndices !== undefined) {
        dataCols = {
    		"unit": columnIndices["UnitNumber"],
	    	"area": columnIndices["area"],
		    "loc": columnIndices["location"],
    		"time": columnIndices["time"],
	    	"pm1": columnIndices["pm1"],
		    "pm25": columnIndices["pm25"],
            "pm10": columnIndices["pm10"],
            "temp": columnIndices["temp"],
            "hum": columnIndices["humidity"],
    		"lat": columnIndices["Latitude"],
            "long": columnIndices["Longitude"]};
        geoMap = showMap("latestData", dataCols, zoom, centre);
	}
}

function loadLatestData() {
    downloadData(latestDataUrl, processLatestData);
}

function processLatestData(jsonData) {
    var latestData = JSON.parse(jsonData);
    var listGroup = document.getElementById("mapSensorList");
    var latestTable = document.getElementById("latestData");
    columnIndices = {};
    // Sort the JSON data
    latestData = latestData.sort(function (a, b) {
        if (a[unitId] == b[unitId]) {
            return 0;
        }
        return ((a[unitId]<b[unitId])?-1:1);
    });
    // Some units are present in both datasets
    // Identify those cases and find the latest obs
    // Supplement its data with the other (temp and hum or area and loc)
    // and remove the second
    for (var i=1; i < latestData.length; i++) {
        // Is element i the same as i-1?
        if (latestData[i][unitId] == latestData[i-1][unitId]) {
            var retain, remove;
            if (timeForSort(latestData[i]["time"]) < timeForSort(latestData[i-1]["time"])) {
                // Retain element i-1. If i is from koala donate its loc & area, otherwise its temp & hum
                retain = i-1;
                remove = i;
            } else {
                retain = i;
                remove = i-1;
            }
            if (latestData[remove]["dataset"] == "KOALA") {
                latestData[retain]["location"] = latestData[remove]["location"];
                latestData[retain]["area"] = latestData[remove]["area"];
            } else {
                latestData[retain]["temp"] = latestData[remove]["temp"];
                latestData[retain]["humidity"] = latestData[remove]["humidity"];
            }
            latestData.splice(remove, 1);
            // Decrement i because we've removed an element
            i--;
        }
    }

    // Create table headers
    var th;
    if (!latestTable.tHead) {
        th = document.createElement("thead");
        latestTable.appendChild(th);
    }
    th = document.createElement("tr");
    latestTable.tHead.appendChild(th);
    var cols = Object.keys(latestData[0]);
    for (var i=0; i < cols.length; i++) {
        th = document.createElement("th");
        th.innerText = cols[i];
        latestTable.tHead.rows[0].appendChild(th);
        columnIndices[cols[i]] = i;
    }
    if (!latestTable.tBodies || !latestTable.tBodies[0]) {
        th = document.createElement("tbody");
        latestTable.appendChild(th);
    }

    for (var i=0; i < latestData.length; i++) {
        // Create the list group item
        var btn = document.createElement("button");
        btn.setAttribute("type", "button");
        btn.setAttribute("id", "mapUnit-btn-" + latestData[i][unitId]);
        btn.setAttribute("class", "py-1 list-group-item-action list-group-item");
        btn.innerText = latestData[i][unitId];
        listGroup.appendChild(btn);

        // Create the row in latestData
        var tr = document.createElement("tr");
        for (var j=0; j < cols.length; j++) {
            var td = document.createElement("td");
            td.innerText = latestData[i][cols[j]];
            tr.appendChild(td);
        }
        latestTable.tBodies[0].appendChild(tr);
    }
    initMap();
}

function downloadData(url, callback) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.send(null);
    request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status === 200) {
            callback(request.responseText);
        }
    }
}
