// Define some constants so we know column names
var unitCol = { "col": "UnitNumber", "index": -1 };
var areaCol = { "col": "locationstring", "index": -1 };
var locCol = { "col": "locationdescription", "index": -1 };
var pm1Col = { "col": "pm1", "index": -1 };
var pm25Col = { "col": "pm25", "index": -1 };
var pm10Col = { "col": "pm10", "index": -1 };
var dateCol = { "col": "lastsensingdate", "index": -1 };
var latCol = { "col": "Latitude", "index": -1 };
var longCol = { "col": "Longitude", "index": -1 };

var chartData = [];
var bMeans = false;

// Set the unit filters to 300px height
$( document ).ready(function() {
  $("#unitContainer").css("height", "300px");
	$("#locationContainer").css("height", "300px");
	$("#areaContainer").css("height", "300px");
})

function findColumnIndices() {
	// Loop through table headers to identify column indices
	var sTable = document.getElementById("dataTable");
	var headers = sTable.tHead.rows[0].cells;
	for (var i = 0; i < headers.length; i++) {
		if (headers[i].textContent == pm1Col["col"]) {
			pm1Col["index"] = i;
		} else if (headers[i].textContent == pm25Col["col"]) {
			pm25Col["index"] = i;
		} else if (headers[i].textContent == pm10Col["col"]) {
			pm10Col["index"] = i;
		} else if (headers[i].textContent == areaCol["col"]) {
			areaCol["index"] = i;
		} else if (headers[i].textContent == locCol["col"]) {
			locCol["index"] = i;
		} else if (headers[i].textContent == unitCol["col"]) {
			unitCol["index"] = i;
		} else if (headers[i].textContent == dateCol["col"]) {
			dateCol["index"] = i;
		} else if (headers[i].textContent == latCol["col"]) {
			latCol["index"] = i;
		} else if (headers[i].textContent == longCol["col"]) {
			longCol["index"] = i;
		}
	}
}

