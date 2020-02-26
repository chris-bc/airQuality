// Define some constants so we know column names
var unitCol = { "col": "UnitNumber", "index": -1 };
var tempCol = { "col": "TempDegC", "index": -1 };
var humCol = { "col": "Humidity", "index": -1 };
var pm1Col = { "col": "PM1", "index": -1 };
var pm25Col = { "col": "PM2", "index": -1 };
var pm10Col = { "col": "PM10", "index": -1 };
var dateCol = { "col": "SensingDate", "index": -1 };
var latCol = { "col": "Latitude", "index": -1 };
var longCol = { "col": "Longitude", "index": -1 };
var chartData = [];
var mapMarkers = [];

// Set the unit listing to be the same height as the sort column listing
$( document ).ready(function() {
  $("#unitContainer").css("height", $("#sortContainer").css("height"));
})

function rebuildSortString() {
  var listGroup = document.getElementById("sortList");
  var sortStr = document.getElementById("sort");
  var sortCols = [];

  for (var i=0; i<listGroup.childElementCount; i++) {
    var col = listGroup.children[i].getAttribute("col");
    var num = document.getElementById("sortNum-" + col).innerText;
    var dir = document.getElementById("sortOrder-" + col).innerText;

    if (num && num.length > 0) {
      sortCols[parseInt(num)] = col;
    }
    if (dir && dir.length > 0 && dir == "DESC") {
      sortCols[parseInt(num)] = sortCols[parseInt(num)] + " " + dir;
    }
  }

  sortStr.value = "";
  for (var i=1; i < sortCols.length; i++) {
    if (sortStr.value.length > 0) {
      sortStr.value = sortStr.value + ",";
    }
    sortStr.value = sortStr.value + sortCols[i];
  }
}

function sortChange(colName) {
  var btnSel = "#sort-btn-" + colName;
  var num = document.getElementById("sortNum-" + colName);
  var dir = document.getElementById("sortOrder-" + colName);

  if ($(btnSel).hasClass("active")) {
    // Currently being used - Are we switching from asc->desc or desc->none?
    if (dir.innerText == "ASC") {
      dir.innerText = "DESC";
    } else {
      var oldNum = num.innerText;
      dir.innerText = "";
      num.innerText = "";
      $(btnSel).removeClass("active");
      sortRebuildNumbers(oldNum);
    }
  } else {
    $(btnSel).addClass("active");
    dir.innerText = "ASC";
    num.innerText = (parseInt(getSortColNum()) + 1);
  }

  rebuildSortString();
}

function getSortColNum() {
  var listGroup = document.getElementById("sortList");
  var maxNum = 0;
  for (var i=0; i < listGroup.childElementCount; i++) {
    var col = listGroup.children[i].getAttribute("col");
    var num = document.getElementById("sortNum-" + col).innerText;
    if (num && num.length > 0 && parseInt(num) > maxNum) {
      maxNum = parseInt(num);
    }
  }
  return maxNum;
}

function sortRebuildNumbers(removedNum) {
  // If the number we removed is greater than the max number now displayed
  // there's nothing to do
  var maxNum = getSortColNum()
  if (removedNum <= maxNum) {
    var childCount = document.getElementById("sortList").childElementCount;
    for (var i=(parseInt(removedNum) + 1); i<= maxNum; i++) {
      // Find the element with num i and reduce it by 1
      var child;
      for (child=0; child < childCount &&
          document.getElementById("sortNum-" + document.getElementById("sortList").children[child].getAttribute("col")).innerText != i; child++) {}
      if (child == childCount) {
        // Not found - this shouldn't happen
        alert("An error occurred - I couldn't find a row in sort position " + i);
      } else {
        document.getElementById("sortNum-" + document.getElementById("sortList").children[child].getAttribute("col")).innerText = (i - 1);
      }
    }
  }
}

