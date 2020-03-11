// Global var for map so we can manipulate it along the way
var geoMap;
var columns = ["dataset", "UnitNumber", "time", "area", "location", "pm1","pm25","pm10","temp","humidity","Latitude","Longitude"];
var latestDataUrl = window.location.href.substring(0, window.location.href.lastIndexOf("/")) + "/geoData.pl";
var unitId = "UnitNumber";
// TODO: This is duplicated in skiesUtils.showMap(). This needs to be fixed
var aqiLvlColours = ["rgb(0,128,0)", "rgb(255,255,0)", "rgb(255,165,0)", "rgb(255,0,0)", "rgb(128,0,128)", "rgb(128,0,0)", "rgb(0,0,0)"];
var UNITS_WARN = 20;

// Overwrite column names defined in skiesUtils
pm1Col = { "col": "pm1", "index": -1 };
pm25Col = { "col": "pm25", "index": -1 };
pm10Col = { "col": "pm10", "index": -1 };
dateCol = { "col": "time", "index": -1 };
tempCol = { "col": "temp", "index": -1 };
humCol = { "col": "humidity", "index": -1 };
areaCol = { "col": "area", "index": -1 };
locCol = { "col": "location", "index": -1 };

// Set the map div and sensor listing to 100% - navbar size and load latest data
$( document ).ready(function() {
    setElementSize();
    loadLatestData();
    // Populate the time number select box
    updateTime();
    createExplanatoryList();

    // Hide loading pane - Wait until initMap to hide loading pane (? or wait until dataloaded ?)
  });

window.onresize = function(event) {
    setElementSize();
}

function setElementSize() {
//  Looks like height includes space taken up by padding - Don't reduce max height for the map/sensor div by nav height
    $("#navMap").css("height", $(window).height());
    $("#mapSensors").css("max-height", $(window).height() - parseInt($("#myNav").css("height")) );
    // The following needs to be deferred until the loader has been removed
    // To appropriately size the sensor pane in both desktop and small screens get a child listItem size
    var lg = document.getElementById("mapSensorList");
    if (lg && lg.childElementCount > 0) {
        var li = lg.children[0];
        // Set sensor pane min-height to listItem height
        $("#mapSensors").css("min-height", $(li).css("height"));
    }
    $("#navMap").css("padding-top", $("#myNav").css("height"));
    $("#navData").css("padding-top", $("#myNav").css("height"));
    $("#navChart").css("padding-top", $("#myNav").css("height"));
    $("#navAbout").css("padding-top", $("#myNav").css("height"));
    $("#navHow").css("padding-top", $("#myNav").css("height"));
}

// Create listItems in #aqiColourList explaining AQI colours and PM thresholds
function createExplanatoryList() {
    var list = document.getElementById("aqiColourList");
    for (var i=0; i < aqithresholds.length; i++) {
        var li = document.createElement("li");
        li.setAttribute("class", "list-group-item");
        li.setAttribute("style", "background-color:" + aqiLvlColours[i] + ";");
        var aqiText = "AQI: " + (Number(aqithresholds[i]) + Number((i==0)?0:1));
        var pm1Text = "PM1: " + (Number(pm1thresholds[i]) + Number((i==0)?0:0.1));
        var pm25Text = "PM2.5: " + (Number(pm25thresholds[i]) + Number((i==0)?0:0.1));
        var pm10Text = "PM10: " + (Number(pm10thresholds[i]) + Number((i==0)?0:0.1));
        if (i == aqithresholds.length - 1) {
            aqiText += " +";
            pm1Text += " +";
            pm25Text += " +";
            pm10Text += " +";
        } else {
            aqiText += " - " + aqithresholds[i+1];
            pm1Text += " - " + pm1thresholds[i+1];
            pm25Text += " - " + pm25thresholds[i+1];
            pm10Text += " - " + pm10thresholds[i+1];
        }
        var text = aqiText + " (Equivalent to " + pm1Text + ", " + pm25Text + ", " + pm10Text + ")";
        li.innerText = text;
        list.appendChild(li);
    }
}

