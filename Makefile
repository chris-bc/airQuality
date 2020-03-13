deploy-local: all
	@sudo cp -r deploy/* /Library/WebServer/Documents/

deploy-remote: all
	@scp -r deploy chris@bennettscash.no-ip.org:~
	@ssh -t chris@bennettscash.no-ip.org sudo cp -r deploy/* /Library/WebServer/Documents/
	@ssh chris@bennettscash.no-ip.org rm -rf deploy

directory:
	@mkdir -p deploy

blueskies: directory blueskies.pl blueUtils.js skiesUtils.js blueskies-banner.jpg
	@cp -r blueskies-banner.jpg Chart* blueUtils.js bootstrap* markers skiesUtils.js deploy/
	@./apiKey blueskies.pl > deploy/blueskies.pl

ozskies: directory ozskies.pl ozUtils.js skiesUtils.js ozskies-banner.jpg
	@cp -r ozUtils.js ozskies-banner.jpg Chart* skiesUtils.js bootstrap* markers deploy/
	@./apiKey ozskies.pl > deploy/ozskies.pl

geoskies: directory geo*
	@cp -r Chart* bootstrap* markers skiesUtils.js geoData.pl geoUtils.js deploy/
	@./apiKey geoskies.html > deploy/geoskies.html

all: blueskies ozskies geoskies

deploy-koala-db-local: koala.sqlite
	@sudo cp koala.sqlite /Library/WebServer/Documents/

deploy-oz-db-local: nswskies.sqlite
	@sudo cp nswskies.sqlite /Library/WebServer/Documents/

clean:
	@rm -rf deploy
