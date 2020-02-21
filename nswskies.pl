#!/usr/bin/perl

use CGI;
use DBI;
use strict;
use warnings;
use lib qw(..);
use Data::Dumper;

# Initialise variables
my $dbFile = "nswskies.sqlite";
my $dbTable = "nswSensor";
my $dsn = "DBI:SQLite:$dbFile";
my %attr = (PrintError=>0, RaiseError=>1, AutoCommit=>1);
my $unitCol = "UnitNumber";
my $timeCol = "SensingDate";
my $pm25col = "PM2";
my $pm1col = "PM1";
my $pm10col = "PM10";
my $tempCol = "TempDegC";
my $humCol = "Humidity";
my %timeHsh = ("hours", 23, "days", 30, "weeks", 51, "months", 11, "years", 5);
my $selectedUnitsStr = "";
my @selectedUnits;
my @allUnits;

# Initialise parameters
my $selectColumns = "UnitNumber,SensingDate,TempDegC,Humidity,PM1,PM2,PM10,Latitude,Longitude";
my $sortColumnsStr = "UnitNumber,SensingDate DESC";
# By default limit time to the last 1 hour
my $limitTime = 1;
my $timeNum = "1";
my $timeType = "hours";
my $pm25med = 10;
my $pm25high = 25;
my $pm10med = 20;
my $pm10high = 50;
my $pm1med = 10;
my $pm1high = 25;
my $tempMed = 30;
my $tempHigh = 40;
my $humMed = 50;
my $humHigh = 80;

# Get parameters
my $cgi = CGI->new();
if ($cgi->param('sort') && length $cgi->param('sort') > 0) {
  $sortColumnsStr = $cgi->param('sort');
}
if ($cgi->param('limitTime') && length $cgi->param('limitTime') > 0) {
  $limitTime = 1;
} elsif ($cgi->param && length $cgi->param > 0) {
  $limitTime = 0;
}
if ($cgi->param('timeNum') && length $cgi->param('timeNum') > 0) {
  $timeNum = $cgi->param('timeNum');
}
if ($cgi->param('timeType') && length $cgi->param('timeType') > 0) {
  $timeType = $cgi->param('timeType');
}
if ($cgi->param('pm25med') && length $cgi->param('pm25med') > 0) {
  $pm25med = $cgi->param('pm25med');
}
if ($cgi->param('pm25high') && length $cgi->param('pm25high') > 0) {
  $pm25high = $cgi->param('pm25high');
}
if ($cgi->param('pm1med') && length $cgi->param('pm1med') > 0) {
  $pm1med = $cgi->param('pm1med');
}
if ($cgi->param('pm1high') && length $cgi->param('pm1high') > 0) {
  $pm1high = $cgi->param('pm1high');
}
if ($cgi->param('pm10med') && length $cgi->param('pm10med') > 0) {
  $pm10med = $cgi->param('pm10med');
}
if ($cgi->param('pm10high') && length $cgi->param('pm10high') > 0) {
  $pm10high = $cgi->param('pm10high');
}
if ($cgi->param('tempMed') && length $cgi->param('tempMed') > 0) {
  $tempMed = $cgi->param('tempMed');
}
if ($cgi->param('tempHigh') && length $cgi->param('tempHigh') > 0) {
  $tempHigh = $cgi->param('tempHigh');
}
if ($cgi->param('humMed') && length $cgi->param('humMed') > 0) {
  $humMed = $cgi->param('humMed');
}
if ($cgi->param('humHigh') && length $cgi->param('humHigh') > 0) {
  $humHigh = $cgi->param('humHigh');
}
if ($cgi->param('units') && length $cgi->param('units') > 0) {
  $selectedUnitsStr = $cgi->param('units');
}

# Set default time params if they're invalid
$limitTime = 1 unless ($limitTime == 0 || $limitTime == 1);
$timeType = "hours" unless exists($timeHsh{$timeType});
$timeNum = "1" unless ($timeNum >= 1 && $timeNum <= $timeHsh{$timeType});

# Validate thresholds
($pm1med >= 0 && $pm1med <= 100 && $pm1high >= 0 && $pm1high <= 100 &&
  $pm25med >= 0 && $pm25med <= 100 && $pm25high >= 0 && $pm25high <= 100 &&
  $pm10med >= 0 && $pm10med <= 100 && $pm10high >= 0 && $pm10high <= 100 &&
  $tempMed >= 0 && $tempMed <= 100 && $tempHigh >= 0 && $tempHigh <= 100 &&
  $humMed >= 0 && $humMed <= 100 && $humHigh >= 0 && $humHigh <= 100)
  or die "Invalid PM parameters provided, terminating\n";

