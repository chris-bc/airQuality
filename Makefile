directory:
	mkdir deploy
blueskies: directory
	cp -r blueskies* Chart* addRemove.js apiKey.pl bootstrap* markers skiesUtils.js deploy/

ozskies: directory
	cp -r nswUtils.js nswskies-banner.jpg Chart* ozskies.pl skiesUtils.js apiKey.pl bootstrap* markers deploy/

all: blueskies ozskies

clean:
	rm -rf deploy/*
	rmdir deploy

