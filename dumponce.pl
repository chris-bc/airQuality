#!/usr/bin/perl

use CGI;
use strict;
use warnings;
use lib qw(..);
use JSON qw(  );
use HTTP::Tiny;

print CGI::header();

my $source = 'https://kv54llbbz6.execute-api.ap-southeast-2.amazonaws.com/NMEA_TESTBED/?boards=1';

# Get latest JSON
my $url = HTTP::Tiny->new->get($source);
#print "result\n$url->{'content'}\nend result\n";

# Store JSON in a JSON data var
my $json = JSON->new;
my $data = $json->decode($url->{'content'});

#print Dumper($data);

# Get a superset of keys
my @keys = ();
foreach my $rec (@{$data}) {
	push @keys, keys %{$rec};
}
my %uniqueKeys = map {$_, 1} @keys;
@keys = sort keys %uniqueKeys;

print "<html><head></head><body><h3>Sensor Data</h3><p><table border=1>";
print "<th>$_</th>" for @keys;

foreach my $rec ( @{$data} ) {
	print "<tr>";
	print "<td>".($rec->{$_}//"null")."</td>" for @keys;
	print "</tr>";
}
print "</table></body></html>"

