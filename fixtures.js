const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const writeJsonFile = require('write-json-file');
const request = require('request');
const cheerio = require('cheerio');
const MongoClient = require('mongodb').MongoClient;

const url = "mongodb://paulfitz:123456789a@ds016098.mlab.com:16098/world-cup";

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Connected to Database!");
    // print database name
    console.log("db object points to the database : "+ db.databaseName);
    // delete the database
    db.dropDatabase(function(err, result){
        if (err) throw err;
        console.log("Operation Success ? " + result);
        // after all the operations with db, close it.
        db.close();
    });
});

let SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
let TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';


// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content), getFixtures);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  let clientSecret = credentials.installed.client_secret;
  let clientId = credentials.installed.client_id;
  let redirectUrl = credentials.installed.redirect_uris[0];
  let auth = new googleAuth();
  let oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  let authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function getFixtures(auth) {
  let calendar = google.calendar('v3');
  calendar.events.list({
    auth: auth,
    calendarId: 'tl4njqffodltemv385vnifrjadm345g2@import.calendar.google.com',
    timeMin: (new Date('2018/06/12')).toISOString(),
    maxResults: 2500,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {

    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }

    console.log('Fixtures retrieved.... 🌍');

    const fixtures = response.items;
  
    fixtures.forEach((f, i) => {
      let group = f.summary.replace( /(^.*\[|\].*$)/g, '' );
      let fixture = f.summary.replace(/(\[).+?(\])/g, '').replace('-' , 'v');
      let kickOffTime = f.start.dateTime;

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        const fixtureObj = {
          group,
          fixture,
          kickOffTime
        };

        db.collection('fixtures').insertOne(fixtureObj, function(err, res) {
          if (err) throw err;
          console.log("document inserted 😎");
          db.close();
        });
      });
    });
  });
}
