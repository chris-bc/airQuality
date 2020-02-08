#!/usr/bin/perl

use Data::Dumper;
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

#print Dumper($data);

# Set up DB
$dbh->do('PRAGMA foreign_keys = ON');
$dbh->do('PRAGMA foreign_keys');

# Creat table if not exists
if ($newDB) {
	print "Create table";
} else {
	print "DB already exists, skipping table creation";
}

foreach my $rec ( @{$data} ) {
	print "key: $_ value: ".($rec->{$_}//"null")."\n" for keys $rec;
}