// Called when selected or visible is clicked, when a unit is clicked and when map bounds change
function updateDataTable() {
    var unitsToDisplay = [];
    if (document.getElementById("selected").checked) {
        unitsToDisplay = listGroupSelectedItems("mapSensorList");
    } else if (document.getElementById("visible").checked) {
        unitsToDisplay = listGroupVisibleItems("mapSensorList");
    }
    if (unitsToDisplay.length > 0) {
        // Convert from objects to unitID strings
        for (var i=0; i < unitsToDisplay.length; i++) {
            unitsToDisplay[i] = unitsToDisplay[i].getAttribute("id").substring(12);
        }
        var table = document.getElementById("dataTable");
        if (!table.tBodies || !table.tBodies[0] || table.tBodies[0].rows.length == 0) {
            return;
        }
        var rows = table.tBodies[0].rows;
        for (var i=0; i < rows.length; i++) {
            if (unitsToDisplay.indexOf(rows[i].cells[columns.indexOf(unitId)].innerText) < 0) {
                // Unit not found, hide it
                if (!($(rows[i]).hasClass("d-none"))) {
                    $(rows[i]).addClass("d-none");
                }
            } else {
                if ($(rows[i]).hasClass("d-none")) {
                    $(rows[i]).removeClass("d-none");
                }
            }
        }
        displayChartJs();
    }
}

// Add or remove marker clustering from the map
function clusterChange() {
    if (!geoMap) {
        return;
    }
    if (document.getElementById("clusterMarkers").checked) {
        // Use the existing clusterer if there is one
        if (geoMap["markerClusterer"]) {
            geoMap["markerClusterer"].setMap(geoMap);
        } else {
            geoMap["markerClusterer"] = new MarkerClusterer(geoMap, geoMap["mapMarkers"], {
	    		imagePath: "/markers/m",
                maxZoom: 11,});
        }
    } else {
        if (geoMap["markerClusterer"]) {
            geoMap["markerClusterer"].setMap(null);
        }
    }
}

function initMap() {
    // If the map already exists maintain the current centre and zoom
    var centre = new google.maps.LatLng(-25.4904429, 147.3062684);
    var zoom = 4;
    if (geoMap) {
        centre = geoMap.center;
        zoom = geoMap.zoom;
    }
    
    var dataCols = {};
    if (document.getElementById("latestData").tBodies && document.getElementById("latestData").tBodies.length > 0 && document.getElementById("latestData").tBodies[0].rows.length > 0) {
        dataCols = {
    		"unit": columns.indexOf("UnitNumber"),
	    	"area": columns.indexOf("area"),
		    "loc": columns.indexOf("location"),
    		"time": columns.indexOf("time"),
	    	"pm1": columns.indexOf("pm1"),
		    "pm25": columns.indexOf("pm25"),
            "pm10": columns.indexOf("pm10"),
            "temp": columns.indexOf("temp"),
            "hum": columns.indexOf("humidity"),
    		"lat": columns.indexOf("Latitude"),
            "long": columns.indexOf("Longitude")};
        geoMap = showMap("latestData", dataCols, zoom, centre, document.getElementById("clusterMarkers").checked);
        geoMap.addListener('bounds_changed', updateUnitVisibility);

        // Replace marker click info window listener
        for (var i=0; i < mapMarkers.length; i++) {
            google.maps.event.clearInstanceListeners(mapMarkers[i]);
            mapMarkers[i].addListener('click', function() {
                var unit = this["kUnit"];
                listGroupSelect("mapSensorList", "mapUnit-btn-" + unit, false);
            });
        }
    }
    // Update size of dynamic objects
    setElementSize();
}

function changeSelectedData() {
    displayUnitWarningIfNeeded();
    updateDataTable();
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
    updateDataTable();
    displayUnitWarningIfNeeded();
}

function loadLatestData() {
    downloadData(latestDataUrl, processLatestData);
}

function reloadData() {
    // Show loading screen and hide content
    $("#loader").addClass("d-flex"); // flex class overrides d-none

    if (document.getElementById("showLatest").checked) {
        loadLatestData();
    } else {
        // Build params
        var includeFaulty = false;
        if (!document.getElementById("hideFaulty").checked) {
            includeFaulty = true;
        }
        var timeNum = document.getElementById("timeNum").value;
        var timeType = document.getElementById("timeType").value;
        var units = "";
        var items;
        if (document.getElementById("selected").checked) {
            items = listGroupSelectedItems("mapSensorList");
        } else if (document.getElementById("visible").checked) {
            items = listGroupVisibleItems("mapSensorList");
        }
        if (items !== undefined) {
            for (var i=0; i < items.length; i++) {
                var thisId = items[i].getAttribute("id");
                thisId = thisId.substring(12);
                if (units.length > 0) {
                    units += ",";
                }
                units += thisId;
            }
        }
        var params = "";
        params += "?historical=1&timeNum=" + timeNum + "&timeType=" + timeType;
        if (includeFaulty) {
            params += "&faulty=1";
        }
        if (units.length > 0) {
            params += "&units=" + units;
        }
        downloadData(latestDataUrl + params, processHistoricalData);
    }
}

