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
}