my @allColumns = split ',', $selectColumns;
my @sortColumns = split ',', $sortColumnsStr;
my %colsHash = map {$_ => 1} @allColumns;

# @sortColumns contains elements that include ASC/DESC
# Get a list of columns that are used for sorting
# Updated to include the sort spec if available as the value, otherwise 1
my %sortColsHash = map {(split ' ', $_)[0] => ((scalar (split ' ', $_) > 1)?((split ' ', $_)[1]):1)} @sortColumns;

# For now assuming all columns are displayed - can't select a subset of cols
# Validate that sort columns are valid
exists($sortColsHash{$_}) or die "Invalid sort column: $_, terminating\n"
  for (keys %sortColsHash);

# Does the DB exist?
(-e $dbFile) or die "Cannot find database $dbFile, Terminating\n";
# Connect to DB
my $dbh = DBI->connect($dsn, \%attr) or die "Unable to connect to database $dbFile, Terminating\n";

# Select all units and validate them
my $sql = "SELECT DISTINCT $unitCol FROM $dbTable";
my $statement = $dbh->prepare($sql);
$statement->execute();
while (my @row = $statement->fetchrow_array) {
  push(@allUnits, $row[0]);
}
($statement->rows > 0) or die "Failed to fetch any units\n\n";
$statement->finish();

# Validate that each unit in selectedUnits is a real unit
@selectedUnits = split ',', $selectedUnitsStr;
my %allUnitsHash = map{$_ => 1} @allUnits;
exists($allUnitsHash{$_}) or die "Specified selected unit \"$_\" not found.\n" for @selectedUnits;

# Pre-generate HTML to display options for timeNum and timeType
my $timeNumHtml = "";
my $timeTypeHtml = "";
my $limitTimeHtml = (($limitTime == 1)?" checked":"");
$timeTypeHtml .= "<option value='$_'" . (($timeType eq $_)?" selected":"") . ">$_</option>\n" for (keys %timeHsh);
for (my $i=1; $i <= $timeHsh{$timeType}; $i++) {
  $timeNumHtml .= "<option value='$i'" . (($timeNum == $i)?" selected":"") . ">$i</option>\n";
}

# Pre-generate HTML to display sort options
my $sortHtml = "";
for (sort @allColumns) {
  $sortHtml .= "<button type='button' id='sort-btn-$_' onClick='sortChange(\"$_\")' class='py-1 list-group-item list-group-item-action d-flex justify-content-between align-items-center";
  # Add the active class if the column is a sort column
  if (exists($sortColsHash{$_})) {
    $sortHtml .= " active";
  }
  $sortHtml .= "' col='$_'>$_\n<div><span class='badge badge-light badge-pill mr-2' id='sortNum-$_'>";

  # If this is a sort column find out which number it is
  my $sortOrder = "";
  if (exists($sortColsHash{$_})) {
    my $i;
    for ($i=0; $i < (scalar @sortColumns) && $_ ne ((split ' ', $sortColumns[$i])[0]); $i++) {}
    if ($i < (scalar @sortColumns)) {
      # We've found this column as sort column i+1
      $sortHtml .= ($i + 1);
    }
    # And is it ascending or descending?
    if (lc($sortColsHash{$_}) eq "desc") {
      $sortOrder = "DESC";
    } else {
      $sortOrder = "ASC";
    }
  }
  $sortHtml .= "</span><span class='badge badge-light badge-pill' id='sortOrder-$_'>$sortOrder</span></div></button>\n";
}

# Pre-generate HTML for unit selection options
my $unitsHtml = "";
my %selectedUnitsHash = map {$_ => 1} @selectedUnits;
for (sort @allUnits) {
  $unitsHtml .= "<button type='button' id='unit-btn-$_' onClick='toggleUnit(\"$_\")' class='py-1 list-group-item list-group-item-action";
  if (exists($selectedUnitsHash{$_})) {
    $unitsHtml .= " active";
  }
  $unitsHtml .= "' unit='$_'>$_</button>\n";
}

# Reverse geocode on page or via an external mechanism?
# Without reverse geocode there's little value in displaying items in a table
# Use case: View map, select unit, view history
# Build page framework
# Add map with markers for units -> select unit, display data and chart
# Display heatmap of quality or temperature (selection)
# render all data to a table in hidden rows and allow JS to reveal as appropriate?

