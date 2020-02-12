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
  # TODO: validate input
}
if ($cgi->param('locs') && length $cgi->param('locs') > 0 && lc($cgi->param('locs')) ne "all") {
  $locations = $cgi->param('locs');
  # TODO: validate input
}
if ($cgi->param('units') && length $cgi->param('units') > 0 && lc($cgi->param('units')) ne "all") {
  $units = $cgi->param('units');
  # TODO: validate input
}

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
if (length $locations > 0) {
  for (split ',', $locations) {
    # Find the location's areas
    for my $l (values %unitsByLoc) {
      if (exists($l->{$_})) {
        push(@visibleUnits, @{$l->{$_}});
      }
    }
  }
} else {
  # Add the units for each visibleLoc
  my %hshLocs = map{$_ => 1} @visibleLocs;
  for my $l (values %unitsByLoc) {
    # %l is a hash of locations to units
    for (keys $l) {
      if (exists($hshLocs{"$_"})) {
        push(@visibleUnits,@{$l->{$_}});
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

# Can't use parameterised values for specified locations because of the
# way perl handles arrays and having an undetermined number of parameters
$sql = "SELECT $selectColumns FROM $dbTable $where ORDER BY $sortColumns";
$statement = $dbh->prepare($sql);
$statement->execute();

while (my $row = $statement->fetchrow_hashref) {
	print "<tr>";
	print "<td>".($row->{$_}//"null")."</td>" for @columnsToShow;
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
<div style='float:left; width:100%;'><h3><input type='checkbox' id='limit'/> Limit Results to the following locations and/or units</h3></div>
<div style='float:left; margin:0; width:33%;'>
  <select id='limitArea' size='10' style='width:100%;' multiple onChange=updateLocs()>

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
  <select id='limitLoc' size='10' style='width:100%;' multiple onChange=updateLocs()>\n";

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
  <select id='limitUnit' size='10' style='width:100%;' multiple onChange=updateLocs()>\n";

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
<div style='float:left; width:100%;'><p>
<form method='post'>
<input type='hidden' name='cols' id='cols' value='$selectColumns'/>
<input type='hidden' name='sort' id='sort' value='$sortColumns'/>
<input type='hidden' name='locs' id='locs' value='$locations'/>
<input type='hidden' name='units' id='units' value='$units'/>
<input type='hidden' name='areas' id='areas' value='$areas'/>
<input type='submit' value='Update'/>
</form></p>
</div>
</body></html>";
