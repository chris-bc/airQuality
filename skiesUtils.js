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
	if (temp.length > 0) {
  	ret += "<div class='row'><div class='col-3'><b>Temperature:</b></div><div class='col-3'>" + temp +
						"</div></div><div class='row'><div class='col-3'><b>Humidity:</b></div><div class='col-3'>" + humidity + "</div></div>";
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
