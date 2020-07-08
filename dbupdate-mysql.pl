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
my $debug = 0;
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
	my $sql = "SELECT * FROM kSensor WHERE UnitNumber=? AND lastdatecreated=?";
	my $statement = $dbh->prepare($sql);
	$statement->execute($rec->{"UnitNumber"}, $rec->{"lastdatecreated"});
	$statement->fetchrow_array();
	my $rows = $statement->rows;
	$statement->finish;
	if ($rows == 0) {
		# This is a new observation
			$sql = "INSERT INTO kSensor (BoardDateCreated, BoardID, BoardSerialNumber, CoModuleCalibration,
				CoModuleDateCreated, CoModuleID, CoModuleSerialNumber, Latitude, Longitude, PmModuleCalibration,
				PmModuleDateCreated, PmModuleID, PmModuleSerialNumber, UnitNumber, isPublic, lastbatteryvoltage,
				lastdatecreated, lastsensingdate, locationdescription, locationstring, pm1, pm10, pm25, showonmap)
				VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
			$statement = $dbh->prepare($sql);
			$statement->execute($rec->{"BoardDateCreated"}//0, $rec->{"BoardID"}//0, $rec->{"BoardSerialNumber"}//0,
				$rec->{"CoModuleCalibration"}//0, $rec->{"CoModuleDateCreated"}//0, $rec->{"CoModuleID"}//0, $rec->{"CoModuleSerialNumber"}//0,
				$rec->{"Latitude"}, $rec->{"Longitude"}, $rec->{"PmModuleCalibration"}//0, $rec->{"PmModuleDateCreated"}//0,
				$rec->{"PmModuleID"}//0, $rec->{"PmModuleSerialNumber"}//0, $rec->{"UnitNumber"}, $rec->{"isPublic"}//0,
				$rec->{"lastbatteryvoltage"}//0, $rec->{"lastdatecreated"}, $rec->{"lastsensingdate"}, $rec->{"locationdescription"}//0,
				$rec->{"locationstring"}//0, $rec->{"pm1"}, $rec->{"pm10"}, $rec->{"pm25"}, $rec->{"showonmap"}//0);
			$statement->finish;
	}
}
$dbh->disconnect;
