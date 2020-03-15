#!/usr/bin/perl

# Migrate DBs from old, wide to new, relational
# Script 3 of 3 - Remove the old data

use DBI;
use strict;
use warnings;

my $db1 = "koala.sqlite";
my $dsn = "DBI:SQLite:";
my %attr = (PrintError=>0, RaiseError=>1);

STDOUT->autoflush(1);

die "Database does not exist: $db1, Terminating\n" unless (-e $db1);

my $dbh = DBI->connect($dsn . $db1, \%attr) or die "Could not connect to database $db1\n";

print "Deleting old data model...\n";

my $sql = "DROP TABLE kSensor";
$dbh->do($sql) or die "Unable to drop tablekSensor\n";

$dbh->disconnect;
print "\nDone\n\n";
