var chartData = [];
var bMeans = false;

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

function locsChanged() {
	var aSel = document.getElementById("limitArea");
	var lSel = document.getElementById("limitLoc");
	var uSel = document.getElementById("limitUnit");
	var areaParam = document.getElementById("areas");
	var locParam = document.getElementById("locs");

	areaParam.value = "";
	locParam.value = "";

	// Hide all locations and units then selectively show them
	// While annoying this is necessary because of the lack of
	// uniqueness
	for (var i=1; i < lSel.options.length; i++) {
		if (!lSel.options[i].hasAttribute("hidden")) {
			lSel.options[i].setAttribute("hidden", "hidden");
			lSel.options[i].setAttribute("disabled", "true");
		}
	}
	for (var i=1; i < uSel.options.length; i++) {
		if (!uSel.options[i].hasAttribute("hidden")) {
			uSel.options[i].setAttribute("hidden", "hidden");
			uSel.options[i].setAttribute("disabled", "true");
		}
	}

	// Bulid post params
	var selectedAreas = aSel.selectedOptions;
	var selectedLocs = lSel.selectedOptions;


	// Show locations for selected areas
	for (var i=0; i < selectedAreas.length; i++) {
		for (var j=1; j < lSel.options.length; j++) {
			// Should the selected location be hidden?
			var hidden = 1;
			if (aSel.options[0].selected) {
				hidden = 0;
			}
			// Locations may have multiple areas
			var kArea = lSel.options[j].getAttribute("kArea").split(",");
			for (var k=0; ((k < kArea.length) && (hidden == 1)) ; k++) {
				if (selectedAreas[i].value == kArea[k]) {
					hidden = 0;
				}
			}
			// Show the option
			if ((hidden == 0) && (lSel.options[j].hasAttribute("hidden"))) {
				lSel.options[j].removeAttribute("hidden");
				lSel.options[j].removeAttribute("disabled");
			}
		}
		for (var j=0; j < selectedLocs.length; j++) {
			// Check units for area i and loc j
			for (var n=1; n < uSel.options.length; n++) {
				var kLoc = uSel.options[n].getAttribute("kLoc");
				kArea = uSel.options[n].getAttribute("kArea");
				if ((aSel.options[0].selected || kArea == selectedAreas[i].value) &&
						(lSel.options[0].selected || kLoc == selectedLocs[j].value)) {
							if (uSel.options[n].hasAttribute("hidden")) {
								uSel.options[n].removeAttribute("hidden");
								uSel.options[n].removeAttribute("disabled");
							}
				}
			}
		}
	}

	// Finally, if selected locs or units are no longer visible
	// Select 'all' options and rebuild post parameters
	for (var i=1; i < lSel.options.length; i++) {
		if (lSel.options[i].selected && lSel.options[i].hasAttribute("hidden")) {
			lSel.options[i].selected = false;
		}
	}
	for (var i=1; i < uSel.options.length; i++) {
		if (uSel.options[i].selected && uSel.options[i].hasAttribute("hidden")) {
			uSel.options[i].selected = false;
		}
	}
	if (lSel.selectedOptions.length == 0) {
		lSel.options[0].selected = true;
	}
	if (uSel.selectedOptions.length == 0) {
		uSel.options[0].selected = true;
	}

	// Finally rebuild post params
	selectedAreas = aSel.selectedOptions;
	selectedLocs = lSel.selectedOptions;
	for (var i=0; i < selectedAreas.length; i++) {
		if (areaParam.value.length > 0) {
			areaParam.value = areaParam.value + ",";
		}
		areaParam.value = areaParam.value + selectedAreas[i].value;
	}
	for (var i=0; i < selectedLocs.length; i++) {
		if (locParam.value.length > 0) {
			locParam.value = locParam.value + ",";
		}
		locParam.value = locParam.value + selectedLocs[i].value;
	}
	unitsChanged();
}

function unitsChanged() {
	var uSel = document.getElementById("limitUnit");
	var uParam = document.getElementById("units");
	uParam.value = "";

	for (var i=0; i<uSel.selectedOptions.length; i++) {
		if (uParam.value.length > 0) {
			uParam.value = uParam.value + ",";
		}
		uParam.value = uParam.value + uSel.selectedOptions[i].value;
	}
}

