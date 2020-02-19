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

function updateThreshold(spanId, inputId, controlId) {
  var span = document.getElementById(spanId);
  var inp = document.getElementById(inputId);
  var value = document.getElementById(controlId).value;
  span.innerText = value;
  inp.value = value;
}
