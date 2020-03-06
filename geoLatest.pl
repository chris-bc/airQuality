#!/usr/bin/perl

use CGI;
use DBI;
use strict;
use warnings;
use lib qw(..);
use Data::Dumper;
use JSON qw(  );

my $nswDb = "nswskies.sqlite";
my $blueDb = "koala.sqlite";
my $nswTable = "nswSensor";
my $blueTable = "kSensor";
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
if ($timeType eq "weeks") {
    $timeType = "days";
    $timeNum = $timeNum * 7;
}
# TODO: Input validation

# SQL fragments
my $blueSQLStart = "SELECT 'KOALA' as dataset, UnitNumber, locationstring as area, locationdescription as location, pm1, pm25, pm10, null as temp, null as humidity, Latitude, Longitude, ";
my $nswSQLStart = "SELECT 'NSW' as dataset, UnitNumber, null as area, null as location, PM1 as pm1, PM2 as pm25, PM10 as pm10, TempDegC as temp, Humidity as humidity, Latitude, Longitude, ";
my $blueTimeCol = "lastsensingdate";
my $nswTimeCol = "SensingDate";
my $blueSQLTimeLatest = "strftime('%d-%m-%Y %H:%M:%S', MAX($blueTimeCol), 'localtime') as time";
my $nswSQLTimeLatest = "strftime('%d-%m-%Y %H:%M:%S', MAX($nswTimeCol), 'localtime') as time";
my $blueSQLTimeHistoric = "strftime('%d-%m-%Y %H:%M:%S', $blueTimeCol, 'localtime') as time";
my $nswSQLTimeHistoric = "strftime('%d-%m-%Y %H:%M:%S', $nswTimeCol, 'localtime') as time";

my $blueSQL = $blueSQLStart;
my $nswSQL = $nswSQLStart;
my $firstWhere = 1;

if ($historical == 1) {
    $blueSQL .= $blueSQLTimeHistoric;
    $nswSQL .= $nswSQLTimeHistoric;
} else {
    $blueSQL .= $blueSQLTimeLatest;
    $nswSQL .= $nswSQLTimeLatest;
}
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
    $blueSQL .= "datetime($blueTimeCol) >= datetime(\"now\", \"-$timeNum $timeType\")";
    $nswSQL .= "datetime($nswTimeCol) >= datetime(\"now\", \"-$timeNum $timeType\")";
} else {
    $blueSQL .= " GROUP BY UnitNumber";
    $nswSQL .= " GROUP BY UnitNumber";
}

# Check DB files exist
(-e $nswDb) or die "Cannot find DB: $nswDb\n";
(-e $blueDb) or die "Cannot find DB: $blueDb\n";

# Connect to DB
my $blueDsn = "DBI:SQLite:$blueDb";
my $nswDsn = "DBI:SQLite:$nswDb";
my %attr = (PrintError=>0, RaiseError=>1, AutoCommit=>1);

my $nswDbh = DBI->connect($nswDsn, \%attr) or die "Unable to connect to database $nswDb, Terminating\n";
my $blueDbh = DBI->connect($blueDsn, \%attr) or die "Unable to connect to database $blueDb, Terminating\n";

my $statement = $nswDbh->prepare($nswSQL);
$statement->execute();
while (my @row = $statement->fetchrow_array()) {
    my %rec = ();
    for (my $i=0; $i < (scalar @row); $i++) {
        $rec{$cols[$i]} = $row[$i];
    }
    push(@recs, \%rec);
}
$statement->finish;
$nswDbh->disconnect;
$statement = $blueDbh->prepare($blueSQL);
$statement->execute();
while (my @row = $statement->fetchrow_array()) {
    my %rec = ();
    for (my $i=0; $i < (scalar @row); $i++) {
        $rec{$cols[$i]} = $row[$i];
    }
    push(@recs, \%rec);
}
$statement->finish;
$blueDbh->disconnect;

my $json = JSON->new;
my $data = $json->encode(\@recs);
print CGI::header();
print $data;