function processLatestData(latestData) {
    loadDataDisplay(latestData);
    processDataForMapping(latestData);
}

function processHistoricalData(latestData) {
    loadDataDisplay(latestData);
    // TODO: convert to averages then processDataForMapping
    // If timeType is hours just create an average of all observations for each sensor
    // Otherwise create an average for each day and then average daily averages
    // Approach: Rely on data sorted by Unit and Time Desc, create daily averages
    // If days use that, otherwise average them
    var averages = [];
    var curObj = {};
    var curUnit = "";
    var curDay;
    var pmCount = 0;
    var tmpCount = 0;
    for (var i=0; i < latestData.length; i++) {
        // Initialise if first unit
        if (curUnit == "") {
            curUnit = latestData[i]["UnitNumber"];
            curDay = {"time": latestData[i]["time"].substring(0, 10), "pm1": 0, "pm25": 0, "pm10": 0, "temp": 0, "humidity": 0};
            curObj["UnitNumber"] = curUnit;
            curObj["time"] = [];
        } else if (curUnit != latestData[i]["UnitNumber"]) {
            // New unit - Push existing to the array and start afresh
            curDay["pm1"] = curDay["pm1"] / pmCount;
            curDay["pm25"] = curDay["pm25"] / pmCount;
            curDay["pm10"] = curDay["pm10"] / pmCount;
            if (tmpCount > 0) {
                curDay["temp"] = curDay["temp"] / tmpCount;
                curDay["humidity"] = curDay["humidity"] / tmpCount;
            }
            curObj["time"].push(curDay);
            pmCount = 0;
            tmpCount = 0;
            averages.push(curObj);
            curObj = {};
            curObj["UnitNumber"] = latestData[i]["UnitNumber"];
            curObj["time"] = [];
            curUnit = latestData[i]["UnitNumber"];
            curDay = {"time": latestData[i]["time"].substring(0, 10), "pm1": 0, "pm25": 0, "pm10": 0, "temp": 0, "humidity": 0};
        } else if (curDay["time"] != latestData[i]["time"].substring(0, 10)) {
            // Same unit but a new day - Calculate average and reset counter
            curDay["pm1"] = curDay["pm1"] / pmCount;
            curDay["pm25"] = curDay["pm25"] / pmCount;
            curDay["pm10"] = curDay["pm10"] / pmCount;
            if (tmpCount > 0) {
                curDay["temp"] = curDay["temp"] / tmpCount;
                curDay["humidity"] = curDay["humidity"] / tmpCount;
            }
            curObj["time"].push(curDay);
            pmCount = 0;
            tmpCount = 0;
            curDay = {"time": latestData[i]["time"].substring(0, 10), "pm1": 0, "pm25": 0, "pm10": 0, "temp": 0, "humidity": 0};
        }
        // Add current values
        curDay["pm1"] += latestData[i]["pm1"];
        curDay["pm25"] += latestData[i]["pm25"];
        curDay["pm10"] += latestData[i]["pm10"];
        pmCount++;
        if (latestData[i]["temp"] != null) {
            curDay["temp"] += latestData[i]["temp"];
            curDay["humidity"] += latestData[i]["humidity"];
            tmpCount++;
        }

        if (!curObj["Latitude"]) {
            curObj["Latitude"] = latestData[i]["Latitude"];
            curObj["Longitude"] = latestData[i]["Longitude"];
        }
        if (!curObj["location"] && latestData[i]["location"] != null) {
            curObj["location"] = latestData[i]["location"];
            curObj["area"] = latestData[i]["area"];
        }
    }
    // Add the final item
    if (pmCount > 0) {
        curDay["pm1"] = curDay["pm1"] / pmCount;
        curDay["pm25"] = curDay["pm25"] / pmCount;
        curDay["pm10"] = curDay["pm10"] / pmCount;
    }
    if (tmpCount > 0) {
        curDay["temp"] = curDay["temp"] / tmpCount;
        curDay["humidity"] = curDay["humidity"] / tmpCount;
    }
    curObj["time"].push(curDay);
    averages.push(curObj);

    // Create daily averages
    for (var i=0; i < averages.length; i++) {
        var pm1Avg = 0;
        var pm25Avg = 0;
        var pm10Avg = 0;
        var tmpAvg = 0;
        var humAvg = 0;
        var pmCount = 0;
        var tmpCount = 0;
        for (var j=0; j < averages[i]["time"].length; j++) {
            if (averages[i]["time"][j]["temp"] > 0) {
                tmpAvg += averages[i]["time"][j]["temp"];
                humAvg += averages[i]["time"][j]["humidity"];
                tmpCount++;
            }
            pm1Avg += averages[i]["time"][j]["pm1"];
            pm25Avg += averages[i]["time"][j]["pm25"];
            pm10Avg += averages[i]["time"][j]["pm10"];
            pmCount++;
        }
        pm1Avg = pm1Avg / pmCount;
        pm25Avg = pm25Avg / pmCount;
        pm10Avg = pm10Avg / pmCount;
        if (tmpCount > 0) {
            tmpAvg = tmpAvg / tmpCount;
            humAvg = humAvg / tmpCount;
        }
        averages[i]["pm1"] = pm1Avg.toFixed(2);
        averages[i]["pm25"] = pm25Avg.toFixed(2);
        averages[i]["pm10"] = pm10Avg.toFixed(2);
        averages[i]["temp"] = tmpAvg.toFixed(2);
        averages[i]["humidity"] = humAvg.toFixed(2);
        var newTime = averages[i]["time"][averages[i]["time"].length - 1]["time"] + " - " + averages[i]["time"][0]["time"];
        averages[i]["time"] = newTime;
        averages[i]["dataset"] = "Daily Average";
    }
    // averages should now be in a suitable format for  the mapping utils
    processDataForMapping(averages);
}

