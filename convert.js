const fs = require('fs');
const path = require('path');
const builder = require('xmlbuilder');

// Parse command line arguments
const args = process.argv.slice(2);
const inputFlagIndex = args.indexOf('-input');
const inputFilePath = args[inputFlagIndex + 1];

if (inputFlagIndex === -1 || !inputFilePath) {
  console.error('Please provide an input file path using the -input flag.');
  process.exit(1);
}

// Load JSON data from file
fs.readFile(inputFilePath, 'utf8', (err, jsonString) => {
  if (err) {
    console.error('Error reading input JSON file:', err);
    process.exit(1);
  }

  const jsonData = JSON.parse(jsonString);
  // Combine locationData with the last known heart rate
  const combinedData = jsonData.locationData.map((locData) => {
    const lastHrData = jsonData.heartrateData
      .filter((hrData) => hrData.timestamp <= locData.timestamp)
      .pop();

    if (lastHrData) {
      return {
        timestamp: new Date(locData.timestamp).toISOString(),
        heartrate: lastHrData.heartrate,
        long: locData.long,
        lat: locData.lat,
        altitude: locData.altitude,
        accuracy: locData.accuracy,
      };
    } else {
      return null;
    }
  });

  // Create the GPX file structure
  const gpx = builder.create('gpx', { version: '1.0', encoding: 'UTF-8' })
    .att('creator', 'FestinaFitness2GPX')
    .att('version', '1.1')
    .att('xmlns', 'http://www.topografix.com/GPX/1/1')
    .att('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
    .att('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd')
    .att('xmlns:gpxtpx', 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1')
    .att('xmlns:gpxx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3')
    .ele('metadata')
    .ele('time', {}, combinedData[0].timestamp)
    .up()
    .up()
    .ele('trk')
    // .ele('name', {}, 'Afternoon Run')
    .up()
    .ele('type', {}, 9)
    .up()
    .ele('trkseg');

  // Append trackpoints to the GPX structure
  combinedData.forEach((data) => {
    gpx.ele('trkpt', { lat: data.lat, lon: data.long })
      .ele('ele', {}, data.altitude)
      .up()
      .ele('time', {}, data.timestamp)
      .up()
      .ele('extensions')
      .ele('gpxtpx:TrackPointExtension')
      .ele('gpxtpx:hr', {}, data.heartrate)
      .up()
      .up()
      .up();
  });

  // Serialize the GPX structure to a string
  const gpxString = gpx.end({ pretty: true });

  // Determine the output file path
  const outputFilePath = path.join(
    path.dirname(inputFilePath),
    path.basename(inputFilePath, path.extname(inputFilePath)) + '.gpx'
  );

  // Save the GPX string to a file
  fs.writeFile(outputFilePath, gpxString, (err) => {
    if (err) {
      console.error('Error writing GPX file:', err);
    } else {
      console.log('GPX file has been created:', outputFilePath);
    }
  });
});
