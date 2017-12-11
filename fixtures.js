let fs = require('fs');
let readline = require('readline');
let google = require('googleapis');
let googleAuth = require('google-auth-library');
let writeJsonFile = require('write-json-file');
var imageChecker  = require('./imageChecker');

var MongoClient = require('mongodb').MongoClient;
// var url = "mongodb://localhost:27017/premier_league"; // premier league is the name of db
var url = "mongodb://paulfitz:123456789@ds135866.mlab.com:35866/premier-league";

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/calendar-nodejs-quickstart.json
let SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];
let TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
let TOKEN_PATH = TOKEN_DIR + 'calendar-nodejs-quickstart.json';
console.log(TOKEN_PATH)

// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Calendar API.
  authorize(JSON.parse(content), listEvents);
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

/**
 * Lists the next 10 events on the user's primary calendar.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {

  let data = [];
  let calendar = google.calendar('v3');
  calendar.calendarList.list({
    auth: auth,
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(),
    maxResults: 100,
    singleEvents: true,
    orderBy: 'startTime'
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    let events = response.items;

    if (events.length == 0) {
      console.log('No upcoming events found.');
    } else {
      console.log('Upcoming 10 events:');

      for (let i = 0; i < events.length; i++) {
        calendar.events.list({
          auth: auth,
          calendarId: events[i].id,
          timeMin: (new Date('2017/06/12')).toISOString(),
          maxResults: 2500,
          singleEvents: true,
          orderBy: 'startTime'
        }, function(err, response) {

          if (err) {
            console.log('The API returned an error: ' + err);
            return;
          }

          let events = response.items;
          var teamName = events[i].organizer.displayName;
          let team = {
            teamName,
            teamEvents: []
          };

          if (events.length == 0) {

            console.log('No upcoming events found.');

          } else if(events[i].organizer.displayName && events[i].organizer.displayName.length > 0){

            for (let i = 0; i < events.length; i++) {

              let event = events[i];

              let game = event.summary;

							if(game.includes('[')){
								continue;
							}

              let start = event.start.dateTime || event.start.date;

              let opponent = event.summary.split('-').filter(team => !team.includes(teamName))[0].split('(')[0].trim();

              let home_or_away = event.summary.split('-')[0].includes(teamName) ? 'home' : 'away';

              let score = game.includes('(') ? game.split(' ').slice(-1)[0].replace(/\(|\)/g,'') : '';

              let winLossDraw;

              if(score.split('-').length > 0) {
                winLossDraw = home_or_away === 'home' && parseInt(score.split('-')[0]) > parseInt(score.split('-')[1]) ? 'won' :
                  home_or_away === 'away' && parseInt(score.split('-')[1]) > parseInt(score.split('-')[0]) ? 'won' :
                  parseInt(score.split('-')[1]) == parseInt(score.split('-')[0]) ? 'draw' :
                  score.split('-').length == 1 ? '' : 'lost'
              }

							let abbr = imageChecker.imageChecker(opponent);

              MongoClient.connect(url, function(err, db) {
                if (err) throw err;

                var obj = {
                  game,
                  start,
                  opponent,
									abbr,
                  home_or_away,
                  score,
                  winLossDraw
                };

								let dbName = imageChecker.imageChecker(teamName);

                db.collection(dbName.trim()).insertOne(obj, function(err, res) {
                  if (err) throw err;
                  console.log("1 document inserted");
                  db.close();
                });
              });
            }
          }
        });
      }
    }
  });
}
