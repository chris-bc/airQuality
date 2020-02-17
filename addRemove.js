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
