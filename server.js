const express = require("express");
const request = require("request");
const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const cors = require("cors");
const app = express();

app.use(cors());

const PORT = process.env.PORT || 5000;
var MongoClient = require("mongodb").MongoClient;
const url = "mongodb://paulfitz:123456789a@ds016098.mlab.com:16098/world-cup";

// get form of last 6 games

app.get('/scrape-team-form', () => {
  MongoClient.connect(url, (err, db) => {
    if (err) throw err;
  
    let scrape = async () => {
      const browser = await puppeteer.launch({headless: false});
      const page = await browser.newPage();
      await page.goto('http://www.skysports.com/world-cup-fixtures');
      await page.waitForSelector('.matches__link');  
      const result = await page.evaluate(() => {
          let links = document.querySelectorAll('.matches__link');
          const linksArray = [];
          [].forEach.call(links, function(el) {
            linksArray.push(el.href);
          });
          return {
            linksArray
          }
      });
      browser.close();
      return result;
    };
    
    let scrapeUrl = async (url) => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url);
      await page.waitForSelector('.block-header__title');
      const result = await page.evaluate(() => {
        
        let team = document.querySelector('.block-header__title').innerText.replace(/last 6/i, '').trim();
        let resultsEl = document.querySelectorAll('.match-area-form__fixture');
        let datesEl = document.querySelectorAll('.match-area-form__date');
    
        dates = [];
        results = [];
        winLossDraws = [];
        
        [].forEach.call(resultsEl, (el, i) => {
          console.log('i ===> ', i)
          if(i < 6) {
            results.push({
              game: el.innerText
            });
          }
        });
        
        let winLossDrawEls = document.querySelectorAll('.match-area-form__outcome-container');
        
        [].forEach.call(winLossDrawEls, (el, i) => {
          if(i < 6) {
            results[i].form = getComputedStyle(el, ':before').getPropertyValue('content');
          }
        });
        
        [].forEach.call(datesEl, (el, i) => {
          if(i < 6) {
            results[i].date = el.innerText;
          }
        });
        return {
          team,
          results
        }
      });
    
      browser.close();
      return result;
    };
    
    scrape().then((value) => {  
      var x = 0;
      function go() {
        scrapeUrl(value.linksArray[x]).then((value) => {
          if(value.results.length > 0) {
            console.log(value)
            db.collection('form').update({ team: value.team }, value, { upsert: true }, function(err, res) {
              if (err) throw err;
              console.log("Document inserted 😎", value.team);
            });
          }
        });
        if (x++ <= value.linksArray.length) {
          setTimeout(go, 10000);
        }
      }
      go();
      return false;
    });
  });
});

// scrape groups
app.get("/scrape-groups", function(req, res) {
  let scrapeUrl = "https://www.bbc.co.uk/sport/football/world-cup/schedule/group-stage";
  request(scrapeUrl, function(error, response, body) {
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

      groups.forEach((group, index) => {
        let t;

        $(`#group-stage--${group.groupName.toLowerCase()} table .gel-long-primer .table__cell`).each(function(i, elm) {

          if (i % 6 === 0) {
            t = {};
            t.name = $(this).find('abbr').attr('title');
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
        console.log('db', db)
        db.collection('groups').drop();
        db.collection('groups').insert(groups, function(err, res) {
          if (err) throw err;
          console.log("document inserted 😎");
          db.close();
        });
      });
      res.json(groups)
    }
  });
});

// scrape top scorers
app.get("/scrape-top-scorers", function(req, res) {
  let scrapeUrl = "http://www.espnfc.us/fifa-world-cup/4/statistics/scorers";

  request(scrapeUrl, function(error, response, body) {
    if (!error) {
      var $ = cheerio.load(body);
      let topScorers = [];

      $('td[headers="player"]').each(function(i, e) {
        var obj = {};
        obj.name = $(this).text();
        topScorers[i] = obj;
      });

      $('td[headers="goals"]').each(function(i, e) {
        topScorers[i].amount = $(this).text();
      });

      $('td[headers="team"]').each(function(i, e) {
        topScorers[i].team = $(this).text();
      });

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        db.collection('top-scorers').drop();
        db.collection('top-scorers').insert(topScorers, function(err, res) {
          if (err) throw err;
          console.log("document inserted 😎");
          db.close();
        });
      });
      res.json(topScorers);
    } else {
      console.log("error:", error); // Print the error if one occurred
    }
  });
});

