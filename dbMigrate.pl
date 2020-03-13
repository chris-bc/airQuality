#!/usr/bin/perl

# Migrate DBs from old, wide to new, relational

use DBI;
use strict;
use warnings;
use Data::Dumper;

my $db1 = "koala.sqlite";
my $dsn = "DBI:SQLite:";
my %attr = (PrintError=>0, RaiseError=>1);
my $sql2;
my $stmt2;
my $metaRow;
my $rowCount;
my $insertMeta;
my $debug = 0;

STDOUT->autoflush(1);

die "Database does not exist: $db1, Terminating\n" unless (-e $db1);

my $dbh = DBI->connect($dsn . $db1, \%attr) or die "Could not connect to database $db1\n";

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

$sql = "SELECT * FROM kSensor ORDER BY lastdatecreated";
my $currentDay = "";
my $statement = $dbh->prepare($sql);
$statement->execute();
while (my $row = $statement->fetchrow_hashref) {
    if ($currentDay ne substr($row->{"lastdatecreated"}, 0, 10)) {
        $currentDay = substr($row->{"lastdatecreated"}, 0, 10);
        print "\nMigrating date $currentDay";
    } else {
        print ".";
    }
    $insertMeta = 0;
    # Check whether metadata is identical
    $sql2 = "SELECT * FROM kMeta WHERE UnitNumber=? AND ValidTo is null";
    $stmt2 = $dbh->prepare($sql2);
    $stmt2->execute($row->{"UnitNumber"});
    $metaRow = $stmt2->fetchrow_hashref;
    $rowCount = $stmt2->rows;
    $stmt2->finish;
    if ($rowCount == 0) {
        # No current metadata for this unit)
        print "DEBUG: No metadata for unit " . $row->{"UnitNumber"} . "\n" if $debug == 1;
        $insertMeta = 1;
    } else {
        print "DEBUG: Metadata found for unit " . $row->{"UnitNumber"} . ", time " . $row->{"lastsensingdate"} . ", comparing...\n" if $debug == 1;
        # Does the existing metadata match this row?
        unless ($row->{"BoardDateCreated"} eq $metaRow->{"BoardDateCreated"} &&
				$row->{"BoardID"} eq $metaRow->{"BoardID"} &&
				$row->{"BoardSerialNumber"} eq $metaRow->{"BoardSerialNumber"} &&
				$row->{"CoModuleDateCreated"} eq $metaRow->{"CoModuleDateCreated"} &&
				$row->{"CoModuleID"} eq $metaRow->{"CoModuleID"} &&
				$row->{"CoModuleSerialNumber"} eq $metaRow->{"CoModuleSerialNumber"} &&
				$row->{"Latitude"} eq $metaRow->{"Latitude"} &&
				$row->{"Longitude"} eq $metaRow->{"Longitude"} &&
				$row->{"PmModuleDateCreated"} eq $metaRow->{"PmModuleDateCreated"} &&
				$row->{"PmModuleID"} eq $metaRow->{"PmModuleID"} &&
				$row->{"PmModuleSerialNumber"} eq $metaRow->{"PmModuleSerialNumber"} &&
				$row->{"isPublic"} eq $metaRow->{"isPublic"} &&
				$row->{"locationdescription"} eq $metaRow->{"locationdescription"} &&
				$row->{"locationstring"} eq $metaRow->{"locationstring"} &&
				$row->{"showonmap"} eq $metaRow->{"showonmap"}) {
            $insertMeta = 1;
            print "DEBUG: Latest metadata DOES NOT MATCH current for unit " . $row->{"UnitNumber"} . ", time " . $row->{"lastsensingdate"} . "\n" if $debug == 1;
            # Expire the latest metadata for this observation
            $sql2 = "UPDATE kMeta SET ValidTo = datetime('" . $row->{"lastdatecreated"};
            $sql2 .= "', '-1 second') WHERE UnitNumber = ? AND ValidTo is null";
            $stmt2 = $dbh->prepare($sql2);
            $stmt2->execute($row->{"UnitNumber"});
            $stmt2->finish;
        }
    }
    if ($insertMeta == 1) {
        # Insert a new metadata row
        print "DEBUG: Writing new metadata for unit " . $row->{"UnitNumber"} . ", time " . $row->{"lastsensingdate"} . "\n" if $debug == 1;
        $sql2 = "INSERT INTO kMeta (ValidFrom, UnitNumber, BoardDateCreated, BoardID, BoardSerialNumber,
                CoModuleDateCreated, CoModuleID, CoModuleSerialNumber, Latitude, Longitude,
                PmModuleDateCreated, PmModuleID, PmModuleSerialNumber, isPublic, locationdescription,
                locationstring, showonmap)
                VALUES (datetime(?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt2 = $dbh->prepare($sql2);
        $stmt2->execute($row->{"lastdatecreated"}, $row->{"UnitNumber"}, $row->{"BoardDateCreated"},
                        $row->{"BoardID"}, $row->{"BoardSerialNumber"}, $row->{"CoModuleDateCreated"},
                        $row->{"CoModuleID"}, $row->{"CoModuleSerialNumber"}, $row->{"Latitude"}, $row->{"Longitude"},
                        $row->{"PmModuleDateCreated"}, $row->{"PmModuleID"}, $row->{"PmModuleSerialNumber"},
                        $row->{"isPublic"}, $row->{"locationdescription"}, $row->{"locationstring"}, $row->{"showonmap"});
        $stmt2->finish;
    }

    # Insert observation
    $sql2 = "INSERT INTO kObs (UnitNumber, CoModuleCalibration, PmModuleCalibration, lastbatteryvoltage,
            lastdatecreated, lastsensingdate, pm1, pm10, pm25) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt2 = $dbh->prepare($sql2);
    $stmt2->execute($row->{"UnitNumber"}, $row->{"CoModuleCalibration"}, $row->{"PmModuleCalibration"},
                    $row->{"lastbatteryvoltage"}, $row->{"lastdatecreated"}, $row->{"lastsensingdate"},
                    $row->{"pm1"}, $row->{"pm10"}, $row->{"pm25"});
    $stmt2->finish;
}
$dbh->disconnect;
print "\n\nMigration complete\n\n";