function toggleUnit(unitNumber) {
  // If the selected unit is active deactivate it and vice versa
  // Add or remove the unit from the sort input field
  var unitsInp = document.getElementById("units");
  var btnSel = "#unit-btn-" + unitNumber;
  if ($(btnSel).hasClass("active")) {
    $(btnSel).removeClass("active");
    // Remove unitNumber from units.value
    var unitsArr = unitsInp.value.split(",");
    var i = unitsArr.indexOf(unitNumber);
    if (i > -1) {
      unitsArr.splice(i, 1);
    } else {
      // unit not found. This should never happen
      alert("Unable to find " + unitNumber + " in units array!");
    }
    unitsInp.value = unitsArr.join(",");
  } else {
    $(btnSel).addClass("active");
    if (unitsInp.value.length > 0) {
      unitsInp.value = unitsInp.value + ",";
    }
    unitsInp.value = unitsInp.value + unitNumber;
  }
  rebuildDataUnits();
  displayChartJs();
}

function findColumnIndices() {
  var dataTable = document.getElementById("dataTable");
  var headers = dataTable.tHead.rows[0].cells;
  for (var i=0; i < headers.length; i++) {
    if (headers[i].textContent == unitCol["col"]) {
      unitCol["index"] = i;
    } else if (headers[i].textContent == tempCol["col"]) {
      tempCol["index"] = i;
    } else if (headers[i].textContent == humCol["col"]) {
      humCol["index"] = i;
    } else if (headers[i].textContent == pm1Col["col"]) {
      pm1Col["index"] = i;
    } else if (headers[i].textContent == pm25Col["col"]) {
      pm25Col["index"] = i;
    } else if (headers[i].textContent == pm10Col["col"]) {
      pm10Col["index"] = i;
    } else if (headers[i].textContent == dateCol["col"]) {
      dateCol["index"] = i;
    } else if (headers[i].textContent == latCol["col"]) {
      latCol["index"] = i;
    } else if (headers[i].textContent == longCol["col"]) {
      longCol["index"] = i;
    }
  }
}

function rebuildDataUnits() {
  var unitsStr = document.getElementById("units").value;
  var dataTable = document.getElementById("dataTable");
  if (dataTable.tBodies[0] === undefined) {
    // No rows
    return;
  }
  var rows = dataTable.tBodies[0].rows;

  if (unitsStr.length == 0) {
    // Display all units
    for (var i=0; i < rows.length; i++) {
      var uSel = "#" + rows[i].getAttribute("id");
      if ($(uSel).hasClass("d-none")) {
        $(uSel).removeClass("d-none");
      }
    }
  } else {
    var unitsArr = unitsStr.split(",");
    if (unitCol["index"] == -1) {
      findColumnIndices();
    }

    for (var i=0; i < rows.length; i++) {
      var unit = rows[i].cells[unitCol["index"]].textContent;
      var uSel = "#" + rows[i].getAttribute("id");
      if (unitsArr.indexOf(unit) > -1) {
        // Unit is selected. Display it if hidden
        if ($(uSel).hasClass("d-none")) {
          $(uSel).removeClass("d-none");
        }
      } else {
        // Unit not selected. Hide it if not already hidden
        if (!($(uSel).hasClass("d-none"))) {
          $(uSel).addClass("d-none");
        }
      }
    }
  }
}

