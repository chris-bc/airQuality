#!/usr/bin/perl

use CGI;
use DBI;
use strict;
use warnings;
use lib qw(..);
use Data::Dumper;

print CGI::header();

my $dbFile = "koala.sqlite";
my $dbTable = "kSensor";
my $dsn = "DBI:SQLite:$dbFile";
my %attr = (PrintError=>0, RaiseError=>1, AutoCommit=>1, FetchHashKeyName=>'NAME_lc');
my $areaCol = "locationstring";
my $locCol = "locationdescription";
my $unitCol = "UnitNumber";

my $cgi = CGI->new();
my $selectColumns = "UnitNumber,locationdescription,lastsensingdate,pm1,pm10,pm25,Longitude,Latitude";
if ($cgi->param('cols') && length $cgi->param('cols') > 0) {
  $selectColumns = $cgi->param('cols');
}

my $sortColumns = "UnitNumber,lastsensingdate DESC";
if ($cgi->param('sort') && length $cgi->param('sort') > 0) {
  $sortColumns = $cgi->param('sort');
}

my $areas = "";
my $locations = "";
my $units = "";
if ($cgi->param('areas') && length $cgi->param('areas') > 0 && lc($cgi->param('areas')) ne "all") {
  $areas = $cgi->param('areas');
}
if ($cgi->param('locs') && length $cgi->param('locs') > 0 && lc($cgi->param('locs')) ne "all") {
  $locations = $cgi->param('locs');
}
if ($cgi->param('units') && length $cgi->param('units') > 0 && lc($cgi->param('units')) ne "all") {
  $units = $cgi->param('units');
}

my $limitTime = 0;
my $timeNum = "1";
my $timeType = "hours";
if ($cgi->param('limitTime') && length $cgi->param('limitTime') > 0) {
  $limitTime = $cgi->param('limitTime');
}
if ($cgi->param('timeNum') && length $cgi->param('timeNum') > 0) {
  $timeNum = $cgi->param('timeNum');
}
if ($cgi->param('timeType') && length $cgi->param('timeType') > 0) {
  $timeType = $cgi->param('timeType');
}
my %timeHsh = ("hours", 23, "days", 30, "weeks", 51, "months", 11, "years", 5);

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
my $dbh = DBI->connect($dsn, \%attr);
#TODO Check opened successfully

# Get a list of columns to use later
my @keys = ();
my $sql = "PRAGMA table_info($dbTable)";
my $statement = $dbh->prepare($sql);
$statement->execute();
while (my @data = $statement->fetchrow_array()) {
	push(@keys, $data[1]);
}
($statement->rows > 0) or die "Unable to find any database columns\n\n";
@keys = sort @keys;
$statement->finish;

# Get a hash of locaions and their units to use later
my %unitsByLoc;
my @allLocs;
my @allUnits;
my %tmpLocs;
my %tmpUnits;
# TODO: Prepare the statement to avoid SQLI. Commented line below errors.
$sql = "SELECT DISTINCT $areaCol, $locCol,$unitCol from $dbTable ORDER BY $areaCol,$locCol,$unitCol";
#$statement = $dbh->prepare($sql, $locCol, $unitCol, $locCol, $unitCol);
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

# If location inputs are specified determine which are visible by default
my @visibleLocs;
my @visibleUnits = ();

# DEBUG
#$areas = "Adelaide,Sydney";
#$locations = "Adelaide,Katoomba AQMS";
#$units = "AQB0049,AQB0059,AQB0004,AQB0005";

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
    # BUG: need to validate areas against specified areas (if any)
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

# DEBUG
#print "Visible locations completed.\nAREAS: ".Dumper(keys %unitsByLoc)."\n\nLOCATIONS: ".Dumper(@visibleLocs)."\n\nUNITS: ".Dumper(@visibleUnits)."\n";

# Validate columns in parameters are valid
my %k = map {$_ => 1} @keys;
exists($k{$_}) or die "Select column $_ is not valid" for @columnsToShow;
exists($k{(split ' ', $_)[0]}) or die "Sort column ".(split ' ',$_)[0]." is not valid\n" for @sortColumns;

print "<html><head></head><body><h1>Sensor Data</h1><p><table border=1>";
print "<th>$_</th>" for @columnsToShow;

# Build where clause based on locations and units variables
my $where = "";
if (length $areas > 0 || length $locations > 0 || length $units > 0) {
  $where .= "WHERE ";
  if (length $areas > 0) {
    my @sqlAreas = split ',', $areas;
    $_ = "'$_'" for @sqlAreas;
    $where .= "$areaCol in (".(join ',', @sqlAreas).")";
    if (length $locations > 0 || length $units > 0) {
      $where .= " AND ";
    }
  }
  if (length $locations > 0) {
    my @sqlLocs = split ',', $locations;
    $_ = "'$_'" for @sqlLocs;
    $where .= "$locCol in (".(join ',', @sqlLocs).")";
    if (length $units > 0) {
      $where .= " AND ";
    }
  }
  if (length $units > 0) {
    my @sqlUnits = split ',', $units;
    $_ = "'$_'" for @sqlUnits;
    $where .= "$unitCol in (".(join ',', @sqlUnits).")";
  }
}

