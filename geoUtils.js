// Global var for map so we can manipulate it along the way
var geoMap;
var columnIndices;
var latestDataUrl = "http://bennettscash.no-ip.org/geoLatest.pl";
var unitId = "UnitNumber";
// TODO: This is duplicated in skiesUtils.showMap(). This needs to be fixed
var aqiLvlColours = ["rgb(0,128,0)", "rgb(255,255,0)", "rgb(255,165,0)", "rgb(255,0,0)", "rgb(128,0,128)", "rgb(128,0,0)", "rgb(0,0,0)"];

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
//  Looks like height includes space taken up by padding - Don't reduce max height for the map/sensor div by nav height
    $("#navMap").css("height", $(window).height());
    $("#mapSensors").css("max-height", $(window).height() - parseInt($("#myNav").css("height")) );
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
        geoMap.addListener('bounds_changed', updateUnitVisibility);

        // Replace marker click info window listener
        for (var i=0; i < mapMarkers.length; i++) {
            google.maps.event.clearInstanceListeners(mapMarkers[i]);
            mapMarkers[i].addListener('click', function() {
                var unit = this["kUnit"];
                listGroupSelectOnly("mapSensorList", "mapUnit-btn-" + unit);
            });
            // mapMarkers[i].addListener("mouseover", function() {
            //     this.setAnimation(google.maps.Animation.BOUNCE);
            // });
            // mapMarkers[i].addListener("mouseout", function() {
            //     this.setAnimation(null);
            // });
        }
	}
}

