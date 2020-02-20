function rebuildSortString() {
  var listGroup = document.getElementById("sortList");
  var sortStr = document.getElementById("sort");
  var sortCols = [];

  for (var i=0; i<listGroup.childElementCount; i++) {
    var col = listGroup.children[i].getAttribute("col");
    var num = document.getElementById("sortNum-" + col).innerText;
    var dir = document.getElementById("sortOrder-" + col).innerText;

    if (num && num.length > 0) {
      sortCols[parseInt(num)] = col;
    }
    if (dir && dir.length > 0 && dir == "DESC") {
      sortCols[parseInt(num)] = sortCols[parseInt(num)] + " " + dir;
    }
  }

  sortStr.value = "";
  for (var i=1; i < sortCols.length; i++) {
    if (sortStr.value.length > 0) {
      sortStr.value = sortStr.value + ",";
    }
    sortStr.value = sortStr.value + sortCols[i];
  }
}

function sortChange(colName) {
  var btnSel = "#sort-btn-" + colName;
  var num = document.getElementById("sortNum-" + colName);
  var dir = document.getElementById("sortOrder-" + colName);

  if ($(btnSel).hasClass("active")) {
    // Currently being used - Are we switching from asc->desc or desc->none?
    if (dir.innerText == "ASC") {
      dir.innerText = "DESC";
    } else {
      var oldNum = num.innerText;
      dir.innerText = "";
      num.innerText = "";
      $(btnSel).removeClass("active");
      sortRebuildNumbers(oldNum);
    }
  } else {
    $(btnSel).addClass("active");
    dir.innerText = "ASC";
    num.innerText = (parseInt(getSortColNum()) + 1);
  }

  rebuildSortString();
}

function getSortColNum() {
  var listGroup = document.getElementById("sortList");
  var maxNum = 0;
  for (var i=0; i < listGroup.childElementCount; i++) {
    var col = listGroup.children[i].getAttribute("col");
    var num = document.getElementById("sortNum-" + col).innerText;
    if (num && num.length > 0 && parseInt(num) > maxNum) {
      maxNum = parseInt(num);
    }
  }
  return maxNum;
}

function sortRebuildNumbers(removedNum) {
  // If the number we removed is greater than the max number now displayed
  // there's nothing to do
  var maxNum = getSortColNum()
  if (removedNum <= maxNum) {
    var childCount = document.getElementById("sortList").childElementCount;
    for (var i=(parseInt(removedNum) + 1); i<= maxNum; i++) {
      // Find the element with num i and reduce it by 1
      var child;
      for (child=0; child < childCount &&
          document.getElementById("sortNum-" + document.getElementById("sortList").children[child].getAttribute("col")).innerText != i; child++) {}
      if (child == childCount) {
        // Not found - this shouldn't happen
        alert("An error occurred - I couldn't find a row in sort position " + i);
      } else {
        document.getElementById("sortNum-" + document.getElementById("sortList").children[child].getAttribute("col")).innerText = (i - 1);
      }
    }
  }
}
