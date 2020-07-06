copy-local:
	@sudo cp -r deploy/* /Library/WebServer/Documents/

copy-remote:
	@scp -r deploy chris@bennettscash.no-ip.org:~
	@ssh -t chris@bennettscash.no-ip.org sudo cp -r deploy/* /Library/WebServer/Documents/
	@ssh chris@bennettscash.no-ip.org rm -rf deploy

deploy-local: all copy-local

deploy-remote: all copy-remote

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

all: clean blueskies ozskies geoskies

deploy-koala-db-local: koala.sqlite
	@sudo cp koala.sqlite /Library/WebServer/Documents/

deploy-oz-db-local: nswskies.sqlite
	@sudo cp nswskies.sqlite /Library/WebServer/Documents/

dbmigration: clean directory
	@cp dbMigrate-tables.pl dbMigrate-data.pl deploy/

dbmigration-local: dbmigration copy-local
	@cd /Library/WebServer/Documents && pwd && sudo ./dbMigrate-tables.pl && sudo ./dbMigrate-data.pl && sudo mv koala.sqlite koala.sqlite.bak && sudo mv koalav2.sqlite koala.sqlite

dbmigration-remote: dbmigration copy-remote
	@ssh -t chris@bennettscash.no-ip.org cd /Library/WebServer/Documents && sudo ./dbMigrate-tables.pl && sudo ./dbMigrate-data.pl && sudo mv koala.sqlite koala.sqlite.bak && sudo mv koalav2.sqlite koala.sqlite

dbutils: clean directory
	@cp dbupdate.pl deploy/

dbutils-local: dbutils copy-local

dbutils-remote: dbutils copy-remote

clean:
	@rm -rf deploy
