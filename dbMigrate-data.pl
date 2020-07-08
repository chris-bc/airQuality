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
    $sql2 = "SELECT * FROM kSensor WHERE UnitNumber=? AND lastdatecreated=?";
    $stmt2 = $targetDbh->prepare($sql2);
    $stmt2->execute($row->{"UnitNumber"}, $row->{"lastdatecreated"});
    $metaRow = $stmt2->fetchrow_hashref;
    $rowCount = $stmt2->rows;
    $stmt2->finish;
    if ($rowCount == 0) {
      # No current observation for this unit
      $sql2 = "INSERT INTO kSensor (BoardDateCreated, BoardID, BoardSerialNumber, CoModuleCalibration,
        CoModuleDateCreated, CoModuleID, CoModuleSerialNumber, Latitude, Longitude, PmModuleCalibration,
        PmModuleDateCreated, PmModuleID, PmModuleSerialNumber, UnitNumber, isPublic, lastbatteryvoltage,
        lastdatecreated, lastsensingdate, locationdescription, locationstring, pm1, pm10, pm25, showonmap)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      $stmt2 = $targetDbh->prepare($sql2);
      $stmt2->execute($row->{"BoardDateCreated"}//0, $row->{"BoardID"}//0, $row->{"BoardSerialNumber"}//0,
        $row->{"CoModuleCalibration"}//0, $row->{"CoModuleDateCreated"}//0, $row->{"CoModuleID"}//0, $row->{"CoModuleSerialNumber"}//0,
        $row->{"Latitude"}, $row->{"Longitude"}, $row->{"PmModuleCalibration"}//0, $row->{"PmModuleDateCreated"}//0,
        $row->{"PmModuleID"}//0, $row->{"PmModuleSerialNumber"}//0, $row->{"UnitNumber"}, $row->{"isPublic"}//0,
        $row->{"lastbatteryvoltage"}//0, $row->{"lastdatecreated"}, $row->{"lastsensingdate"}, $row->{"locationdescription"}//0,
        $row->{"locationstring"}//0, $row->{"pm1"}, $row->{"pm10"}, $row->{"pm25"}, $row->{"showonmap"}//0);
      $stmt2->finish;
    }
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
