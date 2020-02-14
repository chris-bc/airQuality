#!/usr/bin/perl

use CGI;
use DBI;
use strict;
use warnings;
use lib qw(..);
use Data::Dumper;

print CGI::header();

# Initialise variables
my $dbFile = "koala.sqlite";
my $dbTable = "kSensor";
my $dsn = "DBI:SQLite:$dbFile";
my %attr = (PrintError=>0, RaiseError=>1, AutoCommit=>1, FetchHashKeyName=>'NAME_lc');
my $areaCol = "locationstring";
my $locCol = "locationdescription";
my $unitCol = "UnitNumber";
my $timeCol = "lastsensingdate";
my $pm25col = "pm25";
my $pm10col = "pm10";
my $pm1col = "pm1";
my %timeHsh = ("hours", 23, "days", 30, "weeks", 51, "months", 11, "years", 5);
my @keys = ();
my %unitsByLoc;
my @allLocs;
my @allUnits;
my %tmpLocs;
my %tmpUnits;
my @visibleLocs;
my @visibleUnits = ();

# Initialise parameters
my $selectColumns = "UnitNumber,locationdescription,lastsensingdate,pm1,pm10,pm25,Longitude,Latitude";
my $sortColumns = "UnitNumber,lastsensingdate DESC";
my $areas = "";
my $locations = "";
my $units = "";
# By default limit time to the last 3 days
my $limitTime = 1;
my $timeNum = "1";
my $timeType = "hours";
my $pm25med = 10;
my $pm25high = 25;
my $pm10med = 20;
my $pm10high = 50;
my $pm1med = 10;
my $pm1high = 25;

