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
	// and more than 1 unit is available with 'any' unit selected, use means
	// Or if multiple locations are selected and multiple units are available and 'any' unit is selected
	if (((lSel.options[0].selected && lSel.options.length > 2) || (lSel.selectedOptions.length > 1))
	 			&& uSel.options.length > 1 && uSel.options[0].selected) {
		bMeans = true;
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
					chartData[rowId][rowTime]["pm1"] = Number(chartData[rowId][rowTime]["pm1"]) + Number(rowPm1);
					chartData[rowId][rowTime]["pm1Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm1"] = rowPm1;
					chartData[rowId][rowTime]["pm1Count"] = 1;
				}
			}
			if (pm25col >= 0) {
				if ("pm25" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm25"] = Number(chartData[rowId][rowTime]["pm25"]) + Number(rowPm25);
					chartData[rowId][rowTime]["pm25Count"] ++;
				} else {
					chartData[rowId][rowTime]["pm25"] = rowPm25;
					chartData[rowId][rowTime]["pm25Count"] = 1;
				}
			}
			if (pm10col >= 0) {
				if ("pm10" in chartData[rowId][rowTime]) {
					chartData[rowId][rowTime]["pm10"] = Number(chartData[rowId][rowTime]["pm10"]) + Number(rowPm10);
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

		new Chart(c, {
			type: chartType,
			data: {
				labels: labels,
				datasets: [
					{
						data: barData,
						backgroundColor: bgCols
					}
				]
			},
			options: {
				legend: {
					display: false,
				},
				scales: {
					yAxes: [{
						ticks: {
							beginAtZero: true
						}
					}],
				}
			}
		});
	} else {

		// If we're viewing hours or days of data display minutes, otherwise days
		var timeUnit = "day";
		if (document.getElementById("timeType").value == "hours" || document.getElementById("timeType").value == "days") {
			timeUnit = "minute";
		}
		new Chart(c, {
			type: chartType,
			data: lineData,
			options: {
				scales: {
					xAxes: [{
						type: 'time',
						distribution: 'linear',
						time: {
							parser: "DD-MM-YYYY HH:mm:ss",
							unit: timeUnit,
							displayFormats: {day: 'MMM D YYYY', minute: 'D MMM, h:mm a'}
						}
					}]
				}
			}
		});
	}
}
