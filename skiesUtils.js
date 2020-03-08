// Global thresholds used in calculation of AQI.
// Made global for convenience - Used in creating markers & info windows
// - seems best to define them here than peculiarly with mapping functionality
var pm25thresholds = [0, 12.0, 35.4, 55.4, 150.4, 250.4, 500.4];
var pm1thresholds = [0, 12.0, 35.4, 55.4, 150.4, 250.4, 500.4];
var pm10thresholds = [0, 54, 154, 254, 354, 424, 604];
var aqithresholds = [0, 50, 100, 150, 200, 300, 500];

// Initialise variables for column names - populated by findColumnIndices()
// to draw chart
var unitCol = { "col": "UnitNumber", "index": -1 };
var tempCol = { "col": "TempDegC", "index": -1 };
var humCol = { "col": "Humidity", "index": -1 };
var pm1Col = { "col": "PM1", "index": -1 };
var pm25Col = { "col": "PM2", "index": -1 };
var pm10Col = { "col": "PM10", "index": -1 };
var dateCol = { "col": "SensingDate", "index": -1 };
var latCol = { "col": "Latitude", "index": -1 };
var longCol = { "col": "Longitude", "index": -1 };
var areaCol = { "col": "locationstring", "index": -1 };
var locCol = { "col": "locationdescription", "index": -1 };

