#!/usr/local/bin/perl
use DBI;

$driver = "mysql";
$dsn = "DBI:$driver:database=sensors;host=127.0.0.1";
$dbh = DBI->connect($dsn, "root", "kitty234");

$sth = $dbh->prepare("SELECT foo, bar FROM test");
$sth->execute;

while (my $ref = $sth->fetchrow_hashref()) {
	print "$ref->{'foo'}   |   $ref->{'bar'}\n";
}