function loadDataDisplay(latestData) {
    // Display data in table, update charts
    var table = document.getElementById("dataTable");
    var th;
    if (!table.tHead) {
        th = document.createElement("tHead");
        table.appendChild(th);
    }
    // Regenerate headers in case they change
    createTableHeaders(table, latestData[0]);

    removeTableRows(table);
    if (!table.tBodies || table.tBodies.length == 0) {
        th = document.createElement("tbody");
        table.appendChild(th);
    }
    for (var i=0; i < latestData.length; i++) {
        createTableRowFor(table, latestData[i], true);
    }
    displayChartJs();
}

function createTableRowFor(table, dataItem, display) {
    var t = document.createElement("tr");
    t.setAttribute("id", "row" + table.tBodies[0].rows.length);
    for (var i=0; i < columns.length; i++) {
        var td = document.createElement("td");
        if (display && (columns[i] == "Latitude" || columns[i] == "Longitude")) {
            td.innerText = Number(dataItem[columns[i]]).toFixed(4);
        } else if (display && columns[i] == "time") {
            td.innerText = dataItem[columns[i]];
            td.setAttribute("style", "white-space:nowrap;");
        } else {
            td.innerText = dataItem[columns[i]];
        }
        t.appendChild(td);
    }
    // Set the row colour based on PM values
    if (display) {
        var pm1 = t.cells[columns.indexOf("pm1")].innerText;
        var pm25 = t.cells[columns.indexOf("pm25")].innerText;
        var pm10 = t.cells[columns.indexOf("pm10")].innerText;
        var pmColour = 0;
        while (pm1 > pm1thresholds[pmColour+1]) {pmColour++;}
        while (pm25 > pm25thresholds[pmColour+1]) {pmColour++;}
        while (pm10 > pm10thresholds[pmColour+1]) {pmColour++;}
        t.setAttribute("style", "background-color:"+aqiLvlColours[pmColour]+";");
    }
    table.tBodies[0].appendChild(t);
}

function removeTableRows(table) {
    if (table.tBodies.length > 0 && table.tBodies[0].rows.length > 0) {
        table.tBodies[0].remove(0);
    }
}

function createTableHeaders(table, dataItem) {
    var t;
    if (table.tHead && table.tHead.rows.length > 0) {
        table.tHead.remove(0);
    }
    if (!table.tHead) {
        t = document.createElement("tHead");
        table.appendChild(t);
    }
    t = document.createElement("tr");
    table.tHead.appendChild(t);
    for (var i=0; i < columns.length; i++) {
        t = document.createElement("th");
        t.innerText = columns[i];
        table.tHead.rows[0].appendChild(t);
    }
}