var mapMarkers;
var envChartJs, pmChartJs; // Manage chart redraws

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

  // Trigger an alert if one is there to trigger
  var a = document.getElementById("timeAlert");
  if (a !== undefined) {
    if (c.checked) {
      $("#timeAlert").removeClass("show").addClass("d-none");
    } else {
      $("#timeAlert").removeClass("d-none").addClass("show");
    }
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

function updateThreshold(spanId, inputId, controlId) {
  var span = document.getElementById(spanId);
  var inp = document.getElementById(inputId);
  var value = document.getElementById(controlId).value;
  span.innerText = value;
  inp.value = value;
}

function rndColour() {
	var r = Math.floor(Math.random() * 255);
	var g = Math.floor(Math.random() * 255);
	var b = Math.floor(Math.random() * 255);
	return "rgb(" + r + "," + g + "," + b + ")";
}

// Convert time from dd-mm-yyyy hh:mm:ss to d MMM, hh:mm a
function timeForDisplay(time) {
	var months = [undefined, "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	var ret = parseInt(time.substring(0, 2)) + " ";
	ret += months[parseInt(time.substring(3, 5))] + ", ";
	var h = parseInt(time.substring(11, 13));
	var a = "AM";
	if (h >= 12) {
	  a = "PM";
	}
	if (h > 12) {
	  h -= 12;
	}
	ret += h + ":" + time.substring(14, 16) + " " + a;
	return ret;
  }
  
  // Convert time from dd-mm-yyyy hh:mm:ss to yyyy-mm-ddhh:mm:ss
  function timeForSort(time) {
	return time.substring(6, 10) + time.substring(3, 5) + time.substring(0, 2) + time.substring(11, 13) + time.substring(14, 16) + time.substring(17);
  }
  
  // Take a time in dd-mm-yyyy hh:mm:ss, round to nearest 4 hours and return it
  function timeRoundToFourHours(time) {
	var oldDate = new Date();
	oldDate.setFullYear(time.substring(6, 10));
	oldDate.setMonth((time.substring(3, 5) - 1));
	oldDate.setDate(time.substring(0, 2));
	oldDate.setSeconds(0);
	oldDate.setMinutes(0);
	var oldHour = time.substring(11, 13);
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

	// Rebuild time in original format
	var ret = "";
	if (oldDate.getDate() < 10) {
		ret += "0";
	}
	ret += oldDate.getDate() + "-";
	if (oldDate.getMonth() < 10) {
		ret += "0";
	}
	ret += (oldDate.getMonth() + 1) + "-" + oldDate.getFullYear() + " ";
	if (oldDate.getHours() < 10) {
		ret += "0";
	}
	ret += oldDate.getHours() + ":";
	if (oldDate.getMinutes() < 10) {
		ret += "0";
	}
	ret += oldDate.getMinutes() + ":";
	if (oldDate.getSeconds() < 10) {
		ret += "0";
	}
	ret += oldDate.getSeconds();

	return ret;
  }

// If chart will be redrawn client is responsible for destroying it first with chart.destroy()
// Display a line chart with the specified attributes
function drawLineChart(canvas, data, leg, timeUnit) {
  	return new Chart(canvas, {
	    type: 'line',
    	data: data,
	    options: {
    		legend: {
        		display: leg,
	      	},
    	  	scaleShowValues: true,
	      	scales: {
    	    	xAxes: [{
        	  		type: 'time',
		          distribution: 'linear',
    		      time: {
        		    parser: "DD-MM-YYYY HH:mm:ss",
            		unit: timeUnit,
	            	displayFormats: {day: 'MMM D YYYY', minute: 'D MMM, h:mm a'}
	    	      },
    	    	}]
	    	}
	   	}
  	});
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
	  } else if (headers[i].textContent == areaCol["col"]) {
		areaCol["index"] = i;
	  } else if (headers[i].textContent == locCol["col"]) {
		locCol["index"] = i;
	  }
	}
  }

  function initChartDsGeneric(ds, unit, obsType) {
	var pointRadius = 3;
	var showLine = true;
	ds["label"] = unit + " - " + obsType;
	ds["pointRadius"] = pointRadius;
	ds["showLine"] = showLine;
	var col = rndColour();
	ds["pointBackgroundColor"] = col;
	ds["backgroundColor"] = col;
  }
  
  function buildTableObjectsForChart() {
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
	  if (!($(rows[i]).hasClass("d-none"))) {
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
	return chartData;
  }  

  function displayChartJs() {
	// If any row has fewer than 3 observations display a bar chart, otherwise line
	var pmChart = document.getElementById("pmChart");
	var envChart = document.getElementById("envChart");
	var chartData = buildTableObjectsForChart();
	
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
  
		initChartDsGeneric(pm1ds, unitId, "PM1");
		initChartDsGeneric(pm25ds, unitId, "PM2.5");
		initChartDsGeneric(pm10ds, unitId, "PM10");
		initChartDsGeneric(tempDs, unitId, "Temp");
		initChartDsGeneric(humDs, unitId, "Humidity");
  
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
  
	  if (pmChartJs) {
		pmChartJs.destroy();
	  }
	  if (envChartJs) {
		envChartJs.destroy();
	  }
	  pmChartJs = drawLineChart(pmChart, pmData, leg, timeUnit);
	  envChartJs = drawLineChart(envChart, envData, leg, timeUnit);
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
  
	  if (pmChartJs) {
		pmChartJs.destroy();
	  }
	  if (envChartJs) {
		envChartJs.destroy();
	  }
	  pmChartJs = drawBarChart(pmChart, pmData, pmLabels, pmCols);
	  envChartJs = drawBarChart(envChart, envData, envLabels, envCols);
	}
  }
  