// Redraw the table dynamically after making changes to row filters
function rebuildTable() {
	var sTable = document.getElementById("dataTable");
	if (unitCol["index"] == -1) {
		findColumnIndices();
	}
	if (sTable.tBodies === undefined || sTable.tBodies[0] === undefined) {
		// No rows
		return;
	}
	var rows = sTable.tBodies[0].rows;
	var selectedUnits = listGroupSelectedItems("limitUnit");
	var selectedLocs = listGroupSelectedItems("limitLoc");
	var selectedAreas = listGroupSelectedItems("limitArea");
	var unitsArr = [];
	var locsArr = [];
	var areasArr = [];
	var iSel;
	var rowUnit;
	var rowLoc;
	var rowArea;
	var rowPm1;
	var rowPm25;
	var rowPm10;

	var pm1Med = parseInt(document.getElementById("pm1MedSlider").value);
	var pm1High = parseInt(document.getElementById("pm1HighSlider").value);
	var pm25Med = parseInt(document.getElementById("pm25MedSlider").value);
	var pm25High = parseInt(document.getElementById("pm25HighSlider").value);
	var pm10Med = parseInt(document.getElementById("pm10MedSlider").value);
	var pm10High = parseInt(document.getElementById("pm10HighSlider").value);

	// Booleans to check whether all items are selected
	var allAreas = ($("#area-btn-all").hasClass("active"));
	var allLocs = ($("#loc-btn-all").hasClass("active"));
	var allUnits = ($("#unit-btn-all").hasClass("active"));

	// Convert selected items into arrays of strings
	for (var i=0; i < selectedUnits.length; i++) {
		unitsArr.push(selectedUnits[i].innerText);
	}
	for (var i=0; i < selectedLocs.length; i++) {
		locsArr.push(selectedLocs[i].innerText);
	}
	for (var i=0; i < selectedAreas.length; i++) {
		areasArr.push(selectedAreas[i].innerText);
	}

	for (var i=0; i < rows.length; i++) {
		// Can only test based on selected columns
		// Initially assume true for any non-selected columns
		// TODO: Later come back to this - loc and area are in units LG
		if (unitCol["index"] > -1) {
			rowUnit = rows[i].cells[unitCol["index"]].textContent;
		} else {
			rowUnit = "";
		}
		if (locCol["index"] > -1) {
			rowLoc = rows[i].cells[locCol["index"]].textContent;
		} else {
			rowLoc = "";
		}
		if (areaCol["index"] > -1) {
			rowArea = rows[i].cells[areaCol["index"]].textContent;
		} else {
			rowArea = "";
		}
		if (pm1Col["index"] > -1) {
			rowPm1 = Number(rows[i].cells[pm1Col["index"]].textContent);
		}
		if (pm25Col["index"] > -1) {
			rowPm25 = Number(rows[i].cells[pm25Col["index"]].textContent);
		}
		if (pm10Col["index"] > -1) {
			rowPm10 = Number(rows[i].cells[pm10Col["index"]].textContent);
		}

		iSel = "#" + rows[i].getAttribute("id");

		// Should the current row be visible?
		if ( ( allAreas || (rowArea == "" || (areasArr.indexOf(rowArea) > -1)) ) &&
				( allLocs || (rowLoc == "" || (locsArr.indexOf(rowLoc) > -1)) ) &&
				( allUnits || (rowUnit == "" || (unitsArr.indexOf(rowUnit) > -1)) ) ) {
			if ($(iSel).hasClass("d-none")) {
				$(iSel).removeClass("d-none");
			}
		} else {
			if (!($(iSel).hasClass("d-none"))) {
				$(iSel).addClass("d-none");
			}
		}

		// Determine the appropriate row colour based on PM thresholds
		if (pm1Col["index"] == -1 && pm25Col["index"] == -1 && pm10Col["index"] == -1) {
			// No Colour - Remove any currently assigned
			if ($(iSel).hasClass("table-success")) {
				$(iSel).removeClass("table-success");
			}
			if ($(iSel).hasClass("table-warning")) {
				$(iSel).removeClass("table-warning");
			}
			if ($(iSel).hasClass("table-danger")) {
				$(iSel).removeClass("table-danger");
			}
		} else if ( ( pm1Col["index"] == -1 || rowPm1 < pm1Med ) &&
					( pm25Col["index"] == -1 || rowPm25 < pm25Med ) &&
					( pm10Col["index"] == -1 || rowPm10 < pm10Med ) ) {
			// Color it success
			if ($(iSel).hasClass("table-warning")) {
				$(iSel).removeClass("table-warning");
			} else if ($(iSel).hasClass("table-danger")) {
				$(iSel).removeClass("table-danger");
			}
			if (!($(iSel).hasClass("table-success"))) {
				$(iSel).addClass("table-success");
			}
		} else if ( ( pm1Col["index"] == -1 || rowPm1 < pm1High ) &&
					( pm25Col["index"] == -1 || rowPm25 < pm25High ) &&
					( pm10Col["index"] == -1 || rowPm10 < pm10High ) ) {
			// Colour it warning
			if ($(iSel).hasClass("table-success")) {
				$(iSel).removeClass("table-success");
			} else if ($(iSel).hasClass("table-danger")) {
				$(iSel).removeClass("table-danger");
			}
			if (!($(iSel).hasClass("table-warning"))) {
				$(iSel).addClass("table-warning");
			}
		} else {
			// Colour it danger
			if ($(iSel).hasClass("table-success")) {
				$(iSel).removeClass("table-success");
			} else if ($(iSel).hasClass("table-warning")) {
				$(iSel).removeClass("table-warning");
			}
			if (!($(iSel).hasClass("table-danger"))) {
				$(iSel).addClass("table-danger");
			}
		}
	}
}

function rmAll() {
	var sel = document.getElementById("selCols");
	var avail = document.getElementById("allcols");
	while (sel.options.length > 0) {
		avail.options[avail.options.length] = sel.options[0];
	}
	updateCols();
}

function rmSortAll() {
	var sel = document.getElementById("selSortCols");
	var avail = document.getElementById("allSortCols");
	while (sel.options.length > 0) {
		var opt = document.createElement('option');
		var val = sel.options[0].value.split(" ", 1);
		opt.appendChild(document.createTextNode(val));
		opt.value = val;
		avail.appendChild(opt);
		sel.options.remove(0);
	}
	updateSort();
}