# Get parameters
my $cgi = CGI->new();
if ($cgi->param('cols') && length $cgi->param('cols') > 0) {
  $selectColumns = $cgi->param('cols');
}
if ($cgi->param('sort') && length $cgi->param('sort') > 0) {
  $sortColumns = $cgi->param('sort');
}
if ($cgi->param('areas') && length $cgi->param('areas') > 0 && lc($cgi->param('areas')) ne "all") {
  $areas = $cgi->param('areas');
}
if ($cgi->param('locs') && length $cgi->param('locs') > 0 && lc($cgi->param('locs')) ne "all") {
  $locations = $cgi->param('locs');
}
if ($cgi->param('units') && length $cgi->param('units') > 0 && lc($cgi->param('units')) ne "all") {
  $units = $cgi->param('units');
}
if ($cgi->param('limitTime') && length $cgi->param('limitTime') > 0) {
  $limitTime = 1;
} elsif (length $cgi->param > 0) {
  # Because we default to limiting to the past hour, check if the parameter is deliberately absent
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
if ($cgi->param('pm10med') && length $cgi->param('pm10med') > 0) {
  $pm10med = $cgi->param('pm10med');
}
if ($cgi->param('pm10high') && length $cgi->param('pm10high') > 0) {
  $pm10high = $cgi->param('pm10high');
}
if ($cgi->param('pm1med') && length $cgi->param('pm1med') > 0) {
  $pm1med = $cgi->param('pm1med');
}
if ($cgi->param('pm1high') && length $cgi->param('pm1high') > 0) {
  $pm1high = $cgi->param('pm1high');
}

# Process and validate parameters
# Set default time params if they're invalid
$limitTime = 0 unless ($limitTime == 0 || $limitTime == 1);
$timeType = "hours" unless exists($timeHsh{$timeType});
$timeNum = "1" unless ($timeNum >= 1 && $timeNum <= $timeHsh{$timeType});

my @columnsToShow = split ',', $selectColumns;
my @sortColumns = split ',', $sortColumns;
my %colsHash = map {$_ => 1} @columnsToShow;

# @sortColumns contains elements that include ASC/DESC spec
# Get a list of columns that are used for sorting
my %sortColsHash = map {(split ' ', $_)[0] => 1} @sortColumns;

# Does the DB exist?
(-e $dbFile) or die "Cannot find database $dbFile, Terminating\n\n";
# Connect
my $dbh = DBI->connect($dsn, \%attr) or die "Unable to connect to database $dbFile, Terminating\n\n";

# Get a list of DB columns to allow column validation
my $sql = "PRAGMA table_info($dbTable)";
my $statement = $dbh->prepare($sql);
$statement->execute();
while (my @data = $statement->fetchrow_array()) {
	push(@keys, $data[1]);
}
($statement->rows > 0) or die "Unable to find any database columns\n\n";
@keys = sort @keys;
$statement->finish;

# Get a hash of locaions and their units for column validation and later use
$sql = "SELECT DISTINCT $areaCol, $locCol,$unitCol from $dbTable ORDER BY $areaCol,$locCol,$unitCol";
$statement = $dbh->prepare($sql);
$statement->execute();

while (my @row = $statement->fetchrow_array) {
  $row[0] = "(empty)" if (!$row[0] || length $row[0] == 0);
  $row[1] = "(empty)" if (!$row[1] || length $row[1] == 0);
  $row[2] = "(empty)" if (!$row[2] || length $row[2] == 0);

  $tmpLocs{$row[1]} = 1;
  $tmpUnits{$row[2]} = 1;

  # Does the unit array exist?
  my @arr = ();
  @arr = $unitsByLoc{$row[0]}{$row[1]};
  if ($arr[0]) {
    # Why arr[0] rather than arr? Who can say!
    push(@arr[0], $row[2]);
  } else {
    $unitsByLoc{$row[0]}{$row[1]}[0] = $row[2];
  }
}
($statement->rows > 0) or die "Failed to fetch units by location\n\n";
$statement->finish;

# allAreas is keys unitsByLoc
@allLocs = sort keys %tmpLocs;
@allUnits = sort keys %tmpUnits;

# Validate location inputs
if (length $areas > 0) {
  for (split ',', $areas) {
    exists(%unitsByLoc->{$_}) or die "Invalid area '$_' specified\n";
  }
}
if (length $locations > 0) {
  for (split ',', $locations) {
    exists($tmpLocs{$_}) or die "Invalid location '$_' specified\n";
  }
}
if (length $units > 0) {
  for (split ',', $units) {
    exists ($tmpUnits{$_}) or die "Invalid unit '$_' specified\n";
  }
}

# DEBUG
#$areas = "Adelaide,Sydney";
#$locations = "Adelaide,Katoomba AQMS";
#$units = "AQB0049,AQB0059,AQB0004,AQB0005";
#$limitTime = 1;
#$timeNum = "5";
#$timeType = "weeks";

# If location inputs are specified determine which are visible by default
if (length $areas > 0) {
  # Area(s) have been specified. Only relevant locations are visible
  for (split ',', $areas) {
    push(@visibleLocs, keys %unitsByLoc->{$_});
  }
} else {
  @visibleLocs = @allLocs;
}
# If location(s) specified only their units are visible
# Otherwise all units in visibleLocs are visible
my %areaSpec = map {$_ => 1} (split ',', $areas);

if (length $locations > 0) {
  for (split ',', $locations) {
    # Find the location's areas
    for my $a (keys %unitsByLoc) {
      if ((length $areas == 0) || exists($areaSpec{$a})) {
        # Either the area is visible or we're looking at all areas.
        if (exists(%unitsByLoc->{$a}->{$_})) {
          push(@visibleUnits, @{%unitsByLoc->{$a}->{$_}});
        }
      }
    }
  }
} else {
  # Add the units for each visibleLoc
  my %hshLocs = map{$_ => 1} @visibleLocs;
  # Because locations aren't unique to an area check area is selected
  for my $a (keys %unitsByLoc) {
    if ((length $areas == 0) || exists($areaSpec{$a})) {
      # Either the area is visible or we're looking at all areas.
      for (keys %unitsByLoc->{$a}) {
        if (exists($hshLocs{"$_"})) {
          push(@visibleUnits, @{%unitsByLoc->{$a}->{$_}});
        }
      }
    }
  }
}

# Validate columns in parameters are valid
my %k = map {$_ => 1} @keys;
exists($k{$_}) or die "Select column $_ is not valid" for @columnsToShow;
exists($k{(split ' ', $_)[0]}) or die "Sort column ".(split ' ',$_)[0]." is not valid\n" for @sortColumns;

# Finally render the HTML
print "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>
  <link rel='stylesheet' href='bootstrap.min.css'>
  <script src='https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js'></script>
  <script src='bootstrap.min.js'></script><script src='addRemove.js'></script></head><body>
<div class='container'>
<h1 class='text-center'>Air Quality Data</h1>
<div class='row'><div class='col'><h3 class='text-center'>Limit Results to the following locations and/or units</h3></div></div>
<div class='row mb-3'>
<div class='col-sm-4'>
  <select id='limitArea' size='10' class='custom-select' multiple onChange=locsChanged()>\n";

# Two approaches for options that should not be visible:
# hidden='hidden' will hide the options on Chrome and Firefox
# disabled='true' will display but disable them on Safari and IE

# Display all areas, selecting any that are specified in $areas
my @selectedAreas = split ',', $areas;
print "<option value='all'".((length $areas > 0)?"":" selected").">All</option>\n";
for my $iArea (sort keys %unitsByLoc) {
  my $strOpt = "<option value='$iArea'";
  # Is this area selected?
  for (@selectedAreas) {
    $strOpt .= " selected" if ($iArea eq $_);
  }
  $strOpt .= ">$iArea</option>\n";
  print $strOpt;
}

print "
  </select>
</div>
<div class='col-sm-4'>
  <select id='limitLoc' size='10' class='custom-select' multiple onChange=locsChanged()>\n";

my @selectedLocs = split ',', $locations;
print "<option value='all'".((length $locations > 0)?"":" selected").">All</option>\n";
# Loop through @allLocs. For each loc, select if is in @selectedLocs,
# hide unless in @visibleLocs, custom attribute kArea finding their area from hash
for my $iLoc (sort @allLocs) {
  my $strOpt = "<option value ='$iLoc'";
  my $visible = 0;
  $visible = (($_ eq $iLoc)?1:$visible) for @visibleLocs;
  $strOpt .= " hidden='hidden' disabled='true'" if ($visible == 0);
  for (@selectedLocs) {
    $strOpt .= " selected" if ($iLoc eq $_);
  }
  # Find the area $iLoc is in
  # This is fun - Some location names are duplicated across multiple areas
  # DECISION => locArea attribute will need to support multiple values
  my $locArea = "";
  for (keys %unitsByLoc) {
    my $thisVal = %unitsByLoc->{$_};
    if (exists($thisVal->{$iLoc})) {
      # Handle multiple matching areas:
      $locArea .= "," if (length $locArea > 0);
      $locArea .= $_;
    }
  }
  $strOpt .= " kArea='$locArea'>$iLoc</option>\n";
  print $strOpt;
}

print "
  </select>
</div><div class='col-sm-4'>
  <select id='limitUnit' size='10' class='custom-select' multiple onChange=unitsChanged()>\n";

# Because location is not unique to an array we'll need to use the hash, at
# minimum to identify area and location for each unit. Given that, it *would*
# make more sense to navigate the hash for everything here, however that restricts
# our ability to sort the results on unit name.
# DECISION => Navigate the hash, building options (other than 'all') into an
# array. Sort that before printing.
my @unitOptions;
my %selectedUnits = map {$_ => 1} (split ',', $units);
my %visibleUnitsHash = map {$_ => 1} @visibleUnits;
print "<option value='all' ".((length $units > 0)?"":" selected").">All</option>\n";

# Loop through the hash down to the units level
for my $areaKey (keys %unitsByLoc) {
  for my $locKey (keys %unitsByLoc->{$areaKey}) {
    for my $iUnit (@{%unitsByLoc->{$areaKey}->{$locKey}}) {
      my $thisUnit = "<option value='$iUnit' kArea='$areaKey' kLoc='$locKey'";
      $thisUnit .= " selected" if (exists($selectedUnits{$iUnit}));
      $thisUnit .= " hidden='hidden' disabled='true'" unless (exists($visibleUnitsHash{$iUnit}));
      $thisUnit .= ">$iUnit</option>\n";
      push(@unitOptions, $thisUnit);
    }
  }
}

print "$_\n" for sort @unitOptions;
print "  </select>
</div></div>
<form method='post' ><div class='row mb-3'><div class='col'>
<div class='custom-control custom-checkbox'>
<input type='checkbox' class='custom-control-input' onClick=timeEnableDisable() name='limitTime' id='limitTime'" . (($limitTime == 1)?" checked":"") . "/>
<label class='custom-control-label mr-sm-2' for='limitTime'>Limit results to the last </label></div></div><div class='col'>
  <select id='timeNum' class='custom-select mr-sm-2' name='timeNum'" . (($limitTime == 0)?" disabled='true'":"") . ">\n";
for (my $i=1; $i <= $timeHsh{$timeType}; $i++) {
  print "<option value=$i" . (($i == $timeNum)?" selected":"") . ">$i</option>\n";
}
print "</select></div><div class='col'><select id='timeType' class='custom-select mr-sm-2' name='timeType' onChange=updateTime()" . (($limitTime == 0)?" disabled='true'":"") . ">\n";
for (keys %timeHsh) {
  print "<option value ='$_'" . (($_ eq $timeType)?" selected":"") . ">$_</option>\n";
}

# Hidden form elements are updated by javascript functions in response to selections
print "</select>
</div></div>
<input type='hidden' name='cols' id='cols' value='$selectColumns'/>
<input type='hidden' name='sort' id='sort' value='$sortColumns'/>
<input type='hidden' name='locs' id='locs' value='$locations'/>
<input type='hidden' name='units' id='units' value='$units'/>
<input type='hidden' name='areas' id='areas' value='$areas'/>
<input type='submit' class='btn btn-primary btn-block mb-3' value='Update'/>
</form>

<div class='table-responsive'><table class='table table-bordered table-striped'><thead><tr>";
# Render the data table
print "<th>$_</th>" for @columnsToShow;
print "</tr></thead>";
# Build where clause based on locations and units variables
my $where = "";
if (length $areas > 0 || length $locations > 0 || length $units > 0 || $limitTime == 1) {
  $where .= "WHERE ";
  if (length $areas > 0) {
    my @sqlAreas = split ',', $areas;
    $_ = "'$_'" for @sqlAreas;
    $where .= "$areaCol in (".(join ',', @sqlAreas).")";
    if (length $locations > 0 || length $units > 0 || $limitTime == 1) {
      $where .= " AND ";
    }
  }
  if (length $locations > 0) {
    my @sqlLocs = split ',', $locations;
    $_ = "'$_'" for @sqlLocs;
    $where .= "$locCol in (".(join ',', @sqlLocs).")";
    if (length $units > 0 || $limitTime == 1) {
      $where .= " AND ";
    }
  }
  if (length $units > 0) {
    my @sqlUnits = split ',', $units;
    $_ = "'$_'" for @sqlUnits;
    $where .= "$unitCol in (".(join ',', @sqlUnits).")";
    if ($limitTime == 1) {
      $where .= " AND ";
    }
  }
  if ($limitTime == 1) {
    my $sqlTimeType = $timeType;
    my $sqlTimeNum = $timeNum;
    # SQLite doesn't support weeks, turn weeks into days.
    if ($timeType eq "weeks") {
      $sqlTimeType = "days";
      $sqlTimeNum = $timeNum * 7;
    }
    $where .= "datetime($timeCol) >= datetime(\"now\", \"-$sqlTimeNum $sqlTimeType\")";
  }
}

# Don't want to alter @columnsToShow because it's used in subsequent functionality
# Take a copy of it, mangle date columns to do some formatting, and push  into
# $sqlSelectColumns
my @dateCols = split ',', $selectColumns;
for (@dateCols) {
  if ((index($_,'date') != -1) || (index($_,'Date') != -1)) {
    $_ = "strftime('%d-%m-%Y %H:%M:%S', $_, 'localtime')";
  }
}
my $sqlSelectColumns = join ',', @dateCols;

# Can't use parameterised values for specified locations because of the
# way perl handles arrays and having an undetermined number of parameters
$sql = "SELECT $sqlSelectColumns FROM $dbTable $where ORDER BY $sortColumns";
$statement = $dbh->prepare($sql);
$statement->execute();

while (my $row = $statement->fetchrow_hashref) {
	print "<tr";
  # Colour code the row based on PM data
  if (exists($row->{$pm25col}) || exists($row->{$pm10col}) || exists($row->{$pm1col})) {
    print " class='table-";
    my $pm25val = ((exists($row->{$pm25col}))?($row->{$pm25col}):0);
    my $pm10val = ((exists($row->{$pm10col}))?($row->{$pm10col}):0);
    my $pm1val = ((exists($row->{$pm1col}))?($row->{$pm1col}):0);
    if ($pm25val < $pm25med && $pm10val < $pm10med && $pm1val < $pm1med) {
      print "success'";
    } elsif ($pm25val < $pm25high && $pm10val < $pm10high && $pm1val < $pm1high) {
      print "warning'";
    } else {
      print "danger'";
    }
  }
	print ">";
  print "<td>".((length $row->{$_} > 0)?$row->{$_}:"(null)")."</td>" for @dateCols;
	print "</tr>";
}
$statement->finish;
$dbh->disconnect;
print "</table></div>";

# Display column options
print<<EOF;
<div class='row'><div class='col-sm-6'>
<h3 class='text-center'>Columns to show</h3>

<div class="row">
  <div class="col">
    <select id="allcols" size="10" class="custom-select" style="width:100%;">

EOF

for (@keys) {
  print "<option value='$_'>$_</option>\n" unless (exists($colsHash{$_}));
}

print<<EOF;
    </select>
  </div>
  <div class="col">
    <br/><button onClick="addCol()" class="btn-light mb-3 btn-block mt-3"> &gt; </button>
    <button onClick="rmCol()" class="btn-block btn-light mb-3 mt-3"> &lt; </button>
    <button onClick="rmAll()" class="btn-block mb-3 btn-light mt-3"> &lt;&lt; </button>
  </div>
  <div class="col">
    <select name="selCols" id="selCols" size="10" class="custom-select" style="width:100%;">

EOF

print "<option value='$_'>$_</option>\n" for @columnsToShow;

print<<EOF;

    </select>
  </div>
</div>
</div><div class='col-sm-6'>
<h3 class='text-center'>Sort columns</h3>
<div class='row'>
  <div class='col'>
    <select id="allSortCols" size="10" class="custom-select" style="width:100%;">

EOF

for (@keys) {
  print "<option value='$_'>$_</option>\n" unless (exists($sortColsHash{$_}));
}

print<<EOF;
    </select>
  </div>
  <div class='col'>
    <button onClick="addSort()" class="btn-block btn-light mb-3 mt-3"> &gt; ASC </button>
    <button onClick="addSortDesc()" class="btn-block btn-light mb-3"> &gt; DESC </button>
    <button onClick="rmSort()" class="btn-block btn-light mb-3"> &lt; </button>
    <button onClick="rmSortAll()" class="btn-block btn-light mb-3"> &lt;&lt; </button>
  </div>
  <div class='col'>
    <select name="selSortCols" id="selSortCols" size="10" class="custom-select" style="width:100%;">

EOF

print "<option value='$_'>$_</option>\n" for @sortColumns;

print "
    </select>
  </div>
</div></div></div>
<div style='float:left; width:100%;'><p><h3>About</h3></p>
<p>This page draws on data made available as part of the KOALA project
(Knowing Our Ambient Local Air-quality), an array of particulate matter sensors
installed primarily in and around the Blue Mountains. This page was inspired by
their public pages only providing the most recent air quality observation for
each sensor.<br/>
This site polls their publicly-available dataset for new observations every
ten minutes, building a database of observations over time to allow patterns
and trends to be identified.<br/>
For more information on this project see <a href='http://bluemountains.sensors.net.au/'>http://bluemountains.sensors.net.au/</a></p>
<p>This project is <a href='https://github.com/chris-bc/airQuality'>hosted on GitHub</a>. Feel free to develop it further and send me a pull request</p>
<p><font size=-1>Built by Chris Bennetts-Cash, 2020. <a href='http://www.bennettscash.id.au'>http://www.bennettscash.id.au</a></font></p>
</div></div></body></html>";
