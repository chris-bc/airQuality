deploy-local: all
	@sudo cp -r deploy/* /Library/WebServer/Documents/

deploy-remote: all
	@scp -r deploy chris@bennettscash.no-ip.org:~
	@ssh -t chris@bennettscash.no-ip.org sudo cp -r deploy/* /Library/WebServer/Documents/
	@ssh chris@bennettscash.no-ip.org rm -rf deploy

directory:
	@mkdir -p deploy

blueskies: directory blueskies.pl addRemove.js skiesUtils.js blueskies-banner.jpg
	@cp -r blueskies* Chart* addRemove.js apiKey.pl bootstrap* markers skiesUtils.js deploy/

ozskies: directory ozskies.pl nswUtils.js skiesUtils.js nswskies-banner.jpg
	@cp -r nswUtils.js nswskies-banner.jpg Chart* ozskies.pl skiesUtils.js apiKey.pl bootstrap* markers deploy/

all: blueskies ozskies

clean:
	@rm -rf deploy
