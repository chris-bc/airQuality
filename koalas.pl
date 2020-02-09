#!/usr/bin/perl

use CGI;
use DBI;
use strict;
use warnings;
use lib qw(..);

print CGI::header();

my $dbFile = "koala.sqlite";
my $dbTable = "kSensor";
my $dsn = "DBI:SQLite:$dbFile";
my %attr = (PrintError=>0, RaiseError=>1, AutoCommit=>1, FetchHashKeyName=>'NAME_lc');

my $cgi = CGI->new();
my $selectColumns = ($cgi->param('cols')//"UnitNumber,locationdescription,lastsensingdate,pm1,pm10,pm25,Longitude,Latitude");
my $sortColumns = ($cgi->param('sort')//"UnitNumber,lastsensingdate DESC");

my @columnsToShow = split ',', $selectColumns;
my @sortColumns = split ',', $sortColumns;
my %colsHash = map {$_ => 1} @columnsToShow;

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

# Validate columns in parameters are valid
my %k = map {$_ => 1} @keys;
exists($k{$_}) or die "Select column $_ is not valid" for @columnsToShow;
exists($k{(split ' ', $_)[0]}) or die "Sort column ".(split ' ',$_)[0]." is not valid\n" for @sortColumns;

print "<html><head></head><body><h1>Sensor Data</h1><p><table border=1>";
print "<th>$_</th>" for @columnsToShow;

$sql = "SELECT $selectColumns FROM $dbTable ORDER BY $sortColumns";
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
<!--<form method="get">-->
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

for (@keys) {
  print "<option value='$_'>$_</option>\n" if exists($colsHash{$_});
}

print<<EOF;

    </select>
  </div>
</div>

<h3>Sort columns</h3>
TODO
<input type="submit" value="Submit">
</form>

EOF

print "</body></html>";

