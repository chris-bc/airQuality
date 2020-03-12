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

die "Database does not exist: $db1, Terminating\n" unless (-e $db1);

my $dbh = DBI->connect($dsn . $db1, \%attr) or die "Could not connect to database $db1\n";
my $sql = "SELECT * FROM kSensor ORDER BY lastsensingdate";
my $statement = $dbh->prepare($sql);
$statement->execute();
while (my $row = $statement->fetchrow_hashref) {
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
            $sql2 = "UPDATE kMeta SET ValidTo = datetime('" . $row->{"lastsensingdate"};
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt2 = $dbh->prepare($sql2);
        $stmt2->execute($row->{"lastsensingdate"}, $row->{"UnitNumber"}, $row->{"BoardDateCreated"},
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