function rmCol() {
	var sel = document.getElementById("selCols");
	var avail = document.getElementById("allcols");
	avail.options[avail.options.length] = sel.options[sel.selectedIndex];
	updateCols();
}

function rmSort() {
	var sel = document.getElementById("selSortCols");
	var avail = document.getElementById("allSortCols");
	var opt = document.createElement('option');
	var val = sel.options[sel.selectedIndex].value.split(" ", 1);
	opt.appendChild(document.createTextNode(val));
	opt.value = val;
	avail.appendChild(opt);
	//sel.options.remove(sel.options[sel.selectedIndex]);
	sel.options.remove(sel.selectedIndex);
	//avail.options[avail.options.length] = sel.options[sel.selectedIndex];
	updateSort();
}

function addCol() {
	var sel = document.getElementById("selCols");
	var avail = document.getElementById("allcols");
	sel.options[sel.options.length] = avail.options[avail.selectedIndex];
	updateCols();
}

function addSort() {
	var sel = document.getElementById("selSortCols");
	var avail = document.getElementById("allSortCols");
	sel.options[sel.options.length] = avail.options[avail.selectedIndex];
	updateSort();
}

function addSortDesc() {
	var sel = document.getElementById("selSortCols");
	var avail = document.getElementById("allSortCols");
	var opt = document.createElement('option');
	var val = avail.options[avail.selectedIndex].value + " DESC";
	opt.appendChild(document.createTextNode(val));
	opt.value = val;
	sel.appendChild(opt);
	//avail.options.remove(avail.options[avail.selectedIndex]);
	avail.options.remove(avail.selectedIndex);
	updateSort();
}

function updateCols() {
	var sel = document.getElementById("selCols");
	var cols = document.getElementById("cols");
	var str = "";
	for (var i=0; i<sel.options.length; i++) {
		if (str.length > 0) {
			str = str + ",";
		}
		str = str + sel.options[i].value;
	}
	cols.value = str;
}

function updateSort() {
	var sel = document.getElementById("selSortCols");
	var sort = document.getElementById("sort");
	var str = "";
	for (var i=0; i<sel.options.length; i++) {
		if (str.length > 0) {
			str = str + ",";
		}
		str = str + sel.options[i].value;
	}
	sort.value = str;
}

function listGroupSelectedItems(lgId) {
	var retVal = [];
	var itemSel;
	var lg = document.getElementById(lgId);
	for (var i=0; i < lg.childElementCount; i++) {
		itemSel = "#" + lg.children[i].getAttribute("id");
		if ($(itemSel).hasClass("active")) {
			retVal.push(lg.children[i]);
		}
	}
	return retVal;
}

function listGroupNumVisible(lgId) {
	var count = 1;
	var itemSel;
	var lg = document.getElementById(lgId);
	for (var i=0; i < lg.childElementCount; i++) {
		itemSel = "#" + lg.children[i].getAttribute("id");
		if (!($(itemSel).hasClass("d-none"))) {
			count++;
		}
	}
	return count;
}

function listGroupNumSelected(lgId) {
	var count = 0;
	var itemSel;
	var lg = document.getElementById(lgId);
	for (var i=0; i < lg.childElementCount; i++) {
		itemSel = "#" + lg.children[i].getAttribute("id");
		if ($(itemSel).hasClass("active")) {
			count++;
		}
	}
	return count;
}

function toggleArea(area) {
	toggleFilter("area", area);
}

function toggleLoc(loc) {
	toggleFilter("loc", loc);
}

function toggleUnit(unit) {
	toggleFilter("unit", unit);
}

