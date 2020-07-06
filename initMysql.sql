create database if not exists sensors;
\u sensors
create table if not exists kMeta (
  UnitNumber VARCHAR(255),
  ValidFrom VARCHAR(32),
  ValidTo VARCHAR(32),
  BoardDateCreated VARCHAR(32),
  BoardID INT,
  BoardSerialNumber VARCHAR(32),
  CoModuleDateCreated VARCHAR(32),
  CoModuleID INT,
  CoModuleSerialNumber BIGINT,
  Latitude FLOAT,
  Longitude FLOAT,
  PmModuleDateCreated VARCHAR(32),
  PmModuleID INT,
  PmModuleSerialNumber VARCHAR(32),
  isPublic TINYINT,
  locationdescription VARCHAR(255),
  locationstring VARCHAR(255),
  showonmap TINYINT,
  PRIMARY KEY(UnitNumber, ValidFrom),
  INDEX kMetaUnit (UnitNumber),
  INDEX kMetaUnitTo (UnitNumber, ValidTo),
  INDEX kMetaUnitFromTo (UnitNumber, ValidFrom, ValidTo),
  INDEX kMetaDesc (locationdescription),
  INDEX kMetaStr (locationstring),
  INDEX kMetaStrDescUnit (locationstring, locationdescription, UnitNumber)
);

create table if not exists kObs (
  UnitNumber VARCHAR(255),
  CoModuleCalibration FLOAT,
  PmModuleCalibration FLOAT,
  lastbatteryvoltage FLOAT,
  lastdatecreated VARCHAR(32),
  lastsensingdate VARCHAR(32),
  pm1 SMALLINT,
  pm10 SMALLINT,
  pm25 SMALLINT,
  PRIMARY KEY (UnitNumber, lastdatecreated),
  INDEX kObsUnit (UnitNumber),
  INDEX kObsDate (lastdatecreated)
);

create or replace view kSensors as
  SELECT BoardDateCreated, BoardID, BoardSerialNumber,
    CoModuleCalibration, CoModuleDateCreated, CoModuleID,
    CoModuleSerialNumber, Latitude, Longitude,
    PmModuleCalibration, PmModuleDateCreated, PmModuleID,
    PmModuleSerialNumber, a.UnitNumber as UnitNumber, isPublic,
    lastbatteryvoltage, lastdatecreated, lastsensingdate,
    locationdescription, locationstring, pm1, pm10, pm25, showonmap
  FROM kMeta a, kObs b
  WHERE a.UnitNumber = b.UnitNumber AND
    b.lastdatecreated >= a.ValidFrom AND
    (b.lastdatecreated < a.ValidTo OR a.ValidTo is null);

create table if not exists nswSensor (
  UnitNumber VARCHAR(255),
  SensingDate VARCHAR(32),
  TempDegC FLOAT,
  Humidity FLOAT,
  Latitude FLOAT,
  Longitude FLOAT,
  PM1 SMALLINT,
  PM10 SMALLINT,
  PM2 SMALLINT,
  PRIMARY KEY (UnitNumber, SensingDate),
  INDEX nswUnit (UnitNumber),
  INDEX nswDate (SensingDate)
);
