deploy-local: all
	sudo cp -r deploy/* /Library/WebServer/Documents/

deploy-remote: all
	scp -r deploy chris@192.168.1.4:~
	ssh -t chris@192.168.1.4 sudo cp -r deploy/* /Library/WebServer/Documents/
	ssh chris@192.168.1.4 rm -rf deploy

directory:
	mkdir -p deploy

blueskies: directory
	cp -r blueskies* Chart* addRemove.js apiKey.pl bootstrap* markers skiesUtils.js deploy/

ozskies: directory
	cp -r nswUtils.js nswskies-banner.jpg Chart* ozskies.pl skiesUtils.js apiKey.pl bootstrap* markers deploy/

all: blueskies ozskies

clean:
	rm -rf deploy