#!/usr/bin/perl

# Migrate DBs from old, wide to new, relational
# Script 1 of 3 - This script creates new tables, view and indices

use DBI;
use strict;
use warnings;
use Data::Dumper;

my $db1 = "koala.sqlite";
my $dsn = "DBI:SQLite:";
my %attr = (PrintError=>0, RaiseError=>1);

STDOUT->autoflush(1);

die "Database does not exist: $db1, Terminating\n" unless (-e $db1);

my $dbh = DBI->connect($dsn . $db1, \%attr) or die "Could not connect to database $db1\n";

print "Creating new data model...\n";

# New tables
my $sql = "CREATE TABLE IF NOT EXISTS kMeta (
    	UnitNumber TEXT,
    	ValidFrom TEXT,
    	ValidTo TEXT,
    	BoardDateCreated TEXT,
	    BoardID INTEGER,
    	BoardSerialNumber INTEGER,
	    CoModuleDateCreated TEXT,
    	CoModuleID INTEGER,
	    CoModuleSerialNumber INTEGER,
    	Latitude REAL,
	    Longitude REAL,
    	PmModuleDateCreated TEXT,
	    PmModuleID INTEGER,
    	PmModuleSerialNumber TEXT,
	    isPublic INTEGER,
    	locationdescription TEXT,
	    locationstring TEXT,
    	showonmap INTEGER,
	    PRIMARY KEY(UnitNumber, ValidFrom))";
$dbh->do($sql) or die "Unable to create table kMeta\n";
print "   - kMeta\n";

$sql = "CREATE TABLE IF NOT EXISTS kObs (
		UnitNumber TEXT,
    	CoModuleCalibration REAL,
    	PmModuleCalibration REAL,
		lastbatteryvoltage REAL,
    	lastdatecreated TEXT,
    	lastsensingdate TEXT,
    	pm1 INTEGER,
    	pm10 INTEGER,
    	pm25 INTEGER,
     	PRIMARY KEY(UnitNumber, lastdatecreated))";
$dbh->do($sql) or die "Unable to create table kObs\n";
print "   - kObs\n";

$dbh->do("drop view if exists kSensors") or die "Unable to drop view kSensors\n";
$sql = "CREATE VIEW kSensors as
    SELECT BoardDateCreated, BoardID, BoardSerialNumber,
    	CoModuleCalibration, CoModuleDateCreated, CoModuleID,
        CoModuleSerialNumber, Latitude, Longitude,
        PmModuleCalibration, PmModuleDateCreated, PmModuleID,
        PmModuleSerialNumber, a.UnitNumber as UnitNumber, isPublic, lastbatteryvoltage,
        lastdatecreated, lastsensingdate, locationdescription,
        locationstring, pm1, pm10, pm25, showonmap FROM kMeta a, kObs b
    WHERE a.UnitNumber = b.UnitNumber AND 
		datetime(b.lastdatecreated) >= datetime(a.ValidFrom) AND
		(datetime(b.lastdatecreated) < datetime(a.ValidTo) OR a.ValidTo is null)";
$dbh->do($sql) or die "Unable to create view kSensors\n";
print "   - kSensors\n\n";

my @kMetaIndices = ("UnitNumber", "UnitNumber, ValidFrom", "UnitNumber, ValidTo",
                    "UnitNumber, ValidFrom, ValidTo", "locationdescription", "locationstring",
                    "locationstring, locationdescription, UnitNumber");
my @kObsIndices = ("UnitNumber", "lastdatecreated", "UnitNumber, lastdatecreated");
my @tables = ("kMeta", "kObs");
my @tableIndices = (\@kMetaIndices, \@kObsIndices);

for (my $i = 0; $i < (scalar @tables); $i++) {
    print "Creating indices on table " . $tables[$i] . "...\n";
	my $tblIdx = $tableIndices[$i];
    for (my $j = 0; $j < (scalar @$tblIdx); $j++) {
		print "   - " . $tables[$i] . "Idx$j: (" . @$tblIdx[$j] . ")\n";
        $sql = "CREATE INDEX " . $tables[$i] . "Idx$j on " . $tables[$i] . " (" . @$tblIdx[$j] . ")";
        $dbh->do($sql) or die "Error creating index\n";
    }
	print "\n";
}

$dbh->disconnect;
print "\nCompleted creating new data model\n\n";
