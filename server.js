var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var cors = require('cors')
var app = express();
app.use(cors());

var imageChecker  = require('./imageChecker');

const PORT = process.env.PORT || 5000;

var MongoClient = require('mongodb').MongoClient;

// var url = "mongodb://localhost:27017/premier_league";
var url = "mongodb://paulfitz:123456789@ds135866.mlab.com:35866/premier-league";

app.get('/scrapeTable', function(){

  let scrapeUrl = 'http://www.espn.co.uk/football/table/_/league/eng.1';

  request(scrapeUrl, function (error, response, body) {
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

           db.collection('table').updateOne({}, myobj, { upsert: true } , function(err, res) {
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
});

app.get('/scrapeTopScorers', function(){

  let scrapeUrl = 'http://www.bbc.co.uk/sport/football/premier-league/top-scorers';

  request(scrapeUrl, function (error, response, body) {
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
});

app.get('/scrapeTopAssists', function(){

  let scrapeUrl = 'http://www.espnfc.co.uk/barclays-premier-league/23/statistics/assists';

  request(scrapeUrl, function (error, response, body) {
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
});

// Get league table

app.get('/table', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection("table").find({}).sort({ "points": -1}).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});


// Get headlines

app.get('/headlines', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection("headlines").find({}).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

// Get teams

app.get('/teams', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection("teams").find({}).sort({ "abbr": 1}).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

// Get top scorers

app.get('/topscorers', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection("topscorers").find({}).sort({ "goals": -1}).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

// Get top assists

app.get('/topassists', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection("topassists").find({}).sort({ "assists": -1}).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});


// Get team name

app.get('/team/:teamName', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection(req.params.teamName).find({}).sort({ "start": 1}).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

// Get Next Games

app.get('/nextGames/:teamName/:numGames?', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection(req.params.teamName).find({score: {$type: 2}, $where: "this.score.length == 0"}).sort({ "start": 1}).limit(parseInt(req.params.numGames)).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

// Get Previous Games

app.get('/prevGames/:teamName/:numGames?', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
		let numGames = parseInt(req.params.numGames) || 100;
    db.collection(req.params.teamName).find({score: {$type: 2}, $where: "this.score.length > 0"}).sort({"start": -1}).limit(numGames).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
