#!/usr/bin/perl

use DBI;
use strict;
use warnings;
use lib qw(..);
use JSON qw(  );
use HTTP::Tiny;

my $source = 'https://kv54llbbz6.execute-api.ap-southeast-2.amazonaws.com/NMEA_TESTBED/?boards=1';
my $dbFile = "koala.sqlite";
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
	my $ddl = "CREATE TABLE kSensor (
		BoardDateCreated TEXT,
		BoardID INTEGER,
		BoardSerialNumber INTEGER,
		CoModuleCalibration REAL,
		CoModuleDateCreated TEXT,
		CoModuleID INTEGER,
		CoModuleSerialNumber INTEGER,
		Latitude REAL,
		Longitude REAL,
		PmModuleCalibration REAL,
		PmModuleDateCreated TEXT,
		PmModuleID INTEGER,
		PmModuleSerialNumber TEXT,
		UnitNumber TEXT,
		isPublic INTEGER,
		lastbatteryvoltage REAL,
		lastdatecreated TEXT,
		lastsensingdate TEXT,
		locationdescription TEXT,
		locationstring TEXT,
		pm1 INTEGER,
		pm10 INTEGER,
		pm25 INTEGER,
		showonmap INTEGER,
		PRIMARY KEY(UnitNumber, lastsensingdate)
	)";
	$dbh->do($ddl);
	# TODO: Check success
}

foreach my $rec ( @{$data} ) {
	#print "key: $_ value: ".($rec->{$_}//"null")."\n" for keys $rec;
	# Check whether the row exists in the DB
	my $sql = "SELECT * FROM kSensor WHERE UnitNumber=? AND lastsensingdate=?";
	my $statement = $dbh->prepare($sql);
	$statement->execute($rec->{"UnitNumber"}, $rec->{"lastsensingdate"});
	$statement->fetchrow_array();
	if ($statement->rows == 0) {
		# Insert new observation
		# TODO: Be more clever to avoid SQL injection
		$sql = "INSERT INTO kSensor (";
		my $first=1;
		for (@keys) {
			$sql .= "," unless ($first == 1);
			$first = 0;
			$sql .= $_;
		}
		$sql .= ") VALUES (";
		$first = 1;
		for (@keys) {
			$sql .= "," unless ($first == 1);
			$first = 0;
			$sql .= "'".($rec->{$_}//0)."'";
		}
		$sql .= ")";
		$dbh->do($sql);
		# TODO: Check success
	} 
	$statement->finish;
}
$dbh->disconnect;

