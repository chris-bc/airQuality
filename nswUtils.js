// Define some constants so we know column names
var unitCol = { "col": "UnitNumber", "index": -1 };
var tempCol = { "col": "TempDegC", "index": -1 };
var humCol = { "col": "Humidity", "index": -1 };
var pm1Col = { "col": "PM1", "index": -1 };
var pm25Col = { "col": "PM2", "index": -1 };
var pm10Col = { "col": "PM10", "index": -1 };
var dateCol = { "col": "SensingDate", "index": -1 };

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
      }
    }
  }

  // Go through all rows of the datatable and set the colour class appropriately
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
