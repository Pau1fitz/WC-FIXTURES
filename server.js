var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var cors = require('cors')
var app = express();
app.use(cors())

var MongoClient = require('mongodb').MongoClient;

var url = "mongodb://localhost:27017/premier_league"; // mydatabase is the name of db

app.get('/scrape', function(){

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

         MongoClient.connect( "mongodb://localhost:27017/premier_league", function(err, db) {
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

           db.collection('table').insertOne(myobj, function(err, res) {
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


// this route downloads the team logos
app.get('/badges', function() {
	// get logos
	$('.team-logo').each(function(i, elm) {

		const options = {
			url: elm.attribs.src,
			dest: `./images/${i}.png`
		};

		download.image(options)
		.then(({ filename, image }) => {
			console.log('File saved to', filename)
		}).catch((err) => {
			throw err
		});
	});
})


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

app.get('/nextgames/:teamName/:numGames', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection(req.params.teamName).find({}).sort({ "score": 1}).limit(parseInt(req.params.numGames)).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

// Get Previous Games

app.get('/prevGames/:teamName/:numGames', function(req, res){
  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection(req.params.teamName).find({}).sort({ "score": -1}).limit(parseInt(req.params.numGames)).toArray(function(err, result) {
      if (err) throw err;
			res.json(result)
      db.close();
    });
  });
});

app.listen('3000', () => {
  console.log('listening on port 3000');
});
