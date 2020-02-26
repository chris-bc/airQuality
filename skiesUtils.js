// Global thresholds used in calculation of AQI.
// Made global for convenience - Used in creating markers & info windows
// - seems best to define them here than peculiarly with mapping functionality
var pm25thresholds = [0, 12.0, 35.4, 55.4, 150.4, 250.4, 500.4];
var pm1thresholds = [0, 12.0, 35.4, 55.4, 150.4, 250.4, 500.4];
var pm10thresholds = [0, 54, 154, 254, 354, 424, 604];
var aqithresholds = [0, 50, 100, 150, 200, 300, 500];


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
  
  // Convert time from dd-mm-yyyy hh:mm:ss to yyyy-mm-dd hh:mm:ss
  function timeForSort(time) {
	return time.substring(6, 10) + time.substring(3, 5) + time.substring(0, 2) + time.substring(11, 19);
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

// Display a line chart with the specified attributes
function drawLineChart(canvas, data, leg, timeUnit) {
  new Chart(canvas, {
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

// Display a bar chart with the specified attributes
function drawBarChart(canvas, data, labels, colours) {
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colours
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
	var obs = document.getElementById(table);
	if (obs.tBodies === undefined || obs.tBodies[0] === undefined) {
		// No data
		return;
	}
	var map = new google.maps.Map(document.getElementById("map"), {
		zoom: zoom,
		center: centreLatLng,
	});
	var mapMarkers = [];
	var heatmapData = [];
	var rows = obs.tBodies[0].rows;

	for (var i=0; i < rows.length; i++) {
		var unit = rows[i].cells[columnIndices["unit"]].innerText;
		var time = rows[i].cells[columnIndices["time"]].innerText;
		var lati = Number(rows[i].cells[columnIndices["lat"]].innerText);
		var long = Number(rows[i].cells[columnIndices["long"]].innerText);
		var area = "";
		if (columnIndices["area"] != -1) {
			area = rows[i].cells[columnIndices["area"]].innerText;
		}
		var loc = "";
		if (columnIndices["loc"] != -1) {
			loc = rows[i].cells[columnIndices["loc"]].innerText;
		}
		var temp = "";
		if (columnIndices["temp"] != -1) {
			temp = Number(rows[i].cells[columnIndices["temp"]].innerText);
		}
		var humidity = "";
		if (columnIndices["hum"] != -1) {
			humidity = Number(rows[i].cells[columnIndices["hum"]].innerText);
		}
		var pm1 = "";
		if (columnIndices["pm1"] != -1) {
			pm1 = Number(rows[i].cells[columnIndices["pm1"]].innerText);
		}
		var pm25 = "";
		if (columnIndices["pm25"] != -1) {
			pm25 = Number(rows[i].cells[columnIndices["pm25"]].innerText);
		}
		var pm10 = "";
		if (columnIndices["pm10"] != -1) {
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
		mapMarkers[i] = new google.maps.Marker({
			position: {lat: lati, lng: long},
			map: map,
			title: markerTitle,
			label: aqi,
		});
		mapMarkers[i].info = new google.maps.InfoWindow({content: infoText});
		mapMarkers[i].addListener('click', function() {
			this.info.open(map, this);
		});

		// Calculate average AQI for heatmap
		var aqiTotal = 0;
		var aqiCount = 0;
		if (pm1 != "") {
			aqiTotal += Number(calculateSingleAqi(pm1, pm1thresholds, aqithresholds));
			aqiCount++;
		}
		if (pm25 != "") {
			aqiTotal += Number(calculateSingleAqi(pm25, pm25thresholds, aqithresholds));
			aqiCount++;
		}
		if (pm10 != "") {
			aqiTotal += Number(calculateSingleAqi(pm10, pm10thresholds, aqithresholds));
			aqiCount++
		}
		aqiTotal = Math.round(aqiTotal / aqiCount);
		var latLng = new google.maps.LatLng(lati, long);
		heatmapData[i] = {
			location: latLng,
			weight: aqiTotal,
		};
	}
	var markerClusterer = new MarkerClusterer(map, mapMarkers, {
		imagePath: "/markers/m",
		maxZoom: 11,});
	
	var heatMap = new google.maps.visualization.HeatmapLayer({
		data: heatmapData,
		dissipating: false,
		maxIntensity: 100,
		map: map,
	});
}