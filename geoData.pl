#!/usr/local/bin/perl

use CGI;
use DBI;
use strict;
use warnings;
use lib qw(..);
use Data::Dumper;
use JSON qw(  );

my $nswTable = "nswSensor";
my $blueTable = "kSensors";
my @faultyUnits = ("AQB0001", "AQB0002", "AQB0003", "AQB0004", "AQB0005", "AQB0006", "AQB0027", "AQB0028", "AQB0036", "AQB0038", "AQB0039", "AQB0050", "AQB0063", "AQB0078", "AQB0081", "AQB0083", "AQB0084", "AQB0085", "AQB0086", "AQB0087", "AQB0088", "AQB0091", "AQB0092", "AQB0100", "AQB0101", "AQB0102", "AQB0103", "AQB0104", "AQB0105", "AQB0106", "AQB0108", "AQB0109", "AQB0110", "AQB0112", "AQB0113", "AQB0114", "AQB0115", "AQB0116", "AQB0117", "AQB0118", "AQB0119", "AQB0120", "AQB0121", "AQB0122", "AQB0123", "AQB0126", "AQB0127", "AQB0128");
$_ = "'$_'" for @faultyUnits;
my @cols = ("dataset", "UnitNumber", "area", "location", "pm1", "pm25", "pm10", "temp", "humidity", "Latitude", "Longitude", "time");
my @recs = ();
my $showFaulty = 0;
my $timeNum = 0;
my $timeType = "";
my $units = "";
my $historical = 0;
my $cgi = CGI->new();
if ($cgi->param && $cgi->param('faulty')) {
    $showFaulty = 1;
}
if ($cgi->param && $cgi->param('historical')) {
    $historical = 1;
}
if ($cgi->param && $cgi->param('timeNum')) {
    $timeNum = $cgi->param('timeNum');
}
if ($cgi->param && $cgi->param('timeType')) {
    $timeType = $cgi->param('timeType');
}
if ($cgi->param && $cgi->param('units')) {
    $units = $cgi->param('units');
}

my @unitsArr;
if (length $units > 0) {
    @unitsArr = split ',', $units;
    $_ = "'" . $_ . "'" for @unitsArr;
}
# Remove 's' from end of timeType
chop($timeType);
# TODO: Input validation

# SQL fragments
my $blueSQLStart = "SELECT 'KOALA' as dataset, UnitNumber, locationstring as area, locationdescription as location, pm1, pm25, pm10, null as temp, null as humidity, Latitude, Longitude, ";
my $nswSQLStart = "SELECT 'NSW' as dataset, UnitNumber, null as area, null as location, PM1 as pm1, PM2 as pm25, PM10 as pm10, TempDegC as temp, Humidity as humidity, Latitude, Longitude, ";
my $blueTimeCol = "lastdatecreated";
my $nswTimeCol = "SensingDate";
my $blueSQLTime = "DATE_FORMAT(CONVERT_TZ($blueTimeCol, 'GMT', 'Australia/Sydney'), '%d-%m-%Y %H:%i:%S') as time";
my $nswSQLTime = "DATE_FORMAT(CONVERT_TZ($nswTimeCol, 'GMT', 'Australia/Sydney'), '%d-%m-%Y %H:%i:%S') as time";

my $blueSQL = $blueSQLStart . $blueSQLTime;
my $nswSQL = $nswSQLStart . $nswSQLTime;
my $firstWhere = 1;

$blueSQL .= " FROM $blueTable";
$nswSQL .= " FROM $nswTable";
if ($showFaulty == 0) {
    $blueSQL .= " WHERE UnitNumber NOT IN (" . (join ',', @faultyUnits) . ")";
    $nswSQL .= " WHERE UnitNumber NOT IN (" . (join ',', @faultyUnits) . ")";
    $firstWhere = 0;
}
if (length $units > 0) {
    if ($firstWhere == 1) {
        $blueSQL .= " WHERE ";
        $nswSQL .= " WHERE ";
        $firstWhere = 0;
    } else {
        $blueSQL .= " AND ";
        $nswSQL .= " AND ";
    }
    $blueSQL .= "UnitNumber IN (" . (join ',', @unitsArr) . ")";
    $nswSQL .= "UnitNumber IN (" . (join ',', @unitsArr) . ")";
}
if ($historical == 1) {
    if ($firstWhere == 1) {
        $blueSQL .= " WHERE ";
        $nswSQL .= " WHERE ";
        $firstWhere = 0;
    } else {
        $blueSQL .= " AND ";
        $nswSQL .= " AND ";
    }
    $blueSQL .= "CONVERT_TZ($blueTimeCol, 'GMT', 'Australia/Sydney') >= DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL $timeNum $timeType)";
    $nswSQL .= "CONVERT_TZ($nswTimeCol, 'GMT', 'Australia/Sydney') >= DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL $timeNum $timeType)";
} else {
    if ($firstWhere == 1) {
        $blueSQL .= " WHERE ";
        $nswSQL .= " WHERE ";
        $firstWhere = 0;
    } else {
        $blueSQL .= " AND ";
        $nswSQL .= " AND ";
    }
    $blueSQL .= "(UnitNumber, $blueTimeCol) in (SELECT UnitNumber, MAX($blueTimeCol) FROM $blueTable GROUP BY UnitNumber)";
    $nswSQL .= "(UnitNumber, $nswTimeCol) in (SELECT UnitNumber, MAX($nswTimeCol) FROM $nswTable GROUP BY UnitNumber)";
}

# Connect to DB
my $driver = "mysql";
my $dsn = "DBI:$driver:database=sensors;host=127.0.0.1";
my $dbh = DBI->connect($dsn, "root", "kitty234") or die "Unable to connect to database $dsn\n";

my $statement = $dbh->prepare($nswSQL);
$statement->execute();
while (my @row = $statement->fetchrow_array()) {
    my %rec = ();
    for (my $i=0; $i < (scalar @row); $i++) {
        $rec{$cols[$i]} = $row[$i];
    }
    push(@recs, \%rec);
}
$statement->finish;
$statement = $dbh->prepare($blueSQL);
$statement->execute();
while (my @row = $statement->fetchrow_array()) {
    my %rec = ();
    for (my $i=0; $i < (scalar @row); $i++) {
        $rec{$cols[$i]} = $row[$i];
    }
    push(@recs, \%rec);
}
$statement->finish;
$dbh->disconnect;

my $json = JSON->new;
my $data = $json->encode(\@recs);
print CGI::header();
print $data;