// If chart will be redrawn client is responsible for destroying it first with chart.destroy()
// Display a bar chart with the specified attributes
function drawBarChart(canvas, data, labels, colours) {
	return new Chart(canvas, {
    	type: 'bar',
	    data: {
    		labels: labels,
    		datasets: [{
        		data: data,
        		backgroundColor: colours
        	}]
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
}

function infoWindowFor(unit, time, temp, humidity, pm1, pm25, pm10) {
  var ret = "<div id='content'><div id='siteNotice'></div><p>";
	if (unit.length < 20) {
		ret += "<h5";
	} else {
		ret += "<b";
	}
	ret += " id='firstHeading' class='firstHeading'>";
  ret += unit + "</";
	if (unit.length < 20) {
		ret += "h5";
	} else {
		ret += "b";
	}
	ret += "></p><div id='bodyContent'><p><b>Observation:</b> " + time + "</p><p>";
	ret += "<div class='container'>";
	// Temp and humidity will either both be provided or both be absent
	if (temp !== undefined && temp != "") {
  	ret += "<div class='row'><div class='col-6'><b>Temperature:</b></div><div class='col-6'>" + temp +
						"</div></div><div class='row'><div class='col-6'><b>Humidity:</b></div><div class='col-6'>" + humidity + "</div></div>";
	}
  ret += "<div class='row'><div class='col-3'><b>PM&nbsp;1:</b></div><div class='col-3'>" + pm1 +
					"</div><div class='col-3'><b>AQI<sub>PM1</sub>:</b></div><div class='col-3'>" +
					Math.round(calculateSingleAqi(pm1, pm1thresholds, aqithresholds)) +
					"</div></div><div class='row'><div class='col-3'><b>PM&nbsp;2.5:</b></div><div class='col-3'>" + pm25 +
					"</div><div class='col-3'><b>AQI<sub>PM2.5</sub>:</b></div><div class='col-3'>" +
					Math.round(calculateSingleAqi(pm25, pm25thresholds, aqithresholds)) +
  				"</div></div><div class='row'><div class='col-3'><b>PM&nbsp;10:</b></div><div class='col-3'>" +
					pm10 + "</div><div class='col-3'><b>AQI<sub>PM10</sub>:</b></div><div class='col-3'>" +
					Math.round(calculateSingleAqi(pm10, pm10thresholds, aqithresholds)) + "</div></div></div></p></div></div>";
  return ret;
}

function calculateAQIFor(pm1, pm25, pm10) {
	// Calculate AQI for each PM value. Return the highest of the three
	var pm1 = calculateSingleAqi(pm1, pm1thresholds, aqithresholds);
	var pm25 = calculateSingleAqi(pm25, pm25thresholds, aqithresholds);
	var pm10 = calculateSingleAqi(pm10, pm10thresholds, aqithresholds);
	var max = pm1;
	if (pm25 > pm1) {
		max = pm25;
	}
	if (pm10 > max) {
		pm10 = max;
	}
	return max;
}

function calculateSingleAqi(pmVal, pmThresholds, aqiThresholds) {
	var i;
	if (pmVal <= 0) {
		return 0;
	}
	for (i=0; i < pmThresholds.length && Number(pmVal) > pmThresholds[i]; i++) {}
	// i will now be pmThresholds.length if something has gone wrong or
	// pmVal exceeds measurement
	if (i == pmThresholds.length) {
		// Is it a sane measurement?
		if (pmVal < 1000) {
			return 999;
		} else {
			return 0;
		}
	}
	// In most cases it will index the threshold above the one pmVal falls in
	var aqi = Number(pmVal) - Number(pmThresholds[i-1]);
	aqi *= (Number(aqiThresholds[i]) - Number(aqiThresholds[i-1]));
	aqi /= (Number(pmThresholds[i]) - Number(pmThresholds[i-1]));
	aqi = Number(aqi) + Number(aqiThresholds[i-1]);
	return aqi;
}

function showMap(table, columnIndices, zoom, centreLatLng) {
	// Define colours for custom heatmap
	var aqiColours = [];
	aqiColours.push(['rgba(0,128,0,0)', 'rgba(0,128,0,0.7)']);
	aqiColours.push(['rgba(255,255,0,0)', 'rgba(255,255,0,0.8)']);
	aqiColours.push(['rgba(255,165,0,0)', 'rgba(255,165,0,0.7)']);
	aqiColours.push(['rgba(255,0,0,0)', 'rgba(255,0,0,0.5)']);
	aqiColours.push(['rgba(128,0,128,0)', 'rgba(128,0,128,0.6)']);
	aqiColours.push(['rgba(128,0,0,0)', 'rgba(128,0,0,0.6)']);
	aqiColours.push(['rgba(0,0,0,0)', 'rgba(0,0,0,0.6)']);

	// Heatmap maxIntensity is ignored because values exceed it ... defeating the purpose.
	// Add a bunch of additional gradient elements to push values to further opacity
	for (var i=0; i < aqiColours.length; i++) {
		for (var j=0; j < 10; j++) {
			aqiColours[i].push(aqiColours[i][1]);
		}
	}

	// Initialise an array of empty arrays for heatmap data
	var heatmaps = new Array(aqiColours.length);
	for (var i=0; i < heatmaps.length; i++) {
		heatmaps[i] = [];
	}

	// Display map before any processing so we have a map display even if no data to show on it
	var map = new google.maps.Map(document.getElementById("map"), {
		zoom: zoom,
		center: centreLatLng,
	});

	var obs = document.getElementById(table);
	if (obs === undefined || obs == null || obs.tBodies === undefined || obs.tBodies[0] === undefined || columnIndices === undefined || Object.keys(columnIndices).length == 0) {
		// No data
		return map;
	}

	mapMarkers = [];
	var rows = obs.tBodies[0].rows;

	for (var i=0; i < rows.length; i++) {
		var unit = rows[i].cells[columnIndices["unit"]].innerText;
		var time = rows[i].cells[columnIndices["time"]].innerText;
		var lati = Number(rows[i].cells[columnIndices["lat"]].innerText);
		var long = Number(rows[i].cells[columnIndices["long"]].innerText);
		var area = "";
		if (columnIndices["area"]) {
			area = rows[i].cells[columnIndices["area"]].innerText;
		}
		var loc = "";
		if (columnIndices["loc"]) {
			loc = rows[i].cells[columnIndices["loc"]].innerText;
		}
		var temp = "";
		if (columnIndices["temp"]) {
			temp = Number(rows[i].cells[columnIndices["temp"]].innerText);
		}
		var humidity = "";
		if (columnIndices["hum"]) {
			humidity = Number(rows[i].cells[columnIndices["hum"]].innerText);
		}
		var pm1 = "";
		if (columnIndices["pm1"]) {
			pm1 = Number(rows[i].cells[columnIndices["pm1"]].innerText);
		}
		var pm25 = "";
		if (columnIndices["pm25"]) {
			pm25 = Number(rows[i].cells[columnIndices["pm25"]].innerText);
		}
		var pm10 = "";
		if (columnIndices["pm10"]) {
			pm10 = Number(rows[i].cells[columnIndices["pm10"]].innerText);
		}

		var infoStr = unit;
		var markerTitle = unit;
		if (area != "") {
			infoStr += " - " + area;
		}
		if (loc != "") {
			infoStr += " - " + loc;
			markerTitle += " - " + loc;
		}
		var infoText = infoWindowFor(infoStr, time, temp, humidity, pm1, pm25, pm10);
		var aqi = Math.round(calculateAQIFor(pm1, pm25, pm10)).toString();
		var latLng = new google.maps.LatLng(lati, long);
		mapMarkers[i] = new google.maps.Marker({
			position: latLng,
			map: map,
			title: markerTitle,
			label: aqi,
		});
		mapMarkers[i]["kUnit"] = unit;
		mapMarkers[i].info = new google.maps.InfoWindow({content: infoText});
		mapMarkers[i].addListener('click', function() {
			this.info.open(map, this);
			// If the selected unit isn't selected, do that now
			var unit = this["kUnit"];
			if (unit) {
				var unitSel = "#unit-btn-" + unit;
				// Make sure the button is a button
				if (($(unitSel).hasClass("btn")) && !($(unitSel).hasClass("active"))) {
					toggleUnit(unit);
				}
			}
		});

		// Figure out which heatmap array element this belongs in
		var j;
		for (j=(heatmaps.length-1); j>=0 && aqi < aqithresholds[j]; j--) {}
		// j should never be == 0 (implies aqiTotal < 0)
		if (j < 0) {
			alert('Something is wrong with the world!');
			return map;
		}
		heatmaps[j].push({
			location: latLng,
			weight: 100, // Use a weight of 100 so we get full opacity. Damn gmaps
		});
	}
	var markerClusterer = new MarkerClusterer(map, mapMarkers, {
		imagePath: "/markers/m",
		maxZoom: 11,});
	
	var hs=[];
	for (var j=0; j < heatmaps.length; j++) {
		var thisGrad = aqiColours[j];
		var thisHeat = heatmaps[j];
		if (thisHeat.length > 0) {
			hs.push(new google.maps.visualization.HeatmapLayer({
				data: thisHeat,
				dissipating: false,
				maxIntensity: 100,
				map: map,
				gradient: thisGrad,
			}));
		}
	}
	return map;
}

function exportTableCSV(tableId, filename) {
	var table = document.getElementById(tableId);
	if (!table) {
		return;
	}
	var csvData = "";
	// Get column headers if they exist
	if (table.tHead && table.tHead.rows && table.tHead.rows[0]) {
		var headers = table.tHead.rows[0].cells;
		for (var i=0; i < headers.length; i++) {
			if (i > 0) {
				csvData += ",";
			}
			csvData += headers[i].textContent;
		}
		csvData += "\n";
	}
	// Get table data
	if (table.tBodies && table.tBodies[0]) {
		var rows = table.tBodies[0].rows;
		for (var i=0; i < rows.length; i++) {
			for (var j=0; j < rows[i].cells.length; j++) {
				if (j > 0) {
					csvData += ",";
				}
				csvData += "\"" + rows[i].cells[j].textContent + "\"";
			}
			csvData += "\n";
		}
	}
	if (!filename || filename.length == 0) {
		filename = ((tableId=="latestData")?"SensorData-Latest.csv":"SensorData.csv");
	}
	downloadCSV(csvData, filename);
}

function downloadCSV(content, filename) {
	var mime = "text/csv;encoding:utf-8";
	var a = document.createElement("a");

	// IE10 compatibility
	if (navigator.msSaveBlob) {
		navigator.msSaveBlob(new Blob([content], {
			type: mime
		}), filename);
	} else if (URL && 'download' in a) {
		// HTML5 a.download attribute
		a.href = URL.createObjectURL(new Blob([content], {
			type: mime
		}));
		a.setAttribute('download', filename);
//		document.body.appendChild(a);
		a.click();
//		document.body.removeChild(a);
	} else {
		location.href = "data:application/octet-stream," + encodeURIComponent(content);
	}
}

// Iterate over the specified list group ensuring that only the specified item is selected
function listGroupSelectOnly(listGroupId, itemId) {
	var lg = document.getElementById(listGroupId);
	var childCount = lg.childElementCount;
	for (var i=0; i < childCount; i++) {
		var thisId = lg.children[i].getAttribute("id");
		var thisSel = "#" + thisId;
		if (thisId == itemId) {
			// Should be selected
			if (!($(thisSel).hasClass("active"))) {
				$(thisSel).addClass("active");
				lg.children[i].scrollIntoViewIfNeeded();
			}
		} else {
			// Should not be selected
			if ($(thisSel).hasClass("active")) {
				$(thisSel).removeClass("active");
			}
		}
	}
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

function listGroupVisibleItems(lgId) {
	var retVal = [];
	var itemSel;
	var lg = document.getElementById(lgId);
	for (var i=0; i < lg.childElementCount; i++) {
		itemSel = "#" + lg.children[i].getAttribute("id");
		if (!($(itemSel).hasClass("d-none"))) {
			retVal.push(lg.children[i]);
		}
	}
	return retVal;
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