// Update the data table after thresholds are changed
function rebuildDataThresholds() {
  var pm1Med = parseInt(document.getElementById("pm1MedSlider").value);
  var pm1High = parseInt(document.getElementById("pm1HighSlider").value);
  var pm25Med = parseInt(document.getElementById("pm25MedSlider").value);
  var pm25High = parseInt(document.getElementById("pm25HighSlider").value);
  var pm10Med = parseInt(document.getElementById("pm10MedSlider").value);
  var pm10High = parseInt(document.getElementById("pm10HighSlider").value);
  var tempMed = parseInt(document.getElementById("tempMedSlider").value);
  var tempHigh = parseInt(document.getElementById("tempHighSlider").value);
  var humMed = parseInt(document.getElementById("humMedSlider").value);
  var humHigh = parseInt(document.getElementById("humHighSlider").value);

  var dataTable = document.getElementById("dataTable");
  // If we don't already know column indices find them now
  if (unitCol["index"] == -1) {
    findColumnIndices();
  }

  // Go through all rows of the datatable and set the colour class appropriately
  if (dataTable.tBodies[0] === undefined) {
    // No rows
    return;
  }
  var rows = dataTable.tBodies[0].rows;
  for (var i=0; i < rows.length; i++) {
    var rowSel = "#" + rows[i].getAttribute("id");
    var hum = Number(rows[i].cells[humCol["index"]].textContent);
    var temp = Number(rows[i].cells[tempCol["index"]].textContent);
    var pm1 = Number(rows[i].cells[pm1Col["index"]].textContent);
    var pm25 = Number(rows[i].cells[pm25Col["index"]].textContent);
    var pm10 = Number(rows[i].cells[pm10Col["index"]].textContent);

    // Remove colour classes
    if ($(rowSel).hasClass("table-success")) {
      $(rowSel).removeClass("table-success");
    }
    if ($(rowSel).hasClass("table-warning")) {
      $(rowSel).removeClass("table-warning");
    }
    if ($(rowSel).hasClass("table-danger")) {
      $(rowSel).removeClass("table-danger");
    }

    if (hum < humMed && temp < tempMed && pm1 < pm1Med && pm25 < pm25Med && pm10 < pm10Med) {
      $(rowSel).addClass("table-success");
    } else if (hum < humHigh && temp < tempHigh && pm1 < pm1High && pm25 < pm25High && pm10 < pm10High) {
      $(rowSel).addClass("table-warning");
    } else {
      $(rowSel).addClass("table-danger");
    }
  }
}

function buildTableObjects() {
  chartData = [];
  if (unitCol["index"] == -1) {
    findColumnIndices();
  }

  var table = document.getElementById("dataTable");
  if (table.tBodies[0] === undefined) {
    // No rows
    return;
  }
  var rows = table.tBodies[0].rows;
  for (var i=0; i < rows.length; i++) {
    // Only include the row if it is shown
    var rowSel = "#" + rows[i].getAttribute("id");
    if (!($(rowSel).hasClass("d-none"))) {
      var unit = rows[i].cells[unitCol["index"]].innerText;
      var temp = Number(rows[i].cells[tempCol["index"]].innerText);
      var hum = Number(rows[i].cells[humCol["index"]].innerText);
      var pm1 = Number(rows[i].cells[pm1Col["index"]].innerText);
      var pm25 = Number(rows[i].cells[pm25Col["index"]].innerText);
      var pm10 = Number(rows[i].cells[pm10Col["index"]].innerText);
      var obsTime = rows[i].cells[dateCol["index"]].innerText;

      if (!(unit in chartData)) {
        chartData[unit] = [];
      }
      chartData[unit][obsTime] = [];
      chartData[unit][obsTime]["temp"] = temp;
      chartData[unit][obsTime]["hum"] = hum;
      chartData[unit][obsTime]["pm1"] = pm1;
      chartData[unit][obsTime]["pm25"] = pm25;
      chartData[unit][obsTime]["pm10"] = pm10;
    }
  }
}

function initChartDs(ds, unit, obsType) {
  var pointRadius = 3;
  var showLine = true;
  ds["label"] = unit + " - " + obsType;
  ds["pointRadius"] = pointRadius;
  ds["showLine"] = showLine;
  var col = rndColour();
  ds["pointBackgroundColor"] = col;
  ds["backgroundColor"] = col;
}