function updateUnitVisibility() {
    if (geoMap === undefined || mapMarkers === undefined || geoMap.getBounds() === undefined) {
        return;
    }
    var bounds = geoMap.getBounds();
    for (var i=0; i < mapMarkers.length; i++) {
        var btnSel = "#mapUnit-btn-" + mapMarkers[i]["kUnit"];
        if (bounds.contains(mapMarkers[i].getPosition())) {
            // Show the list item for this sensor
            if ($(btnSel).hasClass("d-none")) {
                $(btnSel).removeClass("d-none");
            }
        } else {
            // Hide it
            if (!($(btnSel).hasClass("d-none"))) {
                $(btnSel).addClass("d-none");
            }
        }
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
        var btn = document.createElement("a");
        btn.setAttribute("href", "#");
        btn.setAttribute("id", "mapUnit-btn-" + latestData[i][unitId]);
        btn.setAttribute("class", "py-1 list-group-item-action list-group-item");
        btn.innerHTML = buttonLayout(latestData[i]);
        btn.onmouseenter = function() {
            animateMarker(this.getAttribute("id").substring(12));
        };
        btn.onmouseleave = function() {
            stopAnimateMarker(this.getAttribute("id").substring(12));
        };
        btn.onclick = function() {
            var sel = "#" + this.getAttribute("id");
            if ($(sel).hasClass("active")) {
                $(sel).removeClass("active");
            } else {
                $(sel).addClass("active");
            }
        };
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
    updateUnitVisibility();
}

// Define the contents of the sensor list items
function buttonLayout(dataItem) {
    var ret = "<div class='d-flex flex-column'><div class='d-flex w-100 justify-content-between'><small><strong>" + parseInt(dataItem[unitId].substring(3));
    if ((dataItem["area"] && dataItem["area"].length > 0) || (dataItem["location"] && dataItem["location"].length > 0)) {
        ret += " - ";
        var area = false;
        if (dataItem["area"] && dataItem["area"].length > 0) {
            area = true;
            ret += dataItem["area"];
        }
        if (dataItem["location"] && dataItem["location"].length > 0) {
            if (area) {
                ret += " - ";
            }
            ret += dataItem["location"];
        }
    }
    ret += "</strong></small><small><em>" + timeForDisplay(dataItem["time"]) + "</em></small></div>\n<small><div class='d-flex flex-row flex-wrap'>";
    if (dataItem["temp"] !== undefined && dataItem["temp"] != null) {
        ret += "<div class='d-flex flex-nowrap mr-2'><div class='mr-1'><small><strong>Temperature:</strong></small></div><div class='mr-1'><small>";
        ret += dataItem["temp"] + "</small></div></div>\n";
        ret += "<div class='d-flex flex-nowrap mr-2'><div class='mr-1'><small><strong>Humidity:</strong></small></div><div class='mr-1'><small>";
        ret += dataItem["humidity"] + "</small></div></div>\n";
    }
    ret += flexDivWithLabelAndValue("PM1:", dataItem["pm1"]);
    ret += flexDivWithLabelAndValue("PM2.5:", dataItem["pm25"]);
    ret += flexDivWithLabelAndValue("PM10:", dataItem["pm10"]);
    ret += "<div class='d-flex w-100 justify-content-between'>";

    // Colourise AQI values
    var aqiPm1 = Math.round(calculateSingleAqi(dataItem["pm1"], pm1thresholds, aqithresholds))
    var aqiPm25 = Math.round(calculateSingleAqi(dataItem["pm25"], pm25thresholds, aqithresholds));
    var aqiPm10 = Math.round(calculateSingleAqi(dataItem["pm10"], pm10thresholds, aqithresholds));
    var pm1col = 0;
    while (aqithresholds[pm1col+1] <= aqiPm1 && pm1col < (aqithresholds.length - 1)) { pm1col++; }
    var pm25col = 0;
    while (aqithresholds[pm25col+1] <= aqiPm25 && pm25col < (aqithresholds.length - 1)) { pm25col++; }
    var pm10col = 0;
    while (aqithresholds[pm10col+1] <= aqiPm10 && pm10col < (aqithresholds.length - 1)) { pm10col++; }
    var style = "style = 'background-color:" + aqiLvlColours[pm1col];
    if (pm1col == 1) { // Font colour white except for yellow background
        style += ";color:black";
    } else {
        style += ";color:white";
    }
    style += ";' ";
    ret += "<span class='badge badge-pill' " + style + ">" + flexDivWithLabelAndValue("AQI<sub>PM1</sub>:", aqiPm1);
    style = "style = 'background-color:" + aqiLvlColours[pm25col];
    if (pm25col == 1) { // Font colour white except for yellow background
        style += ";color:black";
    } else {
        style += ";color:white";
    }
    style += ";' ";
    ret += "</span><span class='badge badge-pill' " + style + ">" + flexDivWithLabelAndValue("AQI<sub>PM2.5</sub>:", aqiPm25);
    style = "style = 'background-color:" + aqiLvlColours[pm10col];
    if (pm10col == 1) { // Font colour white except for yellow background
        style += ";color:black";
    } else {
        style += ";color:white";
    }
    style += ";' ";
    ret += "</span><span class='badge badge-pill' " + style + ">" + flexDivWithLabelAndValue("AQI<sub>PM10</sub>:", aqiPm10);
    ret += "</span></div>";
    ret += "</div></small></div>";

    return ret;
}

function flexDivWithLabelAndValue(label, value) {
    var ret = "<div class='d-flex flex-nowrap mr-2'><div class='d-flex flex-fill mr-1'><small><strong>" + label +
            "</strong></small></div><div class='d-flex flex-fill mr-1'><small>" + value + "</small></div></div>\n";
    return ret;
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

function animateMarker(unitId) {
    if (mapMarkers === undefined) {
        return;
    }
    var i;
    for (i=0; i < mapMarkers.length && mapMarkers[i]["kUnit"] != unitId; i++) {}
    if (i == mapMarkers.length) {
        // No marker
        return;
    }
    mapMarkers[i].setAnimation(google.maps.Animation.BOUNCE);
}

function stopAnimateMarker(unitId) {
    if (mapMarkers === undefined) {
        return;
    }
    var i;
    for (i=0; i < mapMarkers.length && mapMarkers[i]["kUnit"] != unitId; i++) {}
    if (i == mapMarkers.length) {
        return;
    }
    mapMarkers[i].setAnimation(null);
}