function timeEnableDisable() {
	var c = document.getElementById("limitTime");
	var n = document.getElementById("timeNum");
	var t = document.getElementById("timeType");
	if (c.checked && n.hasAttribute("disabled")) {
		n.removeAttribute("disabled");
		t.removeAttribute("disabled");
	} else if (!c.checked) {
		n.setAttribute("disabled", "true");
		t.setAttribute("disabled", "true");
	}
}

function updateTime() {
	// Update available options in timeNum based on new selected for timeType
	var times = { hours: 23, days: 30, weeks: 51, months: 11, years: 5};
	var selNum = document.getElementById("timeNum");
	var timeType = document.getElementById("timeType").value;
	var timeNum = selNum.value;

	// We currently have selNum.options.length values, we need times[timeType]
	if (timeNum > times[timeType]) {
		// The selected option is no longer valid
		if (selNum.selectedOptions.length > 0) {
			selNum.selectedOptions[0].selected = false;
			selNum.options[0].selected = true;
		}
	}

	while (selNum.options.length > times[timeType]) {
		// Need to remove some options
		selNum.options.remove(times[timeType]);
	}

	while (selNum.options.length < times[timeType]) {
		// Need to create some options
		var opt = document.createElement('option');
		opt.appendChild(document.createTextNode(selNum.options.length+1));
		opt.value = selNum.options.length+1;
		selNum.appendChild(opt);
	}
}

function updatePm1Med() {
	var span = document.getElementById("pm1MedVal");
	var inp = document.getElementById("pm1med");
	var value = document.getElementById("pm1MedSlider").value;
	span.innerText = value;
	inp.value = value;
}

function updatePm1High() {
	var span = document.getElementById("pm1HighVal");
	var inp = document.getElementById("pm1high");
	var value = document.getElementById("pm1HighSlider").value;
	span.innerText = value;
	inp.value = value;
}

function updatePm25Med() {
	var span = document.getElementById("pm25MedVal");
	var inp = document.getElementById("pm25med");
	var value = document.getElementById("pm25MedSlider").value;
	span.innerText = value;
	inp.value = value;
}

function updatePm25High() {
	var span = document.getElementById("pm25HighVal");
	var inp = document.getElementById("pm25high");
	var value = document.getElementById("pm25HighSlider").value;
	span.innerText = value;
	inp.value = value;
}

function updatePm10Med() {
	var span = document.getElementById("pm10MedVal");
	var inp = document.getElementById("pm10med");
	var value = document.getElementById("pm10MedSlider").value;
	span.innerText = value;
	inp.value = value;
}

function updatePm10High() {
	var span = document.getElementById("pm10HighVal");
	var inp = document.getElementById("pm10high");
	var value = document.getElementById("pm10HighSlider").value;
	span.innerText = value;
	inp.value = value;
}

function submitForm() {
	document.getElementById("pageForm").submit();
}