// Handle clicking on an arbitrary filter item (area, loc or unit)
// Expected values for filter: area, loc, unit
function toggleFilter(filter, value) {
	var listGroups = {"area": "limitArea", "loc": "limitLoc", "unit": "limitUnit"};
	var inputFields = {"area": "areas", "loc": "locs", "unit": "units"};
	var removing;
	// Flag used during form param rebuild to determine whether we rejected this request
	var complete = true;
	var btnVal = document.getElementById(filter + "-btn-" + value);
	var filterSel = "#" + filter + "-btn-" + value;
	if ($(filterSel).hasClass("active")) {
		// It was selected, we're deselecting it
		removing = true;
	} else {
		// It was deselected, we're selecting it
		removing = false;
	}
	// Special case 1: If 'all' has been selected deselect everything else
	if (!removing && value == "all") {
		var listGroup = document.getElementById(listGroups[filter]);
		for (var i=0; i < listGroup.childElementCount; i++) {
			var iSel = "#" + listGroup.children[i].getAttribute("id");
			// Don't deactivate this one
			if (iSel != filterSel && ($(iSel).hasClass("active"))) {
				$(iSel).removeClass("active");
			}
		}
		// Finally activate 'all'
		$(filterSel).addClass("active");
	} else if (value == "all" && removing) {
		// Special case 2: 'all' was selected and we tried to deselect it
		// Do nothing - We'll automatically handle deselecting 'all', you can't do it
		complete = false;
	} else {
		// Get some additional info to determine other cases
		// Is 'all' currently selected?
		var allSel = "#" + filter + "-btn-all";
		var allSelected = ($(allSel).hasClass("active"));
		var numSelected = listGroupNumSelected(listGroups[filter]);
		// Special case 3: 'all' was selected and we're selecting something
		if (allSelected && !removing) {
			$(allSel).removeClass("active");
			$(filterSel).addClass("active");
		} else if (numSelected == 1 && removing) {
				// Special case 4: we deselected the only selected thing => select 'all'
				$(allSel).addClass("active");
				$(filterSel).removeClass("active");
		} else if (removing) {
			// Simple case - removing
			$(filterSel).removeClass("active");
		} else {
			// Simple case - adding
			$(filterSel).addClass("active");
		}
	}

	// Rebuild the relevant input field
	// Case 1: Several (or all) selected, adding one => append
	// Case 2: Several selected, removing one => splice
	// Case 3: Several selected, selecting all => erase
	var strInput = document.getElementById(inputFields[filter]);
	var strInputArr = strInput.value.split(',');
	if ((!removing && value == "all") || (removing && strInputArr.length == 1)) {
		// Removing the only element or selecting all
		strInput.value = "";
	} else if (!removing) {
		// Append the selected element
		if (strInput.value.length > 0) {
			strInput.value += ",";
		}
		strInput.value += value;
	} else {
		// Remove element from the array
		var i = strInputArr.indexOf(value);
		if (i > -1) {
			strInputArr.splice(i, 1);
			strInput.value = strInputArr.join(',');
		} else {
			// Unable to find the specified area for removal
			alert("Attempt to remove " + filter + " " + area + " from input field failed - Unable to find it in the field");
		}
	}

	// Process subsequent changes - hide, show, deselect fields as appropriate
	locsChanged();

	// TODO: Update table, redraw chart
	rebuildTable();
	//prepareChartData();
	//initChartJs();
}

