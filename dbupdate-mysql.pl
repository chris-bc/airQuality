#!/usr/local/bin/perl

# This script pulls the latest observations from KOALA-based sensors
# and stores new observations in an SQLite database.
# This script should be scheduled to run regularly as sensors do not
# send new observations on a predictable schedule.
# New observations are identified by treating (UnitNumber, lastdatecreated)
# as a aunique identifier. This appears to be an appropriate assumption.
#
# To schedule this job on any Unix-like system run the following:
# crontab -e
# */10 * * * * /path/to/dbupdate.pl
#

use DBI;
use strict;
use warnings;
use lib qw(..);
use JSON qw(  );
use HTTP::Tiny;
use Data::Dumper;

my $source = 'https://kv54llbbz6.execute-api.ap-southeast-2.amazonaws.com/NMEA_TESTBED/?boards=1';
my $driver = "mysql";
my $dsn = "DBI:$driver:database=sensors;host=127.0.0.1";
my $debug = 1;
#Connect to DB
my $dbh = DBI->connect($dsn, "root", "kitty234") or die "Unable to connect to database $dsn\n";

# Get latest JSON
my $url = HTTP::Tiny->new->get($source);
#print "result\n$url->{'content'}\nend result\n";

# Store JSON in a JSON data var
my $json = JSON->new;
my $data = $json->decode($url->{'content'});

# Get a list of all keys
my @keys = ();
foreach my $rec (@{$data}) {
	push @keys, keys %{$rec};
}
my %uniqueKeys = map {$_, 1} @keys;
@keys = sort keys %uniqueKeys;

foreach my $rec ( @{$data} ) {
	#print "key: $_ value: ".($rec->{$_}//"null")."\n" for keys $rec;
	# Check whether the row exists in the DB
	my $sql = "SELECT * FROM kObs WHERE UnitNumber=? AND lastdatecreated=?";
	my $statement = $dbh->prepare($sql);
	$statement->execute($rec->{"UnitNumber"}, $rec->{"lastdatecreated"});
	$statement->fetchrow_array();
	my $rows = $statement->rows;
	$statement->finish;
	if ($rows == 0) {
		# This is a new observation
		# TODO: Be more clever to avoid SQL injection
		# Have slowly-moving items changed?
		$sql = "SELECT * FROM kMeta WHERE UnitNumber=? AND ValidTo is null";
		$statement = $dbh->prepare($sql);
		$statement->execute($rec->{"UnitNumber"});
		my $row = $statement->fetchrow_hashref();
		$rows = $statement->rows;
		$statement->finish;
		my $insertMetadata = 0;
		if ($rows > 0) {
			# Compare current metadata against stored metadata
			print "DEBUG: Metadata found for Unit ".$rec->{"UnitNumber"}.", isPublic " .
					($rec->{"isPublic"}//"0") . ", row " . $row->{"isPublic"} . "\n" if ($debug == 1);
			unless ($row->{"BoardDateCreated"} eq ($rec->{"BoardDateCreated"}//0) &&
					$row->{"BoardID"} eq ($rec->{"BoardID"}//0) &&
					$row->{"BoardSerialNumber"} eq ($rec->{"BoardSerialNumber"}//0) &&
					$row->{"CoModuleDateCreated"} eq ($rec->{"CoModuleDateCreated"}//0) &&
					$row->{"CoModuleID"} eq ($rec->{"CoModuleID"}//0) &&
					$row->{"CoModuleSerialNumber"} eq ($rec->{"CoModuleSerialNumber"}//0) &&
					$row->{"Latitude"} eq ($rec->{"Latitude"}) &&
					$row->{"Longitude"} eq ($rec->{"Longitude"}) &&
					$row->{"PmModuleDateCreated"} eq ($rec->{"PmModuleDateCreated"}//0) &&
					$row->{"PmModuleID"} eq ($rec->{"PmModuleID"}//0) &&
					$row->{"PmModuleSerialNumber"} eq ($rec->{"PmModuleSerialNumber"}//0) &&
					$row->{"isPublic"} eq ($rec->{"isPublic"}//0) &&
					$row->{"locationdescription"} eq ($rec->{"locationdescription"}//0) &&
					$row->{"locationstring"} eq ($rec->{"locationstring"}//0) &&
					$row->{"showonmap"} eq ($rec->{"showonmap"}//0)) {
				# There is a difference between latest metadata and current observation
				print "change to metadata\nOld\n".Dumper($rec)."\n\nNew\n".Dumper($row)."\n\n" if ($debug == 1);
				$sql = "UPDATE kMeta set ValidTo='" . $rec->{"lastdatecreated"} . "' WHERE UnitNumber=? AND ValidTo is null";
				$statement = $dbh->prepare($sql);
				$statement->execute($rec->{"UnitNumber"});
				$statement->finish;
				# Set flag to insert metadata later
				$insertMetadata = 1;
			}
		} else {
			# No metadata - This is a new unit
			print "DEBUG: No metadata found - new unit " . $rec->{"UnitNumber"} . "\n" if ($debug == 1);
			$insertMetadata = 1;
		}
		# Insert new metadata if needed
		if ($insertMetadata == 1) {
			$sql = "INSERT INTO kMeta(ValidFrom, UnitNumber, BoardDateCreated, BoardID, BoardSerialNumber,
					CoModuleDateCreated, CoModuleID, CoModuleSerialNumber, Latitude, Longitude, PmModuleDateCreated,
					PmModuleID, PmModuleSerialNumber, isPublic, locationdescription, locationstring, showonmap)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
			$statement = $dbh->prepare($sql);
			$statement->execute($rec->{"lastdatecreated"}, $rec->{"UnitNumber"}, $rec->{"BoardDateCreated"}//0, $rec->{"BoardID"}//0,
								$rec->{"BoardSerialNumber"}//0, $rec->{"CoModuleDateCreated"}//0, $rec->{"CoModuleID"}//0,
								$rec->{"CoModuleSerialNumber"}//0, $rec->{"Latitude"}, $rec->{"Longitude"},
								$rec->{"PmModuleDateCreated"}//0, $rec->{"PmModuleID"}//0, $rec->{"PmModuleSerialNumber"}//0,
								$rec->{"isPublic"}//0, $rec->{"locationdescription"}//0, $rec->{"locationstring"}//0,
								$rec->{"showonmap"}//0);
			$statement->finish;
		}

		# Insert new observation
		print "DEBUG: New observation for unit " . $rec->{"UnitNumber"} . ", time " .
				$rec->{"lastsensingdate"} . "\n" if ($debug == 1);
		$sql = "INSERT INTO kObs (UnitNumber, CoModuleCalibration, PmModuleCalibration, lastbatteryvoltage,
				lastdatecreated, lastsensingdate, pm1, pm10, pm25) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
		$statement = $dbh->prepare($sql);
		$statement->execute($rec->{"UnitNumber"}, $rec->{"CoModuleCalibration"}//0, $rec->{"PmModuleCalibration"}//0,
							$rec->{"lastbatteryvoltage"}//0, $rec->{"lastdatecreated"}, $rec->{"lastsensingdate"},
							$rec->{"pm1"}, $rec->{"pm10"}, $rec->{"pm10"});
		$statement->finish;
	}
}
$dbh->disconnect;
