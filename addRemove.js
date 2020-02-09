function rmAll() {
	var sel = document.getElementById("selCols");
	var avail = document.getElementById("allcols");
	while (sel.options.length > 0) {
		avail.options[avail.options.length] = sel.options[0];
	}
	updateCols();
}

function rmCol() {
	var sel = document.getElementById("selCols");
	var avail = document.getElementById("allcols");
	avail.options[avail.options.length] = sel.options[sel.selectedIndex];
	updateCols();
}

function addCol() {
	var sel = document.getElementById("selCols");
	var avail = document.getElementById("allcols");
	sel.options[sel.options.length] = avail.options[avail.selectedIndex];
	updateCols();
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

