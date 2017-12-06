var express = require('express');
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var app = express();


var MongoClient = require('mongodb').MongoClient;

var url = "mongodb://localhost:27017/premier_league"; // mydatabase is the name of db

app.get('/scrape', function(){

  let scrapeUrl = 'http://www.espn.co.uk/football/table/_/league/eng.1';

  request(scrapeUrl, function (error, response, body) {
     if(!error){
       var $ = cheerio.load(body);
       let table = [];
       $('.standings').filter(() => {
         var data = $(this);
         $('.team-names').each(function(i, elm) {
           var obj = {};
           obj.team = $(this).text();
           table[i] = obj;
         });

         $('.standings-row > td:nth-child(2)').each(function(i, elm) {
           table[i].gamesPlayed = $(this).text();
         });

         $('.standings-row > td:nth-child(3)').each(function(i, elm) {
           table[i].won = $(this).text();
         });

         $('.standings-row > td:nth-child(3)').each(function(i, elm) {
            table[i].draw = $(this).text();
         });

         $('.standings-row > td:nth-child(3)').each(function(i, elm) {
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
           let gamesPlayed = table[i].gamesPlayed;
           let won = table[i].won;
           let draw = table[i].draw;
           let lost = table[i].lost;
           let goalDiff = table[i].goalDiff;
           let points = table[i].points;

           // INSERT FIXTURES INTO THE DATABASE

           MongoClient.connect( "mongodb://localhost:27017/premier_league", function(err, db) {
             if (err) throw err;
             var myobj = {
               name,
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
       });
     } else {
       console.log('error:', error); // Print the error if one occurred
     }
   });
});


app.get('/table', function(){

  MongoClient.connect(url, function(err, db) {
  if (err) throw err;
    db.collection("table").find({}).toArray(function(err, result) {
      if (err) throw err;
      console.log(result);
      db.close();
    });
  });
});

app.listen('3000', () => {
  console.log('listening on port 3000');
});
