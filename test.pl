#!/usr/bin/perl

use Data::Dumper;
use strict;
use warnings;

my @t1 = ("foo","bar");
my @t2 = ("baz","bat");
my %h1 = ("one"=>"zed", "two"=>@t1,"three"=>@t2);
my %h2;
$h2{"one"} = "two";
$h2{"two"} = @t1;
$h2{"three"} = @t2;
print Dumper(%h2)."\n";