function displayChartJs() {
  // If any row has fewer than 3 observations display a bar chart, otherwise line
  var pmChart = document.getElementById("pmChart");
  var envChart = document.getElementById("envChart");
  if (chartData.length == 0) {
    buildTableObjects();
  }
  var numObs;
  var minObs = 999;
  for (var unitId in chartData) {
    numObs = 0;
    for (var time in chartData[unitId]) {
      numObs++;
    }
    if (numObs < minObs) {
      minObs = numObs;
    }
  }

  if (minObs >= 3) {
    // Prepare line charts
    var pointRadius = 3;
    var showLine = true;
    var pmData = {};
    var envData = {};
    pmData.datasets = [];
    envData.datasets = [];
    var pm1ds;
    var pm25ds;
    var pm10ds;
    var tempDs;
    var humDs;
    for (var unitId in chartData) {
      pm1ds = {};
      pm25ds = {};
      pm10ds = {};
      tempDs = {};
      humDs = {};
      pm1ds.data = [];
      pm25ds.data = [];
      pm10ds.data = [];
      tempDs.data = [];
      humDs.data = [];

      initChartDs(pm1ds, unitId, "PM1");
      initChartDs(pm25ds, unitId, "PM2.5");
      initChartDs(pm10ds, unitId, "PM10");
      initChartDs(tempDs, unitId, "Temp");
      initChartDs(humDs, unitId, "Humidity");

      for (var time in chartData[unitId]) {
        pm1ds.data.push({x: time, y: chartData[unitId][time]["pm1"]});
        pm25ds.data.push({x: time, y: chartData[unitId][time]["pm25"]});
        pm10ds.data.push({x: time, y: chartData[unitId][time]["pm10"]});
        tempDs.data.push({x: time, y: chartData[unitId][time]["temp"]});
        humDs.data.push({x: time, y: chartData[unitId][time]["hum"]});
      }

      pmData.datasets.push(pm1ds);
      pmData.datasets.push(pm25ds);
      pmData.datasets.push(pm10ds);
      envData.datasets.push(tempDs);
      envData.datasets.push(humDs);
    }

    // If we're viewing hours or days display minutes, otherwise days
    var timeUnit = "day";
    if (document.getElementById("timeType").value == "hours" || document.getElementById("timeType").value == "days") {
      timeUnit = "minute";
    }
    var leg = true;
    // Hide the legend if more than 10 units visible
    if (pmData.datasets.length > 10) {
      leg = false;
    }

    drawLineChart(pmChart, pmData, leg, timeUnit);
    drawLineChart(envChart, envData, leg, timeUnit);
  } else {
    // Prepare bar chart
    var pmContainer = [];
    var envContainer = [];
    var displayTypes = {"pm1": "PM 1", "pm25": "PM 2.5", "pm10": "PM 10", "temp": "Temp", "hum": "Humidity"};
    // Create a data item for each observation
    for (var unitId in chartData) {
      for (var time in chartData[unitId]) {
        for (var type in displayTypes) {
          var obs = {};
          // Reformat time for sorting and display
          var strTime = timeForDisplay(time);
          var strTimeSort = timeForSort(time);
          var labelPrefix = unitId + " - " + displayTypes[type];
          obs["label"] = labelPrefix + " - " + strTime;
          obs["sortLabel"] = labelPrefix + " - " + strTimeSort;
          obs["bgCol"] = rndColour();
          obs["data"] = chartData[unitId][time][type];
          if (type == "temp" || type == "hum") {
            envContainer.push(obs);
          } else {
            pmContainer.push(obs);
          }
        }
      }
    }
    // Sort the data containers
    pmContainer.sort(function (a, b) {
      return a["sortLabel"] < b["sortLabel"];
    });
    envContainer.sort(function (a, b) {
      return a["sortLabel"] < b["sortLabel"];
    });

    // Unroll the containers into arrays
    var envData = [];
    var pmData = [];
    var envLabels = [];
    var pmLabels = [];
    var envCols = [];
    var pmCols = [];

    for (var i in pmContainer) {
      pmData.push(pmContainer[i]["data"]);
      pmLabels.push(pmContainer[i]["label"]);
      pmCols.push(pmContainer[i]["bgCol"]);
    }
    for (var i in envContainer) {
      envData.push(envContainer[i]["data"]);
      envLabels.push(envContainer[i]["label"]);
      envCols.push(envContainer[i]["bgCol"]);
    }

    drawBarChart(pmChart, pmData, pmLabels, pmCols);
    drawBarChart(envChart, envData, envLabels, envCols);
  }
}

function initMap() {
  // Use the same columnIndices as the data table
  if (unitCol["index"] == -1) {
    findColumnIndices();
  }
	var centre = new google.maps.LatLng(-25.4904429, 147.3062684);
	var zoom = 4;
	var columnIndices = {
		"unit": unitCol["index"],
		"area": -1,
		"loc": -1,
		"time": dateCol["index"],
		"pm1": pm1Col["index"],
		"pm25": pm25Col["index"],
		"pm10": pm10Col["index"],
		"lat": latCol["index"],
		"long": longCol["index"],
		"temp": tempCol["index"],
		"hum": humCol["index"],
	};
	showMap("latestData", columnIndices, zoom, centre);
}
