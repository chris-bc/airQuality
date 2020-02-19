#!/usr/bin/perl

# This script pulls the latest observations from KOALA-based sensors
# and stores new observations in an SQLite database.
# This script should be scheduled to run regularly as sensors do not
# send new observations on a predictable schedule.
# New observations are identified by treating (UnitNumber, lastsensingdate)
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

my $source = 'https://kv54llbbz6.execute-api.ap-southeast-2.amazonaws.com/NMEA_TESTBED';
my $dbFile = "nswskies.sqlite";
my $dsn = "DBI:SQLite:$dbFile";
my %attr = (PrintError=>0, RaiseError=>1);
# Do we need to create the DB tables?
my $newDB = (not -e $dbFile);
#Connect to DB
my $dbh = DBI->connect($dsn, \%attr);
#TODO Check opened successfully

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

# Set up DB
$dbh->do('PRAGMA foreign_keys = ON');
$dbh->do('PRAGMA foreign_keys');

# Creat table if not exists
if ($newDB) {
	# Create table
	my $ddl = "CREATE TABLE nswSensor (
		UnitNumber TEXT,
		SensingDate TEXT,
		TempDegC REAL,
		Humidity REAL,
		Latitude REAL,
		Longitude REAL,
		PM1 INTEGER,
		PM10 INTEGER,
		PM2 INTEGER,
		PRIMARY KEY(UnitNumber, sensingdate)
	)";
	$dbh->do($ddl);
	# TODO: Check success
}

foreach my $rec ( @{$data} ) {
	#print "key: $_ value: ".($rec->{$_}//"null")."\n" for keys $rec;
	# Check whether the row exists in the DB
	my $sql = "SELECT * FROM nswSensor WHERE UnitNumber=? AND SensingDate=?";
	my $statement = $dbh->prepare($sql);
	$statement->execute($rec->{"UnitNumber"}, $rec->{"SensingDate"});
	$statement->fetchrow_array();
	if ($statement->rows == 0) {
		# Insert new observation
		# TODO: Be more clever to avoid SQL injection
		$sql = "INSERT INTO nswSensor (UnitNumber,SensingDate,TempDegC,Humidity,Latitude,Longitude,PM1,PM10,PM2) VALUES (?,?,?,?,?,?,?,?,?)";
		my $ins = $dbh->prepare($sql);
		$ins->execute($rec->{"UnitNumber"}, $rec->{"SensingDate"}, $rec->{"TempDegC"}, $rec->{"Humidity"}, $rec->{"Latitude"}, $rec->{"Longitude"}, $rec->{"PM1.0"}, $rec->{"PM10.0"}, $rec->{"PM2.5"});
		$ins->finish;
		# TODO: Check success
	} 
	$statement->finish;
}
$dbh->disconnect;