// scrape assists
app.get("/scrape-top-assists", function(req, res) {
  let scrapeUrl = "http://www.espnfc.us/fifa-world-cup/4/statistics/assists";

  request(scrapeUrl, function(error, response, body) {
    if (!error) {
      var $ = cheerio.load(body);
      let topAssists = [];

      $('td[headers="player"]').each(function(i, e) {
        var obj = {};
        obj.name = $(this).text();
        topAssists[i] = obj;
      });

      $('td[headers="goals"]').each(function(i, e) {
        topAssists[i].amount = $(this).text();
      });

      $('td[headers="team"]').each(function(i, e) {
        topAssists[i].team = $(this).text();
      });

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        db.collection('top-assists').drop();
        db.collection('top-assists').insert(topAssists, function(err, res) {
          if (err) throw err;
          console.log("document inserted 😎");
          db.close();
        });
      });
      res.json(topAssists);
    } else {
      console.log("error:", error); // Print the error if one occurred
    }
  });
});

app.get("/scrape-headlines", (req, res) => {
  let newsUrl = 'http://www.skysports.com/world-cup';

  request(newsUrl, function (error, response, body) {
    if(!error){
      var $ = cheerio.load(body);
      let headlines = [];

      $('.news-list__headline').each(function(i, elm) {
        var obj = {};
        obj.headline = $(this).text().trim();
        headlines[i] = obj;
      });

      $('.news-list__headline-link').each(function(i, elm) {
        headlines[i].link = $(this).attr('href');
      });

      $('.news-list__snippet').each(function(i, elm) {
        headlines[i].snippet = $(this).text();
      });

      $('.news-list__image').each(function(i, elm) {
        headlines[i].image = $(this).attr('data-src').replace(/[{}#]/g, "");
      });

      MongoClient.connect(url, function(err, db) {
        if (err) throw err;

        db.collection('headlines').drop();
        db.collection('headlines').insert(headlines, function(err, res) {
          if (err) throw err;
          console.log("documents inserted 😎");
          db.close();
        });
      });
      
      res.json(headlines);
    } else {
      console.log('error:', error); // Print the error if one occurred
    }
  });
});

// Get all fixtures
app.get("/fixtures", function(req, res) {
  MongoClient.connect(url, (err, db) => {
      if (err) throw err;
      db.collection("fixtures")
        .find({})
        .sort({ kickOffTime: -1 })
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get all headlines
app.get("/headlines", function(req, res) {
  MongoClient.connect(url, (err, db) => {
      if (err) throw err;
      db.collection("headlines")
        .find({})
        .toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    }
  );
});

// Get groups
app.get("/groups", (req, res) => {
  MongoClient.connect(url, (err, db) => {
      if (err) throw err;
      db.collection("groups").find({})
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
  MongoClient.connect(url, (err, db) => {
      if (err) throw err;
      db.collection("fixtures").find({}).sort({ kickOffTime: 1 })
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

// Get team form
app.get('/form/:countryOne/:countryTwo', (req, res) => {
  MongoClient.connect(url, (err, db) => {
    if (err) throw err;
    db.collection("form").find({}).toArray(function(err, result) {
      if (err) throw err;
      let form = result.filter(r => {
      
        const team = r.team.toLowerCase().replace(/ /g, '');
        return team === req.params.countryOne.toLowerCase().replace(/ /g, '') || team === req.params.countryTwo.toLowerCase().replace(/ /g, '');
      });
      res.json(form);
      db.close();
    });
  });
});

// Get top scorers
app.get("/top-scorers", function(req, res) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("top-scorers")
    .find({})
    .sort({ goals: -1 })
    .toArray(function(err, result) {
      if (err) throw err;
      res.json(result);
      db.close();
    });
  });
});

// Get top assists
app.get("/top-assists", function(req, res) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("top-assists")
    .find({})
    .sort({ assists: -1 })
    .toArray(function(err, result) {
      if (err) throw err;
      res.json(result);
      db.close();
    });
  });
});

// Get team name
app.get("/team/:teamName", function(req, res) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection(req.params.teamName)
    .find({})
    .sort({ start: 1 })
    .toArray(function(err, result) {
      if (err) throw err;
      res.json(result);
      db.close();
    });
  });
});

// Get Next Games
app.get("/nextGames/:teamName/:numGames?", function(req, res) {
  MongoClient.connect(url, function(err, db) {
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
  });
});

// Get Previous Games
app.get("/prevGames/:teamName/:numGames?", function(req, res) {
  MongoClient.connect(url, function(err, db) {
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
  });
});

app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});
