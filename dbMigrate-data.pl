#!/usr/local/bin/perl

# Migrate DBs from SQLite to mySQL
# Script assumes the existence of new data model - If kObs & kMeta are not present it will fail.

use DBI;
use strict;
use warnings;
use Data::Dumper;
use Math::Round;

my $sourceKoala = "koala.sqlite";
my $sourceNSW = "nswskies.sqlite";
my $sourceDsn = "DBI:SQLite:";
my %attr = (PrintError=>0, RaiseError=>1);
my $targetDsn = my $dsn = "DBI:mysql:database=sensors;host=127.0.0.1";
my $sql2;
my $stmt2;
my $metaRow;
my $rowCount;
my $obsCount = 0;
my $insertMeta;
my $debug = 0;
my $obsTotal;

STDOUT->autoflush(1);

die "Database does not exist: $sourceKoala, Terminating\n" unless (-e $sourceKoala);
die "Database does not exist: $sourceNSW, Terminating\n" unless (-e $sourceNSW);

my $sourceDbh = DBI->connect($sourceDsn . $sourceKoala, \%attr) or die "Could not connect to database $sourceKoala\n";
my $targetDbh = DBI->connect($targetDsn, "root", "kitty234") or die "Unable to connect to database $targetDsn\n";

# Find total row count
my $sql = "SELECT COUNT(1) from kSensor";
my $statement = $sourceDbh->prepare($sql);
$statement->execute();
while (my @row = $statement->fetchrow_array) {
  $obsTotal = $row[0];
}
$statement->finish;

$sql = "SELECT * FROM kSensor ORDER BY lastdatecreated";
my $currentDay = "";
$statement = $sourceDbh->prepare($sql);
$statement->execute();
while (my $row = $statement->fetchrow_hashref) {
    $obsCount++;
    print "\r" . round(($obsCount * 100 / $obsTotal)) . "% ($obsCount / $obsTotal) : Migrating KOALA " . substr($row->{"lastdatecreated"}, 0, 10);
    $insertMeta = 0;
    # Check whether metadata is identical
    $sql2 = "SELECT * FROM kMeta WHERE UnitNumber=? AND ValidTo is null";
    $stmt2 = $targetDbh->prepare($sql2);
    $stmt2->execute($row->{"UnitNumber"});
    $metaRow = $stmt2->fetchrow_hashref;
    $rowCount = $stmt2->rows;
    $stmt2->finish;
    if ($rowCount == 0) {
        # No current metadata for this unit)
        print "DEBUG: No metadata for unit " . $row->{"UnitNumber"} . "\n" if $debug == 1;
        $insertMeta = 1;
    } else {
        print "DEBUG: Metadata found for unit " . $row->{"UnitNumber"} . ", time " .
                $row->{"lastsensingdate"} . ", comparing...\n" if $debug == 1;
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
            print "DEBUG: Latest metadata DOES NOT MATCH current for unit " .
                    $row->{"UnitNumber"} . ", time " . $row->{"lastsensingdate"} .
                    "\n" if $debug == 1;
            # Expire the latest metadata for this observation
            $sql2 = "UPDATE kMeta SET ValidTo = '" . $row->{"lastdatecreated"} .
                    "' WHERE UnitNumber = ? AND ValidTo is null";
            $stmt2 = $targetDbh->prepare($sql2);
            $stmt2->execute($row->{"UnitNumber"});
            $stmt2->finish;
        }
    }
    if ($insertMeta == 1) {
        # Insert a new metadata row
        print "DEBUG: Writing new metadata for unit " . $row->{"UnitNumber"} . ", time " .
                $row->{"lastsensingdate"} . "\n" if $debug == 1;
        $sql2 = "INSERT INTO kMeta (ValidFrom, UnitNumber, BoardDateCreated, BoardID, BoardSerialNumber,
                CoModuleDateCreated, CoModuleID, CoModuleSerialNumber, Latitude, Longitude,
                PmModuleDateCreated, PmModuleID, PmModuleSerialNumber, isPublic, locationdescription,
                locationstring, showonmap)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt2 = $targetDbh->prepare($sql2);
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
    $stmt2 = $targetDbh->prepare($sql2);
    $stmt2->execute($row->{"UnitNumber"}, $row->{"CoModuleCalibration"}, $row->{"PmModuleCalibration"},
                    $row->{"lastbatteryvoltage"}, $row->{"lastdatecreated"}, $row->{"lastsensingdate"},
                    $row->{"pm1"}, $row->{"pm10"}, $row->{"pm25"});
    $stmt2->finish;
}
$sourceDbh->disconnect;

print "\n\nMigration of $sourceKoala complete\n\n";

$sourceDbh = DBI->connect($sourceDsn . $sourceNSW, \%attr) or die "Could not connect to database $sourceNSW\n";
$sql = "SELECT COUNT(1) FROM nswSensor";
$statement = $sourceDbh->prepare($sql);
$statement->execute();
while (my @row = $statement->fetchrow_array) {
  $obsTotal = $row[0];
}
$statement->finish;

$sql = "SELECT * FROM nswSensor ORDER BY SensingDate";
$statement = $sourceDbh->prepare($sql);
$statement->execute();
$obsCount = 0;
while (my $row = $statement->fetchrow_hashref) {
    $obsCount++;
    print("\r" . round(($obsCount * 100 / $obsTotal)) . "% ( $obsCount / $obsTotal ) : Migrating NSW " . substr($row->{"SensingDate"}, 0, 10));
    $sql2 = "INSERT INTO nswSensor (UnitNumber, SensingDate, TempDegC, Humidity, " .
      "Latitude, Longitude, PM1, PM10, PM2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $stmt2 = $targetDbh->prepare($sql2);
    $stmt2->execute($row->{"UnitNumber"}, $row->{"SensingDate"}, $row->{"TempDegC"},
      $row->{"Humidity"}, $row->{"Latitude"}, $row->{"Longitude"}, $row->{"PM1"},
      $row->{"PM10"}, $row->{"PM2"});
    $stmt2->finish;
}
$sourceDbh->disconnect;
$targetDbh->disconnect;
print "\n\nMigration complete\n\n";