function locsChanged() {
	var aLG = document.getElementById("limitArea");
	var lLG = document.getElementById("limitLoc");
	var uLG = document.getElementById("limitUnit");
	var areaParam = document.getElementById("areas");
	var locParam = document.getElementById("locs");
	var unitParam = document.getElementById("units");
	var iSel;
	// Hide all locations and units then selectively show them
	// While annoying this is necessary because of the lack of
	// uniqueness
	for (var i=1; i < lLG.childElementCount; i++) {
		iSel = "#" + lLG.children[i].getAttribute("id");
		if (!($(iSel).hasClass("d-none"))) {
			$(iSel).addClass("d-none");
		}
	}
	for (var i=1; i < uLG.childElementCount; i++) {
		iSel = "#" + uLG.children[i].getAttribute("id");
		if (!($(iSel).hasClass("d-none"))) {
			$(iSel).addClass("d-none");
		}
	}

	// Some useful varibles
	var selectedAreas = listGroupSelectedItems("limitArea");
	var selectedLocs = listGroupSelectedItems("limitLoc");
	var allAreasSel = "#area-btn-all";
	var allLocsSel = "#loc-btn-all";
	var allUnitsSel = "#unit-btn-all";

	// Show locations for selected areas
	for (var i=0; i < selectedAreas.length; i++) {
		for (var j=1; j < lLG.childElementCount; j++) {
			// Should the selected location be hidden?
			var hidden = 1;
			if ($(allAreasSel).hasClass("active")) {
				hidden = 0;
			}
			// Locations may have multiple areas
			var kArea = lLG.children[j].getAttribute("kArea").split(",");
			for (var k=0; ((k < kArea.length) && (hidden == 1)) ; k++) {
				if (selectedAreas[i].getAttribute("kArea") == kArea[k]) {
					hidden = 0;
				}
			}
			// Show the option
			if (hidden == 0) {
				iSel = "#" + lLG.children[j].getAttribute("id");
				if ($(iSel).hasClass("d-none")) {
					$(iSel).removeClass("d-none");
				}
			}
		}
		for (var j=0; j < selectedLocs.length; j++) {
			// Check units for area i and loc j
			for (var n=1; n < uLG.childElementCount; n++) {
				var kLoc = uLG.children[n].getAttribute("kLoc");
				kArea = uLG.children[n].getAttribute("kArea");
				if ((($(allAreasSel).hasClass("active")) || kArea == selectedAreas[i].getAttribute("kArea")) &&
						(($(allLocsSel).hasClass("active")) || kLoc == selectedLocs[j].getAttribute("kLoc"))) {
							iSel = "#" + uLG.children[n].getAttribute("id");
							if ($(iSel).hasClass("d-none")) {
								$(iSel).removeClass("d-none");
							}
				}
			}
		}
	}

	// Finally, if selected locs or units are no longer visible
	// Select 'all' options and rebuild post parameters as needed
	for (var i=1; i < lLG.childElementCount; i++) {
		iSel = "#" + lLG.children[i].getAttribute("id");
		if (($(iSel).hasClass("active")) && ($(iSel).hasClass("d-none"))) {
			$(iSel).removeClass("active");
			// remove from locs param
			var locArr = locParam.value.split(',');
			var locIdx = locArr.indexOf(lLG.children[i].getAttribute("kLoc"));
			if (locIdx > -1) {
				locArr.splice(locIdx, 1);
				locParam.value = locArr.join(',');
			} else {
				// This loc not found in locs param
				alert("Unable to remove " + iSel + " from locs input field - Not found");
			}
		}
	}
	for (var i=1; i < uLG.childElementCount; i++) {
		iSel = "#" + uLG.children[i].getAttribute("id");
		if (($(iSel).hasClass("active")) && ($(iSel).hasClass("d-none"))) {
			$(iSel).removeClass("active");
			// remove from units param
			var unitArr = unitParam.value.split(',');
			var unitIdx = unitArr.indexOf(uLG.children[i].innerText);
			if (unitIdx > -1) {
				unitArr.splice(unitIdx, 1);
				unitParam.value = unitArr.join(',');
			} else {
				// This unit not found in units param
				alert("Unable to remove " + iSel + " from units input field - Not found");
			}
		}
	}
	if (listGroupNumSelected("limitLoc") == 0) {
		$(allLocsSel).addClass("active");
		locParam.value = "";
	}
	if (listGroupNumSelected("limitUnit") == 0) {
		$(allUnitsSel).addClass("active");
		unitParam.value = "";
	}
}

function submitForm() {
	document.getElementById("pageForm").submit();
}

