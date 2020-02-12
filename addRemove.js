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

function areasChanged() {
	var aSel = document.getElementById("limitArea");
	var lSel = document.getElementById("limitLoc");
	var areaParam = document.getElementById("areas");
	areaParam.value = "";

	var selectedAreas = aSel.selectedOptions;
	for (var i=0; i<selectedAreas.length; i++) {
		// Build the post parameter as we go
		if (areaParam.value.length > 0) {
			areaParam.value = areaParam.value + ",";
		}
		areaParam.value = areaParam.value + selectedAreas[i].value;

		// Skip over the 'all' entry
		for (var j=1; j<lSel.options.length; j++) {
			// kArea may contain comma-separated values
			var kArea = lSel.options[j].getAttribute("kArea").split(",");
			var hidden = 1;
			// Nothing hidden if all areas selected
			if (aSel.options[0].selected) {
				hidden = 0;
			}
			for (var k=0; (k<kArea.length && hidden) == 1; k++) {
				if (kArea[k] == selectedAreas[i].value) {
					hidden = 0;
				}
			}
			if (hidden == 0) {
				if (lSel.options[j].hasAttribute("hidden")) {
					lSel.options[j].removeAttribute("hidden");
					lSel.options[j].removeAttribute("disabled");
				}
			} else {
				if (!lSel.options[j].hasAttribute("hidden")) {
					lSel.options[j].setAttribute("hidden", "hidden");
					lSel.options[j].setAttribute("disabled", "true");
				}
			}
		}
	}
	// Finally update locations based on changes
	locsChanged();
}

function locsChanged() {

}

function unitsChanged() {

}