function processDataForMapping(latestData) {
    var listGroup = document.getElementById("mapSensorList");
    var latestTable = document.getElementById("latestData");

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
    createTableHeaders(latestTable, latestData[0]);
    var th;

    removeTableRows(latestTable);

    if (!latestTable.tBodies || !latestTable.tBodies[0]) {
        th = document.createElement("tbody");
        latestTable.appendChild(th);
    }

    // Remove existing list group items
    while (listGroup.childElementCount > 0) {
        listGroup.removeChild(listGroup.children[0]);
    }

    for (var i=0; i < latestData.length; i++) {
        // Create the list group item
        var btn = document.createElement("a");
        btn.setAttribute("href", "#");
        btn.setAttribute("id", "mapUnit-btn-" + latestData[i][unitId]);
        btn.setAttribute("class", "py-1 px-1 px-md-2 list-group-item-action list-group-item");
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
            updateDataTable();
        };
        listGroup.appendChild(btn);

        // Create the row in latestData
        createTableRowFor(latestTable, latestData[i], false);
    }
    initMap();
    updateUnitVisibility();
}

// Define the contents of the sensor list items
function buttonLayout(dataItem) {
    var ret = "<div class='d-flex flex-column h-100'><div class='d-flex w-100 justify-content-between'><small class='text-truncate'>";
    // Hide several elements of name on small screens
    ret += "<strong class='d-none d-md-inline-block'>#</strong><strong>" + parseInt(dataItem[unitId].substring(3));
    if ((dataItem["area"] && dataItem["area"].length > 0) || (dataItem["location"] && dataItem["location"].length > 0)) {
        ret += "</strong><strong class='d-none d-md-inline'>:</strong><strong> ";
        var area = false;
        if (dataItem["area"] && dataItem["area"].length > 0) {
            area = true;
            ret += dataItem["area"];
        }
        if (dataItem["location"] && dataItem["location"].length > 0) {
            if (area) {
                ret += "</strong><strong title='" + dataItem["location"] + "' class='d-none d-md-inline'> - ";
            }
            ret += dataItem["location"];
        }
    }
    ret += "</strong></small><small class='text-nowrap ml-1'><em>";
    // For daily averages don't parse the time
    if (dataItem["dataset"] == "Daily Average") {
        ret += dataItem["time"];
    } else {
        ret += timeForDisplay(dataItem["time"]);
    }
    ret += "</em></small></div>\n<small class='mt-auto'><div class='d-flex flex-row flex-wrap'>\n";
    
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
    var ret = "<div class='d-flex align-items-center flex-nowrap mr-2'><div class='d-flex flex-fill mr-1'><small><strong>" + label +
            "</strong></small></div><div class='d-flex flex-fill mr-1'><small>" + value + "</small></div></div>\n";
    return ret;
}

function downloadData(url, callback) {
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.send(null);
    request.onreadystatechange = function() {
        if (request.readyState === 4 && request.status === 200) {
            var content = JSON.parse(request.responseText);
            // Sort the results on unitId and time (newest to oldest)
            content.sort(function(a, b) {
                if (a[unitId] == b[unitId]) {
                    if (timeForSort(a["time"]) == timeForSort(b["time"])) {
                        return 0;
                    } else if (timeForSort(a["time"]) < timeForSort(b["time"])) {
                        return 1;
                    } else {
                        return -1;
                    }
                } else {
                    return ((a[unitId] < b[unitId])?-1:1);
                }
            });
            // Hide the loading pane
            $("#loader").removeClass("d-flex");
            callback(content);
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

function updateMapTimeType() {
    updateTime();
    displayUnitWarningIfNeeded();
}

function displayUnitWarningIfNeeded() {
    var type = document.getElementById("timeType").value;
    // Display a warning if lots of units are in scope
    var dataScope;
    if (document.getElementById("selected").checked) {
        dataScope = "selected";
    } else if (document.getElementById("visible").checked) {
        dataScope = "visible";
    } else {
        dataScope = "all";
    }
    var selectedUnits = listGroupNumSelected("mapSensorList");
    var visibleUnits = listGroupNumVisible("mapSensorList");
    if ((type == "weeks" || type == "months" || type == "years") &&
            (dataScope == "all" || (dataScope == "selected" && selectedUnits >= UNITS_WARN) || 
                (dataScope == "visible" && visibleUnits >= UNITS_WARN))) {
            // Display the alert
        $("#timeWarn").removeClass("d-none").addClass("show");
    } else {
        $("#timeWarn").removeClass("show").addClass("d-none");
    }
}