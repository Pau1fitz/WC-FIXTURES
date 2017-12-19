let fs = require('fs');
let readline = require('readline');
let google = require('googleapis');
let googleAuth = require('google-auth-library');
let writeJsonFile = require('write-json-file');
var imageChecker  = require('./imageChecker');
var request = require('request');
var cheerio = require('cheerio');

var MongoClient = require('mongodb').MongoClient;
// var url = "mongodb://localhost:27017/premier_league"; // premier league is the name of db
var url = "mongodb://paulfitz:123456789@ds135866.mlab.com:35866/premier-league";

MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    console.log("Connected to Database!");
    // print database name
    console.log("db object points to the database : "+ db.databaseName);
    // delete the database
    db.dropDatabase(function(err, result){
        console.log("Error : "+err);
        if (err) throw err;
        console.log("Operation Success ? "+result);
        // after all the operations with db, close it.
        db.close();
    });
});

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

					MongoClient.connect(url, function(err, db) {

						let abbr = imageChecker.imageChecker(teamName);

						let obj = {
							abbr,
							name: teamName
						};

						if (err) throw err;

						if(abbr) {
							db.collection('teams').insertOne(obj, function(err, res) {
								if (err) throw err;
								console.log("1 document inserted");
								db.close();
							});
						}

					});

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


let scrapeUrlTwo = 'http://www.espn.co.uk/football/table/_/league/eng.1';

request(scrapeUrlTwo, function (error, response, body) {
   if(!error){
     var $ = cheerio.load(body);
     let table = [];

     var data = $('.standings');

     $('.team-names').each(function(i, elm) {
       var obj = {};
       obj.team = $(this).text();
       table[i] = obj;
     });

		 $('.standings-row abbr').each(function(i, elm) {
			 table[i].abbr = $(this).text();
		 });

     $('.standings-row > td:nth-child(2)').each(function(i, elm) {
       table[i].gamesPlayed = $(this).text();
     });

     $('.standings-row > td:nth-child(3)').each(function(i, elm) {
       table[i].won = $(this).text();
     });

     $('.standings-row > td:nth-child(4)').each(function(i, elm) {
        table[i].draw = $(this).text();
     });

     $('.standings-row > td:nth-child(5)').each(function(i, elm) {
        table[i].lost = $(this).text();
     });

    $('.standings-row > td:nth-last-child(2)').each(function(i, elm) {
        table[i].goalDiff = $(this).text();
    });

     $('.standings-row > td:last-child').each(function(i, elm) {
        table[i].points = $(this).text();
     });

     for(var i = 0; i < table.length; i++) {
       let name = table[i].team;
			 let abbr = table[i].abbr;
       let gamesPlayed = parseInt(table[i].gamesPlayed);
       let won = parseInt(table[i].won);
       let draw = parseInt(table[i].draw);
       let lost = parseInt(table[i].lost);
       let goalDiff = parseInt(table[i].goalDiff);
       let points = parseInt(table[i].points);

       // INSERT FIXTURES INTO THE DATABASE

       MongoClient.connect(url, function(err, db) {
         if (err) throw err;
         var myobj = {
           name,
					 abbr,
           gamesPlayed,
           won,
           draw,
           lost,
           goalDiff,
           points
         };

         db.collection('table').insertOne( myobj, function(err, res) {
           if (err) throw err;
           console.log("1 document inserted");
           db.close();
         });
       });
     }

   } else {
     console.log('error:', error); // Print the error if one occurred
   }
 });


let scrapeUrlThree = 'http://www.bbc.co.uk/sport/football/premier-league/top-scorers';

request(scrapeUrlThree, function (error, response, body) {
  if(!error){
   var $ = cheerio.load(body);
   let topScorers = [];

   var data = $('.top-player-stats');

   $('.top-player-stats__name').each(function(i, elm) {
     var obj = {};
     obj.player = $(this).text();
     topScorers[i] = obj;
   });

  $('.top-player-stats__goals-scored-number').each(function(i, elm) {
    topScorers[i].goals = $(this).text();
  });

	 $('.team-short-name').each(function(i, elm) {
		 topScorers[i].team = $(this).text();
	 });

   for(var i = 0; i < topScorers.length; i++) {
     let player = topScorers[i].player;
     let goals = parseInt(topScorers[i].goals);
		 let team = topScorers[i].team;
		 let abbr = imageChecker.imageChecker(team);

     // INSERT FIXTURES INTO THE DATABASE

     MongoClient.connect(url, function(err, db) {
       if (err) throw err;
       var myobj = {
        player,
        team,
        goals,
				abbr
       };

       db.collection('topscorers').insertOne(myobj, function(err, res) {
         if (err) throw err;
         console.log("1 document inserted");
         db.close();
       });
     });
   }

 } else {
   console.log('error:', error); // Print the error if one occurred
 }
});

let scrapeUrlFour = 'http://www.espnfc.co.uk/barclays-premier-league/23/statistics/assists';

request(scrapeUrlFour, function (error, response, body) {
 if(!error){
   var $ = cheerio.load(body);
   let topAssists = [];

   $("td[headers='player']").each(function(i, elm) {
     var obj = {};
     obj.player = $(this).text();
     topAssists[i] = obj;
   });

	 $("td[headers='team']").each(function(i, elm) {
		 topAssists[i].team = $(this).text();
	 });

  $("td[headers='goals']").each(function(i, elm) {
    topAssists[i].assists = $(this).text();
  });

   for(var i = 0; i < topAssists.length; i++) {
     let player = topAssists[i].player;
     let assists = parseInt(topAssists[i].assists);
		 let team = topAssists[i].team;
			 let abbr = imageChecker.imageChecker(team);

     // INSERT FIXTURES INTO THE DATABASE

     MongoClient.connect(url, function(err, db) {
       if (err) throw err;
       var myobj = {
        player,
        assists,
        team,
				abbr
       };

       db.collection('topassists').insertOne(myobj, function(err, res) {
         if (err) throw err;
         console.log("1 document inserted");
         db.close();
       });
     });
   }

 } else {
   console.log('error:', error); // Print the error if one occurred
 }
});