print<<EOF;

<!DOCTYPE html>
<html><head>
  <meta name='viewport' content='width=device-width, initial-scale=1'>
  <link rel='stylesheet' href='bootstrap.min.css'>
  <script src='https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js'></script>
  <script src='bootstrap.min.js'></script><script src='Chart.bundle.min.js'></script>
  <script src='skiesUtils.js'></script><script src='nswUtils.js'></script>
</head><body data-spy='scroll' data-target='#myNav' data-offset='70' style='position:relative; padding-top:75px;'>
  <nav id ='myNav' class='navbar navbar-light bg-light navbar-expand-md fixed-top'>
    <div class='navbar-header'>
      <button type='button' class='navbar-toggler mr-sm-2' data-toggle='collapse' data-target='#myNavBar' aria-controls='myNavBar' aria-expanded='false' aria-label='Toggle Navigation'>
        <span class='navbar-toggler-icon'></span></button>
      <a class='navbar-brand mr-sm-2' href='#'>nswSKIES</a></div>
    <div class='collapse navbar-collapse' id='myNavBar'>
      <ul class='navbar-nav'><li class='nav-item'><a class='nav-link' href='#navMap'>Sensor Map</a></li>
        <li class='nav-item'><a class='nav-link' href='#navFilter'>Data Filter</a></li>
        <li class='nav-item'><a class='nav-link' href='#navThreshold'>Observation Thresholds</a></li>
        <li class='nav-item'><a class='nav-link' href='#navData'>Sensor Data</a></li>
        <li class='nav-item'><a class='nav-link' href='#navChart'>Sensor Chart</a></li>
        <li class='nav-item'><a class='nav-link' href='#navAbout'>About</a></li>
        <li class='nav-item dropdown'>
          <a class='nav-link dropdown-toggle' href='#' id='navbarDropDown' role='button' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>
            Other Pages
          </a><div class='dropdown-menu' area-labelledBy='navbarDropDown' id='navbarDropLinks' name='navbarDropLinks'>
            <a class='dropdown-item' href='blueskies.pl' target='_blank'>blueSKIES</a>
            <div class='dropdown-divider'></div>
            <a class='dropdown-item' target='_blank' href='http://www.bennettscash.id.au'>bennettscash</a>
      </div></li></ul>
  </div></nav>
  <div class='container'><h1>banner</h1>
  <h1 class='text-center mt-sm-2'>NSW Environmental Data</h1>
  <div id='navMap' class='container' style='padding-top:75px;'><h5 class='text-center'>Map</h5>
    <div id='map' class='container-fluid'>
    </div>
  </div>
  <div id='navFilter' class='container' style='padding-top:75px;'>
    <div class='row mb-3 align-items-center justify-content-center'><div class='col-sm-6'>
      <h5 class='text-center'>Sort Criteria</h5>
      <div id='sortContainer'><div class='list-group' id='sortList'>$sortHtml</div></div>
    </div><div class='col-sm-6'>
      <h5 class='text-center'>Select Units</h5>
      <div id='unitContainer' style='overflow-y:auto;'><div class='list-group' id='unitsList'>$unitsHtml</div></div>
    </div></div>
    <form method='post' id='pageForm'><div class='row mb-3'>
      <div class='col'><div class='custom-control custom-checkbox'>
        <input type='checkbox' class='custom-control-input' onClick='timeEnableDisable()' onLoad='timeEnableDisable()' name='limitTime' id='limitTime'$limitTimeHtml/>
        <label class='custom-control-label mr-sm-2' for='limitTime'>Limit results to the last </label></div></div>
      <div class='col'><select id='timeNum' class='custom-select mr-sm-2' name='timeNum'>\n$timeNumHtml\n</select></div>
      <div class='col'><select id='timeType' class='custom-select mr-sm-2' name='timeType' onChange='updateTime()'>
        $timeTypeHtml\n</select></div></div>
      <div id='timeAlert' class='alert alert-danger d-none' role='alert'>
        <strong>Caution!</strong> Disabling the time filter may result in a very
        large amount of data being downloaded from the server. Loading the page
        with this setting may take some time.
      </div>
      <input type='hidden' name='sort' id='sort' value='$sortColumnsStr'/>
      <input type='hidden' name='units' id='units' value='$selectedUnitsStr'/>
      <input type='hidden' name='pm1med' id='pm1med' value='$pm1med'/>
      <input type='hidden' name='pm1high' id='pm1high' value='$pm1high'/>
      <input type='hidden' name='pm25med' id='pm25med' value='$pm25med'/>
      <input type='hidden' name='pm25high' id='pm25high' value='$pm25high'/>
      <input type='hidden' name='pm10med' id='pm10med' value='$pm10med'/>
      <input type='hidden' name='pm10high' id='pm10high' value='$pm10high'/>
      <input type='hidden' name='tempMed' id='tempMed' value='$tempMed'/>
      <input type='hidden' name='tempHigh' id='tempHigh' value='$tempHigh'/>
      <input type='hidden' name='humMed' id='humMed' value='$humMed'/>
      <input type='hidden' name='humHigh' id='humHigh' value='$humHigh'/>
      <input type='submit' class='btn btn-primary btn-block mb-3' value='Update'/>
    </form>
  </div>
  <div id='navThreshold' class='container' style='padding-top:75px;'>
    <h3 class ='text-center'>Environmental Thresholds</h3>
    <div class='row'><div class='col-sm-4'>
        <h4 class='text-center'>PM 1</h4>
        <div class='row align-items-center'>
          <div class='col badge badge-warning'>Warning Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='pm1MedVal' class='badge badge-pill badge-warning text-center'>$pm1med</span></div>
          <div class='row justify-content-center'><input id='pm1MedSlider' name='pm1MedSlider' type='range' min='1' max='100' value='$pm1med' onInput='updateThreshold(\"pm1MedVal\", \"pm1med\", \"pm1MedSlider\")'/></div></div>
          </div><div class='row align-items-center'>
          <div class='col badge badge-danger'>Danger Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='pm1HighVal' class='badge badge-pill badge-danger text-center'>$pm1high</span></div>
          <div class='row justify-content-center'><input id='pm1HighSlider' name='pm1HighSlider' type='range' min='1' max='100' value='$pm1high' onInput='updateThreshold(\"pm1HighVal\", \"pm1high\", \"pm1HighSlider\")'/></div></div>
        </div>
      </div><div class='col-sm-4'>
        <h4 class='text-center'>PM 2.5</h4>
        <div class='row align-items-center'>
          <div class='col badge badge-warning'>Warning Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='pm25MedVal' class='badge badge-pill badge-warning text-center'>$pm25med</span></div>
          <div class='row justify-content-center'><input id='pm25MedSlider' name='pm25MedSlider' type='range' min='1' max='100' value='$pm25med' onInput='updateThreshold(\"pm25MedVal\", \"pm25med\", \"pm25MedSlider\")'/></div></div>
        </div><div class='row align-items-center'>
          <div class='col badge badge-danger'>Danger Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='pm25HighVal' class='badge badge-pill badge-danger text-center'>$pm25high</span></div>
          <div class='row justify-content-center'><input id='pm25HighSlider' name='pm25HighSlider' type='range' min='1' max='100' value='$pm25high' onInput='updateThreshold(\"pm25HighVal\", \"pm25high\", \"pm25HighSlider\")'/></div></div>
        </div>
      </div><div class='col-sm-4'>
        <h4 class='text-center'>PM 10</h4>
        <div class='row align-items-center'>
          <div class='col badge badge-warning'>Warning Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='pm10MedVal' class='badge badge-pill badge-warning text-center'>$pm10med</span></div>
          <div class='row justify-content-center'><input id='pm10MedSlider' name='pm10MedSlider' type='range' min='1' max='100' value='$pm10med' onInput='updateThreshold(\"pm10MedVal\", \"pm10med\", \"pm10MedSlider\")'/></div></div>
        </div><div class='row align-items-center'>
          <div class='col badge badge-danger'>Danger Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='pm10HighVal' class='badge badge-pill badge-danger text-center'>$pm10high</span></div>
          <div class='row justify-content-center'><input id='pm10HighSlider' name='pm10HighSlider' type='range' min='1' max='100' value='$pm10high' onInput='updateThreshold(\"pm10HighVal\", \"pm10high\", \"pm10HighSlider\")'/></div></div>
        </div>
      </div>
    </div><div class='row mt-3'>
      <div class='col-sm-6'>
        <h4 class='text-center'>Temperature</h4>
        <div class='row align-items-center'>
          <div class='col badge badge-warning'>Warning Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='tempMedVal' class='badge badge-pill badge-warning text-center'>$tempMed</span></div>
          <div class='row justify-content-center'><input id='tempMedSlider' name='tempMedSlider' type='range' min='1' max='100' value='$tempMed' onInput='updateThreshold(\"tempMedVal\", \"tempMed\", \"tempMedSlider\")'/></div></div>
        </div><div class='row align-items-center'>
          <div class='col badge badge-danger'>Danger Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='tempHighVal' class='badge badge-pill badge-danger text-center'>$tempHigh</span></div>
          <div class='row justify-content-center'><input id='tempHighSlider' name='tempHighSlider' type='range' min='1' max='100' value='$tempHigh' onInput='updateThreshold(\"tempHighVal\", \"tempHigh\", \"tempHighSlider\")'/></div></div>
        </div>
      </div><div class='col-sm-6'>
        <h4 class='text-center'>Humidity</h4>
        <div class='row align-items-center'>
          <div class='col badge badge-warning'>Warning Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='humMedVal' class='badge badge-pill badge-warning text-center'>$humMed</span></div>
          <div class='row justify-content-center'><input id='humMedSlider' name='humMedSlider' type='range' min='1' max='100' value='$humMed' onInput='updateThreshold(\"humMedVal\", \"humMed\", \"humMedSlider\")'/></div></div>
        </div><div class='row align-items-center'>
          <div class='col badge badge-danger'>Danger Threshold</div>
          <div class='col'><div class='row justify-content-center'><span id='humHighVal' class='badge badge-pill badge-danger text-center'>$humHigh</span></div>
          <div class='row justify-content-center'><input id='humHighSlider' name='humHighSlider' type='range' min='1' max='100' value='$humHigh' onInput='updateThreshold(\"humHighVal\", \"humHigh\", \"humHighSlider\")'/></div></div>
        </div>
      </div>
    </div>
    <div class='row mt-sm-3'><button class='btn btn-info btn-block mb-3' type='button' data-toggle='collapse' data-target='#thresholdInfo' aria-expanded='false' aria-controls='thresholdInfo'>
      Overview of default thresholds</button></div>
    <div class='collapse' id='thresholdInfo'>
      <div class='card card-body'>
        I am by no means an expert on the effects of the different types of particulate matter on human health, and this is one of the
        reasons I felt it important to allow these thresholds to be adjusted based on your understanding.<br/>
        During online analysis of a number of air quality and particulate matter sources I came to the conclusion that the
        default values used on this page are appropriate. Key information that gleaned from this research was that:<br/>
        <ul class='list-group list-group-flush'>
          <li class='list-group-item'>For PM2.5 the maximum safe level is an average of 10&#13197; per m&#179; in a 12-month period;</li>
          <li class='list-group-item'>Similarly, the maximum safe level of PM2.5 is an average of 25&#13197; per m&#179; in a 24-hour period;</li>
          <li class='list-group-item'>For PM10 the agreed values are slightly higher, at 20&#13197; per m&#179; in a 12-month period;</li>
          <li class='list-group-item'>And 50&#13197; per m&#179; of PM10 in a 24-hour period;</li>
          <li class='list-group-item'>It appears that few studies into safe levels of PM1 (particulates with a diameter less than 0.1&#13211;)
            have resulted in recommended safe levels, however some sources applied similar targets as PM2.5, which I also have done.</li></ul>
    </div></div>
  </div>
  <div id='navData' class='container' style='padding-top:75px;'>
    <div class='table-responsive'><table id='dataTable' class='table table-bordered table-striped'>
      <thead><tr>

EOF

print "<th>$_</th>" for @allColumns;

print "</tr></thead>";

# Retrieve data
# Mangle dates in @allColumns to format them nicely
my @dateCols;
for (@allColumns) {
  if ((index($_, 'date') != -1) || (index($_, 'Date') != -1)) {
    push (@dateCols, "strftime('%d-%m-%Y %H:%M:%S', $_, 'localtime')");
  } else {
    push (@dateCols, $_);
  }
}
my $sqlSelectCols = join ',', @dateCols;
# Build where clause based on units and time
my $where = "";
if ($selectedUnitsStr && length $selectedUnitsStr > 0) {
  $where .= "$unitCol IN ($selectedUnitsStr)";
}
if ($limitTime == 1) {
  if (length $where > 0) {
    $where .= " AND ";
  }
  my $sqlTimeType = $timeType;
  my $sqlTimeNum = $timeNum;
  # SQLite doesn't support weeks, turn weeks into days
  if ($timeType eq "weeks") {
    $sqlTimeType = "days";
    $sqlTimeNum = $timeNum * 7;
  }
  $where .= "datetime($timeCol) >= datetime(\"now\", \"-$sqlTimeNum $sqlTimeType\")";
}
$sql = "SELECT $sqlSelectCols FROM $dbTable";
if ($where && length $where > 0) {
  $sql .= " WHERE $where";
}
if ($sortColumnsStr && length $sortColumnsStr > 0) {
  $sql .= " ORDER BY $sortColumnsStr";
}
$statement = $dbh->prepare($sql);
$statement->execute();

while (my $row = $statement->fetchrow_hashref) {
  print "<tr";
  # Colour code the row based on thresholds
  if (exists($row->{$pm25col}) || exists($row->{$pm10col}) || exists($row->{$pm1col}) || exists($row->{$tempCol}) || exists($row->{$humCol})) {
    print " class='table-";
    my $pm25val = ((exists($row->{$pm25col}))?($row->{$pm25col}):0);
    my $pm10val = ((exists($row->{$pm10col}))?($row->{$pm10col}):0);
    my $pm1val = ((exists($row->{$pm1col}))?($row->{$pm1col}):0);
    my $tempVal = ((exists($row->{$tempCol}))?($row->{$tempCol}):0);
    my $humVal = ((exists($row->{$humCol}))?($row->{$humCol}):0);
    if ($pm25val < $pm25med && $pm10val < $pm25med && $pm1val < $pm1med && $tempVal < $tempMed && $humVal < $humMed) {
      print "success'";
    } elsif ($pm25val < $pm25high && $pm10val < $pm10high && $pm1val < $pm1high && $tempVal < $tempHigh && $humVal < $humHigh) {
      print "warning'";
    } else {
      print "danger'";
    }
  }
  print ">\n";
  print "<td>".((length $row->{$_} > 0)?$row->{$_}:"(null)")."</td>\n" for @dateCols;
  print "</tr>\n";
}

print<<EOF;
    </table></div>
  </div>
  <div id='navChart' class='container' style='padding-top:75px;'>
    chart
  </div>
  <div id='navAbout' class='container' style='padding-top:75px;'>
    <div class='row text-center'><h3>About</h3></div>
    <div class='row'><p>nswSKIES (Sensor Knowledge Ingestion and Extraction
      System) is a sister project to blueSKIES, which you can find a link to
      on the 'other pages' section of the navigation bar. That project was
      inspired by the excellent sensor and other environmental data
      available freely to the public through initiatives such as KOALA in the
      Blue Mountains and by the NSW Department of Planning, Industry &amp; the
      Environment, but disappointment that these freely-available sources lack
      any historical data. This provides a great point-in-time resource but
      not the ability to produce timeseries to analyse data over time and
      identify patterns or trends, such as seasonal effects on air quality.</p>
      <p>While looking into the KOALA dataset I inadvertently stumbled on the
      dataset this page is dedicated to, which appears to provide a dataset
      covering all sensors throughout New South Wales, Australia, whose
      latest readings are available from the DPIE website. Unlike the KOALA
      dataset this data lacks any descriptive location information, providing
      only latitude and longitude for each sensor. This has led me to take a
      different approach with this page than for blueSKIES, focusing on a
      map-driven interface.</p>
      <p>Over coming weeks I expect this page to be rapidly updated, with the
      feature plan being approximately:
      <ul><li>Providing options to filter the results based on time or specific units</li>
        <li>Making thresholds for air quality, temperature and humidity adjustable</li>
        <li>Displaying data in a table</li>
        <li>Displaying a map plotting all sensors</li>
        <li>Linking marker selection on the map to drilling into that unit in the dataset</li>
        <li>Charting selected data</li>
        <li>Reverse geocoding the data to obtain location information</li>
        <li>Allowing data to be filtered by location</li></ul></p>
      <p>For more information on the DPIE sensor data see <a href='https://www.dpie.nsw.gov.au/air-quality/current-air-quality'>https://www.dpie.nsw.gov.au/air-quality/current-air-quality</a></p>
      <p>I also encourage you to check out this page's sister project,
      <a href='blueskies.pl' target='_blank'>blueSKIES</a>. Both nswSKIES and
      blueSKIES are <a href='https://github.com/chris-bc/airQuality'>hosted on GitHub</a>.
      Feel free to develop them further and send me a pull request.</p>
      <p><font size=-1>Built by <a href='mailto:chris\@bennettscash.id.au'>Chris
      Bennetts-Cash</a>, 2020. <a href='http://www.bennettscash.id.au' target='_blank'>http://www.bennettscash.id.au</a></font></p>
</div></div></div></body></html>

EOF
