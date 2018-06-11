var express = require("express");
var fs = require("fs");
var request = require("request");
var cheerio = require("cheerio");
var cors = require("cors");
var app = express();
app.use(cors());

const PORT = process.env.PORT || 5000;
var MongoClient = require("mongodb").MongoClient;
const url = "mongodb://paulfitz:123456789a@ds016098.mlab.com:16098/world-cup";

app.get("/groups", function(req, res) {
  let scrapeUrl = "https://www.bbc.co.uk/sport/football/world-cup/schedule/group-stage";

  request(scrapeUrl, function(error, response, body) {
    const groups = [];
    if (!error) {
      var $ = cheerio.load(body);
      const groups = [
        {
          groupName: "A",
          teams: []
        },
        {
          groupName: "B",
          teams: []
        },
        {
          groupName: "C",
          teams: []
        },
        {
          groupName: "D",
          teams: []
        },
        {
          groupName: "E",
          teams: []
        },
        {
          groupName: "F",
          teams: []
        },
        {
          groupName: "G",
          teams: []
        },
        {
          groupName: "H",
          teams: []
        }
      ];

      const teams = [];
      groups.forEach((group, index) => {
        let t;
        $(`#group-stage--${group.groupName.toLowerCase()} table .gel-long-primer .table__cell`).each(function(i, elm) {
          if (i % 6 === 0) {
            t = {};
            t.abbr = $(this).text().trim();
          } else if (i % 6 === 1) {
            t.won = $(this).text();
          } else if (i % 6 === 2) {
            t.draw = $(this).text();
          } else if (i % 6 === 3) {
            t.loss = $(this).text();
          } else if (i % 6 === 4) {
            t.gd = $(this).text();
          } else if (i % 6 === 5) {
            t.points = $(this).text();
            groups[index].teams.push(t);
          }
        });    
      });

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        db.collection('groups').insert(groups, function(err, res) {
          if (err) throw err;
          console.log("1 document inserted");
          db.close();
        });
      });
      res.json(groups)
    }
  });
});

app.get("/scrapeTopScorers", function() {
  let scrapeUrl =
    "http://www.bbc.co.uk/sport/football/premier-league/top-scorers";

  request(scrapeUrl, function(error, response, body) {
    if (!error) {
      var $ = cheerio.load(body);
      let topScorers = [];

      var data = $(".top-player-stats");

      $(".top-player-stats__name").each(function(i, elm) {
        var obj = {};
        obj.player = $(this).text();
        topScorers[i] = obj;
      });

      $(".top-player-stats__goals-scored-number").each(function(i, elm) {
        topScorers[i].goals = $(this).text();
      });

      $(".team-short-name").each(function(i, elm) {
        topScorers[i].team = $(this).text();
      });

      for (var i = 0; i < topScorers.length; i++) {
        let player = topScorers[i].player;
        let goals = parseInt(topScorers[i].goals);
        let team = topScorers[i].team;
        let abbr = imageChecker.imageChecker(team);

        // INSERT FIXTURES INTO THE DATABASE

        MongoClient.connect(
          url,
          function(err, db) {
            if (err) throw err;
            var myobj = {
              player,
              team,
              goals,
              abbr
            };

            db.collection("topscorers").insertOne(myobj, function(err, res) {
              if (err) throw err;
              console.log("1 document inserted");
              db.close();
            });
          }
        );
      }
    } else {
      console.log("error:", error); // Print the error if one occurred
    }
  });
});

// Get all fixtures
app.get("/fixtures", function(req, res) {
  MongoClient.connect(url, (err, db) => {
      if (err) throw err;
      db.collection("fixtures")
        .find({})
        .sort({ group: -1 })
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get group fixtures
app.get("/group-fixtures", (req, res) => {
  MongoClient.connect(
    url,
    function(err, db) {
      if (err) throw err;
      db.collection("fixtures")
        .find({})
        .sort({ group: 1 })
        .toArray(function(err, result) {
          if (err) throw err;
          let groupFixtures = result.filter(r => {
            return r.group.length === 1;
          });
          res.json(groupFixtures);
          db.close();
        });
    }
  );
});

// Get teams

app.get("/teams", (req, res) => {
  MongoClient.connect(
    url,
    function(err, db) {
      if (err) throw err;
      db.collection("teams")
        .find({})
        .sort({ abbr: 1 })
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get top scorers

app.get("/topscorers", function(req, res) {
  MongoClient.connect(
    url,
    function(err, db) {
      if (err) throw err;
      db.collection("topscorers")
        .find({})
        .sort({ goals: -1 })
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get top assists

app.get("/topassists", function(req, res) {
  MongoClient.connect(
    url,
    function(err, db) {
      if (err) throw err;
      db.collection("topassists")
        .find({})
        .sort({ assists: -1 })
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get team name

app.get("/team/:teamName", function(req, res) {
  MongoClient.connect(
    url,
    function(err, db) {
      if (err) throw err;
      db.collection(req.params.teamName)
        .find({})
        .sort({ start: 1 })
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get Next Games

app.get("/nextGames/:teamName/:numGames?", function(req, res) {
  MongoClient.connect(
    url,
    function(err, db) {
      if (err) throw err;
      db.collection(req.params.teamName)
        .find({ score: { $type: 2 }, $where: "this.score.length == 0" })
        .sort({ start: 1 })
        .limit(parseInt(req.params.numGames))
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get Previous Games

app.get("/prevGames/:teamName/:numGames?", function(req, res) {
  MongoClient.connect(
    url,
    function(err, db) {
      if (err) throw err;
      let numGames = parseInt(req.params.numGames) || 100;
      db.collection(req.params.teamName)
        .find({ score: { $type: 2 }, $where: "this.score.length > 0" })
        .sort({ start: -1 })
        .limit(numGames)
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