# Don't want to alter @columnsToShow because it's used in subsequent functionality
# Take a copy of it, mangle date columns to do some formatting, and push back into
# $selectColumns
my @dateCols = split ',', $selectColumns;
for (@dateCols) {
  if ((index($_,'date') != -1) || (index($_,'Date') != -1)) {
    $_ = "datetime($_, 'localtime')";
  }
}
$selectColumns = join ',', @dateCols;

# Can't use parameterised values for specified locations because of the
# way perl handles arrays and having an undetermined number of parameters
$sql = "SELECT $selectColumns FROM $dbTable $where ORDER BY $sortColumns";
$statement = $dbh->prepare($sql);
$statement->execute();

while (my $row = $statement->fetchrow_hashref) {
	print "<tr>";
	print "<td>".($row->{$_}//"null")."</td>" for @dateCols;
	print "</tr>";
}
$statement->finish;
$dbh->disconnect;
print "</table></p>";

print<<EOF;
<script src="addRemove.js"></script>
<p>
<h3>Columns to show</h3>

<div style="width:50%;">
  <div style="float:left; margin:0; width:40%;">
    <select id="allcols" size="10" style="width:100%;">

EOF

for (@keys) {
  print "<option value='$_'>$_</option>\n" unless (exists($colsHash{$_}));
}

print<<EOF;
    </select>
  </div>
  <div style="float:left; margin:0; width:20%;height=100%;text-align:center;">
    <br/><button onClick="addCol()" style="width:80%;"> &gt; </button><br/><br/>
    <button onClick="rmCol()" style="width:80%;"> &lt; </button><br/><br/>
    <button onClick="rmAll()" style="width:80%;"> &lt;&lt; </button>
  </div>
  <div style="float:left; margin:0; width:40%;">
    <select name="selCols" id="selCols" size="10" style="width:100%;">

EOF

print "<option value='$_'>$_</option>/n" for @columnsToShow;

print<<EOF;

    </select>
  </div>
</div>
</p>
<p>
<div style="float:left; width:100%;">
<p><h3>Sort columns</h3></p></div>
<div style='width:50%;'>
  <div style="float:left; margin:0; width:40%;">
    <select id="allSortCols" size="10" style="width:100%;">

EOF

for (@keys) {
  print "<option value='$_'>$_</option>\n" unless (exists($sortColsHash{$_}));
}

print<<EOF;
    </select>
  </div>
  <div style="float:left; margin:0; width:20%; height=100%; text-align:center;">
    <br/><button onClick="addSort()" style="width:80%;"> &gt; ASC </button><br/><br/>
    <button onClick="addSortDesc()" style="width:80%;"> &gt; DESC </button><br/><br/>
    <button onClick="rmSort()" style="width:80%;"> &lt; </button><br/><br/>
    <button onClick="rmSortAll()" style="width:80%;"> &lt;&lt; </button>
  </div>
  <div style="float:left; margin:0; width:40%;">
    <select name="selSortCols" id="selSortCols" size="10" style="width:100%;">

EOF

print "<option value='$_'>$_</option>\n" for @sortColumns;

print<<EOF;
    </select>
  </div>
</div>
<div style='float:left; width:100%;'><h3>Limit Results to the following locations and/or units</h3></div>
<div style='float:left; margin:0; width:33%;'>
  <select id='limitArea' size='10' style='width:100%;' multiple onChange=locsChanged()>

EOF

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
<div style='float:left; margin:0; width:33%;'>
  <select id='limitLoc' size='10' style='width:100%;' multiple onChange=locsChanged()>\n";

# Prompts: @visibleLocs @visibleUnits @allLocs @allUnits %unitsByLoc
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
</div><div style='float:left; margin:0; width:33%;'>
  <select id='limitUnit' size='10' style='width:100%;' multiple onChange=unitsChanged()>\n";

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
#    print "dumping :$areaKey:$locKey:\n".Dumper(@{%unitsByLoc->{$areaKey}->{$locKey}})."\n";
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
</div>
<form method='post'>
<div style='float:left; width:100%;'>
  <input type='checkbox' onClick=timeEnableDisable() name='limitTime' id='limitTime'" . (($limitTime == 1)?" checked":"") . "/>
  <label for='limitTime'>Limit results to the last </label>
  <select id='timeNum'" . (($limitTime == 0)?" disabled='true'":"") . ">\n";
for (my $i=1; $i <= $timeHsh{$timeType}; $i++) {
  print "<option value=$i" . (($i == $timeNum)?" selected":"") . ">$i</option>\n";
}
print "</select><select id='timeType' onChange=updateTime()" . (($limitTime == 0)?" disabled='true'":"") . ">\n";
for (keys %timeHsh) {
  print "<option value ='$_'" . (($_ eq $timeType)?" selected":"") . ">$_</option>\n";
}

print "</select>
</div>
<div style='float:left; width:100%;'><p>
<input type='hidden' name='cols' id='cols' value='$selectColumns'/>
<input type='hidden' name='sort' id='sort' value='$sortColumns'/>
<input type='hidden' name='locs' id='locs' value='$locations'/>
<input type='hidden' name='units' id='units' value='$units'/>
<input type='hidden' name='areas' id='areas' value='$areas'/>
<input type='submit' value='Update'/>
</form></p>
</div>
</body></html>";
