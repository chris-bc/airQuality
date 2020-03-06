deploy-local: all
	@sudo cp -r deploy/* /Library/WebServer/Documents/

deploy-remote: all
	@scp -r deploy chris@bennettscash.no-ip.org:~
	@ssh -t chris@bennettscash.no-ip.org sudo cp -r deploy/* /Library/WebServer/Documents/
	@ssh chris@bennettscash.no-ip.org rm -rf deploy

directory:
	@mkdir -p deploy

blueskies: directory blueskies.pl blueUtils.js skiesUtils.js blueskies-banner.jpg
	@cp -r blueskies* Chart* blueUtils.js apiKey.pl bootstrap* markers skiesUtils.js deploy/

ozskies: directory ozskies.pl nswUtils.js skiesUtils.js nswskies-banner.jpg
	@cp -r nswUtils.js nswskies-banner.jpg Chart* ozskies.pl skiesUtils.js apiKey.pl bootstrap* markers deploy/

geoskies: directory geo*
	@cp -r Chart* bootstrap* markers apiKey.pl skiesUtils.js geoData.pl geoUtils.js deploy/
	@./apiKey geoskies.html > deploy/geoskies.html

all: blueskies ozskies geoskies

clean:
	@rm -rf deploy