function prepareChartData() {
	// If multiple locations and 'any' unit then generate 4-hourly means
	//   for each location. Otherwise (single location or subset of units)
	//	 just use each observation
	var sTable = document.getElementById("dataTable");
	var allLocsSel = "#loc-btn-all";
	var allUnitsSel = "#unit-btn-all";

	// Are we doing means or all values?
	var lLG = document.getElementById("limitLoc");
	var uLG = document.getElementById("limitUnit");

	// If 'any' location is selected and more than 1 location is available
	// and more than 1 unit is available with 'any' unit selected, use means
	// Or if multiple locations are selected and multiple units are available and 'any' unit is selected
	if (((($(allLocsSel).hasClass("active")) && listGroupNumVisible("limitLoc") > 2) || (listGroupNumSelected("limitLoc") > 1))
				&& listGroupNumVisible("limitUnit") > 1 && ($(allUnitsSel).hasClass("active"))) {
		bMeans = true;
	}

	if (unitCol["index"] == -1) {
		findColumnIndices();
	}

	// Bail if we don't have required columns
	if ( (pm1Col["index"] == -1 && pm25Col["index"] == -1 && pm10Col["index"] == -1) ||
				(bMeans && locCol["index"] == -1) || (!bMeans && unitCol["index"] == -1) ||
				(dateCol["index"] == -1) ) {
		// Nothing to chart
		return;
	}

	// Loop through table rows building chartData[]
	// Data structure:
	// chartData[unit][time][pm1]|[pm25]|[pm10] if !bMeans
	// chartData[loc][time rounded to nearest 4h][pm1]|[pm25]|[pm10] if bMeans
	chartData = [];
	if (sTable.tBodies[0] === undefined) {
		return;
	}
	var tableRows = sTable.tBodies[0].rows;
	var rowId;
	var rowTime;
	var rowPm1;
	var rowPm25;
	var rowPm10;
	for (var i=0; i < tableRows.length; i++) {
		// Fetch time and PM values regardless of the approach
		rowTime = tableRows[i].cells[dateCol["index"]].textContent;
		if (pm1Col["index"] >= 0) {
			rowPm1 = tableRows[i].cells[pm1Col["index"]].textContent;
		}
		if (pm25Col["index"] >= 0) {
			rowPm25 = tableRows[i].cells[pm25Col["index"]].textContent;
		}
		if (pm10Col["index"] >= 0) {
			rowPm10 = tableRows[i].cells[pm10Col["index"]].textContent;
		}

		if (bMeans) {
			rowId = tableRows[i].cells[locCol["index"]].textContent;
			// TODO: Manipulate the time so it's rounded to the nearest 4 hours
			var oldDate = new Date();
			oldDate.setFullYear(rowTime.substring(6, 10));
			oldDate.setMonth((rowTime.substring(3, 5) - 1));
			oldDate.setDate(rowTime.substring(0, 2));
			oldDate.setSeconds(0);
			oldDate.setMinutes(0);
			var oldHour = rowTime.substring(11, 13);
			if (oldHour >= 22) {
				oldDate.setHours(0);
				oldDate.setDate((oldDate.getDate() + 1));
			} else if (oldHour >= 18) {
				oldDate.setHours(20);
			} else if (oldHour >= 14) {
				oldDate.setHours(16);
			} else if (oldHour >= 10) {
				oldDate.setHours(12);
			} else if (oldHour >= 6) {
				oldDate.setHours(8);
			} else if (oldHour >= 2) {
				oldDate.setHours(4);
			} else {
				oldDate.setHours(0);
			}

			// Rebuild rowTime
			// TODO: Do this better
			rowTime = "";
			if (oldDate.getDate() < 10) {
				rowTime += "0";
			}
			rowTime += oldDate.getDate() + "-";
			if (oldDate.getMonth() < 10) {
				rowTime += "0";
			}
			rowTime += (oldDate.getMonth() + 1) + "-" + oldDate.getFullYear() + " ";
			if (oldDate.getHours() < 10) {
				rowTime += "0";
			}
			rowTime += oldDate.getHours() + ":";
			if (oldDate.getMinutes() < 10) {
				rowTime += "0";
			}
			rowTime += oldDate.getMinutes() + ":";
			if (oldDate.getSeconds() < 10) {
				rowTime += "0";
			}
			rowTime += oldDate.getSeconds();
		} else {
			rowId = tableRows[i].cells[unitCol["index"]].textContent;
		}
		// Create row object if doesn't exist
		if (!(rowId in chartData)) {
			chartData[rowId] = [];
		}
		// Create time object if doesn't exist
		if (!(rowTime in chartData[rowId])) {
			chartData[rowId][rowTime] = [];
		}

		if (bMeans) {
			// track values and number of entries before finally calculating means
			if (pm1Col["index"] >= 0) {
				if ("pm1" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm1"] = Number(chartData[rowId][rowTime]["pm1"]) + Number(rowPm1);
					chartData[rowId][rowTime]["pm1Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm1"] = rowPm1;
					chartData[rowId][rowTime]["pm1Count"] = 1;
				}
			}
			if (pm25Col["index"] >= 0) {
				if ("pm25" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm25"] = Number(chartData[rowId][rowTime]["pm25"]) + Number(rowPm25);
					chartData[rowId][rowTime]["pm25Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm25"] = rowPm25;
					chartData[rowId][rowTime]["pm25Count"] = 1;
				}
			}
			if (pm10Col["index"] >= 0) {
				if ("pm10" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm10"] = Number(chartData[rowId][rowTime]["pm10"]) + Number(rowPm10);
					chartData[rowId][rowTime]["pm10Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm10"] = rowPm10;
					chartData[rowId][rowTime]["pm10Count"] = 1;
				}
			}
		} else {
			if (pm1Col["index"] >= 0) {
				chartData[rowId][rowTime]["pm1"] = rowPm1;
			}
			if (pm25Col["index"] >= 0) {
				chartData[rowId][rowTime]["pm25"] = rowPm25;
			}
			if (pm10Col["index"] >= 0) {
				chartData[rowId][rowTime]["pm10"] = rowPm10;
			}
		}
	}

	// If calculating means do that now
	if (bMeans) {
		for (var i in chartData) {
			for (var j in chartData[i]) {
				if ("pm1" in chartData[i][j]) {
					chartData[i][j]["pm1"] = Number(chartData[i][j]["pm1"]) / Number(chartData[i][j]["pm1Count"]);
					delete chartData[i][j]["pm1Count"];
				}
				if ("pm25" in chartData[i][j]) {
					chartData[i][j]["pm25"] = Number(chartData[i][j]["pm25"]) / Number(chartData[i][j]["pm25Count"]);
					delete chartData[i][j]["pm25Count"];
				}
				if ("pm10" in chartData[i][j]) {
					chartData[i][j]["pm10"] = Number(chartData[i][j]["pm10"]) / Number(chartData[i][j]["pm10Count"]);
					delete chartData[i][j]["pm10Count"];
				}
			}
		}
	}

	// Done preparing the (generic) data structure
}