function prepareChartData() {
	// If multiple locations and 'any' unit then generate 4-hourly means
	//   for each location. Otherwise (single location or subset of units)
	//	 just use each observation

	var pm1col = -1;
	var pm25col = -1;
	var pm10col = -1;
	var locCol = -1;
	var unitCol = -1;
	var timeCol = -1;
	var pm1colText = "pm1";
	var pm25colText = "pm25";
	var pm10colText = "pm10";
	var locColText = "locationdescription";
	var unitColText = "UnitNumber";
	var timeColText = "lastsensingdate";


	// Are we doing means or all values?
	var lSel = document.getElementById("limitLoc");
	var uSel = document.getElementById("limitUnit");

	// If 'any' location is selected and more than 1 location is available
	// and more than 1 unit is available, use means
	if (lSel.options[0].selected && lSel.options.length > 1 && uSel.options.length > 1) {
		bMeans = true;
	}
	for (var i=1, tot=0; i < lSel.selectedOptions.length && !bMeans; i++) {
		if (lSel.selectedOptions[i].selected) {
			tot++;
		}
		if (tot > 2) {
			bMeans = true;
		}
	}

	// Loop through table headers to identify column indices
	var sTable = document.getElementById("dataTable");
	var headers = sTable.tHead.rows[0].cells;
	for (var i = 0; i < headers.length; i++) {
		if (headers[i].textContent == pm1colText) {
			pm1col = i;
		} else if (headers[i].textContent == pm25colText) {
			pm25col = i;
		} else if (headers[i].textContent == pm10colText) {
			pm10col = i;
		} else if (headers[i].textContent == locColText) {
			locCol = i;
		} else if (headers[i].textContent == unitColText) {
			unitCol = i;
		} else if (headers[i].textContent == timeColText) {
			timeCol = i;
		}
	}

	// Bail if we don't have required columns
	if ( (pm1col == -1 && pm25col == -1 && pm10col == -1) ||
				(bMeans && locCol == -1) || (!bMeans && unitCol == -1) ||
				(timeCol == -1) ) {
		// Nothing to chart
		return;
	}

	// Loop through table rows building chartData[]
	// Data structure:
	// chartData[unit][time][pm1]|[pm25]|[pm10] if !bMeans
	// chartData[loc][time rounded to nearest 4h][pm1]|[pm25]|[pm10] if bMeans
	chartData = [];
	var tableRows = sTable.tBodies[0].rows;
	var rowId;
	var rowTime;
	var rowPm1;
	var rowPm25;
	var rowPm10;
	for (var i=0; i < tableRows.length; i++) {
		// Fetch time and PM values regardless of the approach
		rowTime = tableRows[i].cells[timeCol].textContent;
		if (pm1col >= 0) {
			rowPm1 = tableRows[i].cells[pm1col].textContent;
		}
		if (pm25col >= 0) {
			rowPm25 = tableRows[i].cells[pm25col].textContent;
		}
		if (pm10col >= 0) {
			rowPm10 = tableRows[i].cells[pm10col].textContent;
		}

		if (bMeans) {
			rowId = tableRows[i].cells[locCol].textContent;
			// TODO: Manipulate the time so it's rounded to the nearest 4 hours
		} else {
			rowId = tableRows[i].cells[unitCol].textContent;
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
			if (pm1col >= 0) {
				if ("pm1" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm1"] += rowPm1;
					chartData[rowId][rowTime]["pm1Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm1"] = rowPm1;
					chartData[rowId][rowTime]["pm1Count"] = 1;
				}
			}
			if (pm25col >= 0) {
				if ("pm25" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm25"] += rowPm25;
					chartData[rowId][rowTime]["pm25Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm25"] = rowPm25;
					chartData[rowId][rowTime]["pm25Count"] = 1;
				}
			}
			if (pm10col >= 0) {
				if ("pm10" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm10"] += rowPm10;
					chartData[rowId][rowTime]["pm10Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm10"] = rowPm10;
					chartData[rowId][rowTime]["pm10Count"] = 1;
				}
			}
		} else {
			if (pm1col >= 0) {
				chartData[rowId][rowTime]["pm1"] = rowPm1;
			}
			if (pm25col >= 0) {
				chartData[rowId][rowTime]["pm25"] = rowPm25;
			}
			if (pm10col >= 0) {
				chartData[rowId][rowTime]["pm10"] = rowPm10;
			}
		}
	}

	// If calculating means do that now
	if (bMeans) {
		for (var i in chartData) {
			for (var j in chartData[i]) {
				if ("pm1" in chartData[i][j]) {
					chartData[i][j]["pm1"] = chartData[i][j]["pm1"] / chartData[i][j]["pm1Count"];
					delete chartData[i][j]["pm1Count"];
				}
				if ("pm25" in chartData[i][j]) {
					chartData[i][j]["pm25"] = chartData[i][j]["pm25"] / chartData[i][j]["pm25Count"];
					delete chartData[i][j]["pm25Count"];
				}
				if ("pm10" in chartData[i][j]) {
					chartData[i][j]["pm10"] = chartData[i][j]["pm10"] / chartData[i][j]["pm10Count"];
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
		for (var time in chartData[rowId]) {
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
					pm10ds["pointRadius"] = 6;
					pm10ds["showLine"] = true;
					var col = rndColour();
					pm10ds["pointBackgroundColor"] = col;
					pm10ds["backgroundColor"] = col;
				}
				pm10ds.data.push({x: time, y: chartData[rowId][time]["pm10"]});
			}
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
	new Chart(c, {
		type: 'line',
		data: lineData,
		options: {
			scales: {
				xAxes: [{
					type: 'time',
					distribution: 'linear',
				}]
			}
		}
	});
}

function rndColour() {
	var r = Math.floor(Math.random() * 255);
	var g = Math.floor(Math.random() * 255);
	var b = Math.floor(Math.random() * 255);
	return "rgb(" + r + "," + g + "," + b + ")";
}
