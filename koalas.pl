#!/usr/bin/perl

use CGI;
use DBI;
use strict;
use warnings;
use lib qw(..);

print CGI::header();

my $dbFile = "koala.sqlite";
my $dbTable = "kSensor";
my $dsn = "DBI:SQLite:$dbFile";
my %attr = (PrintError=>0, RaiseError=>1, AutoCommit=>1, FetchHashKeyName=>'NAME_lc');

my $cgi = CGI->new();
my $selectColumns = ($cgi->param('cols')//"UnitNumber,locationdescription,lastsensingdate,pm1,pm10,pm25,Longitude,Latitude");
my $sortColumns = ($cgi->param('sort')//"UnitNumber,lastsensingdate DESC");

my @columnsToShow = split ',', $selectColumns;
my @sortColumns = split ',', $sortColumns;

# Does the DB exist?
(-e $dbFile) or die "Cannot find database $dbFile, Terminating\n\n";
# Connect
my $dbh = DBI->connect($dsn, \%attr);
#TODO Check opened successfully

# Get a list of columns to use later
my @keys = ();
my $sql = "PRAGMA table_info($dbTable)";
my $statement = $dbh->prepare($sql);
$statement->execute();
while (my @data = $statement->fetchrow_array()) {
	push(@keys, $data[1]);
}
($statement->rows > 0) or die "Unable to find any database columns\n\n";
@keys = sort @keys;
$statement->finish;

print "<html><head></head><body><h3>Sensor Data</h3><p><table border=1>";
print "<th>$_</th>" for @columnsToShow;

$sql = "SELECT $selectColumns FROM $dbTable ORDER BY $sortColumns";
$statement = $dbh->prepare($sql);
$statement->execute();

while (my $row = $statement->fetchrow_hashref) {
	print "<tr>";
	print "<td>".($row->{$_}//"null")."</td>" for @columnsToShow;
	print "</tr>";
}
$statement->finish;
print "</table></body></html>";
$dbh->disconnect;