function initChartJs() {
	// Prepare datasets for Chart.js
	// Requires: prepareChartData() has been called
	if (chartData.length == 0) {
		prepareChartData();
	}

	var lineData = {};
	lineData.datasets = [];
	var pm1ds;
	var pm25ds;
	var pm10ds;
	var chartType = "line";

	// We have a dataset for each unit/loc X pmType
	// Each dataset contains time values (x) and pm values (y)
	for (var rowId in chartData) {
		// Build all times and PMs into datasets
		pm1ds = {};
		pm25ds = {};
		pm10ds = {};
		pm1ds.data = [];
		pm25ds.data = [];
		pm10ds.data = [];

		var numObs = 0;

		for (var time in chartData[rowId]) {
			// Use a bar chart if any unit has fewer than 3 observations
			// Count number of observations
			numObs++;

			if ("pm1" in chartData[rowId][time]) {
				if (!("label" in pm1ds)) {
					pm1ds["label"] = rowId + " - PM1";
					pm1ds["pointRadius"] = 6;
					pm1ds["showLine"] = true;
					var col = rndColour();
					pm1ds["pointBackgroundColor"] = col;
					pm1ds["backgroundColor"] = col;
				}
				pm1ds.data.push({x: time, y: chartData[rowId][time]["pm1"]});
			}
			if ("pm25" in chartData[rowId][time]) {
				if (!("label" in pm25ds)) {
					pm25ds["label"] = rowId + " - PM2.5";
					pm25ds["pointRadius"] = 6;
					pm25ds["showLine"] = true;
					var col = rndColour();
					pm25ds["pointBackgroundColor"] = col;
					pm25ds["backgroundColor"] = col;
				}
				pm25ds.data.push({x: time, y: chartData[rowId][time]["pm25"]});
			}
			if ("pm10" in chartData[rowId][time]) {
				if (!("label" in pm10ds)) {
					pm10ds["label"] = rowId + " - PM10";
					pm10ds["pointRadius"] = 2;
					pm10ds["showLine"] = true;
					var col = rndColour();
					pm10ds["pointBackgroundColor"] = col;
					pm10ds["backgroundColor"] = col;
				}
				pm10ds.data.push({x: time, y: chartData[rowId][time]["pm10"]});
			}
		}

		// Determine whether we use a bar chart
		if (numObs < 3) {
			chartType = "bar";
		}

		// Push the series for rowId X PM into the dataset
		if ("label" in pm1ds) {
			lineData.datasets.push(pm1ds);
		}
		if ("label" in pm25ds) {
			lineData.datasets.push(pm25ds);
		}
		if ("label" in pm10ds) {
			lineData.datasets.push(pm10ds);
		}
	}

	var c = document.getElementById('myChart');

	// If building a bar chart we need to hack away at that now
	// Flatten the data structure into an array of objects so we can sort it later
	if (chartType == "bar") {
		var dataContainer = [];

		for (var ds in lineData.datasets) {
			for (var obs in lineData.datasets[ds].data) {
				// Format time for display D MMM, H:mm a
				var months = [undefined, "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
				var time = lineData.datasets[ds].data[obs]["x"];
				var strTime = parseInt(time.substring(0,2)) + " ";
				strTime += months[parseInt(time.substring(3,5))] + ", ";
				var h = parseInt(time.substring(11,13));
				var a = "AM";
				if (h >= 12) {
					a = "PM";
				}
				if (h > 12) {
					h -= 12;
				}
				strTime += h + ":" + parseInt(time.substring(14,16)) + " " + a;

				// Build a flat object array for the values
				var o = {};
				o["label"] = lineData.datasets[ds]["label"] + " - " + strTime;
				o["bgCol"] = rndColour();
				o["data"] = lineData.datasets[ds].data[obs]["y"];
				o["sortLabel"] = lineData.datasets[ds]["label"] + "-" + time.substring(6, 10) + time.substring(3, 5) + time.substring(0, 2) + time.substring(11, 16);
				dataContainer.push(o);
			}
		}

		// Sort the object array on sortLabel
		dataContainer.sort(function(a, b) {
			return a["sortLabel"] < b["sortLabel"];
		});

		// Unroll the elements into arrays
		var barData = [];
		var labels = [];
		var bgCols = [];
		for (var i in dataContainer) {
			barData.push(dataContainer[i]["data"]);
			labels.push(dataContainer[i]["label"]);
			bgCols.push(dataContainer[i]["bgCol"]);
		}

		drawBarChart(c, barData, labels, bgCols);
	} else {

		// If we're viewing hours or days of data display minutes, otherwise days
		var timeUnit = "day";
		if (document.getElementById("timeType").value == "hours" || document.getElementById("timeType").value == "days") {
			timeUnit = "minute";
		}
		var leg = true;
		// Hide the legend if more than 30 serios are shown to avoid legeds taking up the entire canvas
		if (lineData.datasets.length > 30) {
			leg = false;
		}
		drawLineChart(c, lineData, leg, timeUnit);
	}
}

function initMap() {
	var obs = document.getElementById("latestData");
	if (obs.tBodies[0] === undefined) {
		// No data
		return;
	}
	var map = new google.maps.Map(document.getElementById("map"), {
		zoom: 5,
		center: {lat: -33.6226741, lng:150.424154},
	});
	var mapMarkers = [];
	var rows = obs.tBodies[0].rows;
	// Rows in latestTable are unit, area, loc, time, pm1, pm25, pm10, lat, long
	for (var i=0; i < rows.length; i++) {
		var u = rows[i].cells[0].innerText;
		var a = rows[i].cells[1].innerText;
		var l = rows[i].cells[2].innerText;
		var t = rows[i].cells[3].innerText;
		var pm1 = rows[i].cells[4].innerText;
		var pm25 = rows[i].cells[5].innerText;
		var pm10 = rows[i].cells[6].innerText;
		var lati = Number(rows[i].cells[7].innerText);
		var long = Number(rows[i].cells[8].innerText);

		var infoText = infoWindowFor(u + " - " + a + " - " + l, t, "", "", pm1, pm25, pm10);
		var aqi = Math.round(calculateAQIFor(pm1, pm25, pm10)).toString();
		mapMarkers[i] = new google.maps.Marker({
			position: {lat: lati, lng: long},
			map: map,
			title: u + " - " + l,
			label: aqi,
		});
		mapMarkers[i].info = new google.maps.InfoWindow({content: infoText});
		mapMarkers[i].addListener('click', function() {
			this.info.open(map, this);
		});
	}
	var markerClusterer = new MarkerClusterer(map, mapMarkers, {
		imagePath: "/markers/m",
		maxZoom: 11,});
}
