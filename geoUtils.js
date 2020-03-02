// Set the map div and sensor listing to 100% - navbar size
$( document ).ready(function() {
    setElementSize();
  });

window.onresize = function(event) {
    setElementSize();
}

function setElementSize() {
    $("#navMap").css("height", $(window).height() - parseInt($("#myNav").css("height")) );
    $("#mapSensors").css("height", $(window).height() - parseInt($("#myNav").css("height")) );
    $("#navMap").css("padding-top", $("#myNav").css("height"));
    $("#navData").css("padding-top", $("#myNav").css("height"));
    $("#navChart").css("padding-top", $("#myNav").css("height"));
    $("#navAbout").css("padding-top", $("#myNav").css("height"));
}

function initMap() {
    var centre = new google.maps.LatLng(-25.4904429, 147.3062684);
    var zoom = 4;
    showMap("", [], zoom, centre);
}