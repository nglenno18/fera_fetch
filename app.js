const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3001;
var express = require('express');
var request = require('request');
var bodyParser = require('body-parser');

var timestamps = [];
require('./config/config.js');
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var fs = require('fs');
var previousLength = 0;
var currentSQL = [];

var minute = new Date();
console.log('\nSTARTED :', minute.toString("hh:mm tt"));
var second = minute.getSeconds();
minute = minute.getMinutes();
console.log('\t', minute);

var schedule = require("node-schedule");
var rule = new schedule.RecurrenceRule();
rule.second = 1;
rule.minute = 0;
rule.dayOfWeek = [0, new schedule.Range(0,6)];

var connection = null;
var mysql2 = require('mysql2');
var url = require('url');

var SocksConnection = require('socksjs');
var options, proxy;
proxy = url.parse(process.env.QUOTAGUARDSTATIC_URL); // <-- proxy url
var username = proxy.auth.split(':')[0];
var password = proxy.auth.split(':')[1];

var SocksConnection = require('socksjs');

var mysql_server_options = {
  host: process.env.HOST,
  port: process.env.PORTE
};

var socks_options = {
  host: proxy.hostname,
  port: 1080,
  user: username,
  pass: password
};

var csvurl = process.env.CSV;

//Start Server
var serv = app.listen(port, function(){
  console.log('App listening on port %s', serv.address().port);
  console.log('Press Ctrl+C to quit');

  // schedule.scheduleJob(rule, function(){
  //   herokutest(function(array){
  //     console.log('RULE 1 -- callback called', array);
  //       return (array);
  //   });
  // });

  app.use(bodyParser.json());

  app.get('/', function(err, response){
    console.log('GET request /');
    fetch_photos(function(result, countedRows){
      console.log(result);
      console.log('\n\n\nCOUNTED CSV ROWS: ', countedRows);

      // return response.status(200).send(result);
      // response.status(200).send(result);
      var arr = result;
      retrieveDB(result, function(res){
        //on success --> return number of csv rows on request,
                     //  number of rows added to SQL
                     currentSQL = [];
         var i = 0;
         for(i = 0; i < res.length; i++){
           currentSQL.push(res[i].url);

         }


         updateDB(currentSQL, arr, function(resp){
           console.log('\n\nUpdated Database complete!\n\tFiles not saved: ', resp);
         });
        return response.status(200).send(res);
      });
    });

    // testQuery(function(result){
    //   return response.status(200).send(JSON.stringify(result, undefined, 2));
    // });
  });
  app.get('/clearall', function(request, response){
    clearTimesheets(function(result){
      return response.status(200).send(result);
    });
  });
});

/*FUNCTION --> FETCH_PHOTOS
  (retrieve photo from online csv,
  ID image files, create Object for each image file, build Object Array)*/
var fetch_photos = function(res){
  console.log('\n\nREQUESTING CSV ACCESS...\n', res);
  return request.get(csvurl, function(error, response, body){
    if (!error && response.statusCode == 200) {
      var csv = body;
      //---- WorkID ---- URL ---- description ---- FILE ----//
      var row = [];
      var array = [];
      // if(error) return response.status(400).send(error);
      // if(error) return error;
      if(error) console.log(error);
      console.log('CSV Retrieved\n');

      var b = csv.replace(/'/g, "");
      b = b.replace(/"/g, "");

      var str = b.split('\n');
      console.log('Retrieved Data Length: ', str.length);
      if(str.length == previousLength) res('CSV File is up to date', str.length);

      var entry = 0;
      var i = 1;
      var x = 0;


      for(x = 0; x < 100; x++){
        console.log(x);
        var str2 = str[x].toUpperCase();
        var ext = str2.substring(str2.lastIndexOf('.')+1);
        if(str2.includes('HTTP') && (ext == 'PNG' || ext == 'JPG' || ext == 'JPEG')){
          var photo = {
            work_order: '',
            url:'',
            description: ''
            // filename: ''
          };
          entry++;
          console.log(`Entry [${entry}]\n`);
          // console.log(`\t[${str[x]}]\n`);
          photo.url = str[x];
          // photo.filename = str[x].substring(str[x].lastIndexOf("/")+1);

          if(str[x].includes('WO')){
            var wo = str[x].substring(str[x].indexOf('WO'), str[x].indexOf('WO')+6);
            var woNum = wo.substring(2);
            // console.log('WORKORDER: ', wo);
            if(Number(woNum) != NaN){
              photo.work_order = wo;
              var desc = str[x].substring(str[x].indexOf('WO')+7);
              desc = desc.substring(0, desc.indexOf('/'));
              // console.log('Description: ',desc);
              photo.description = desc;
            }
          }
          array.push(photo);
          ///-----> Record number of rows in the csv.
          //        Only continue if the number of rows does not equal previous number
        }
      }
      console.log('\n\n\nArray: ', array);
      // previousLength = str.length;
      res(array, str.length);
    }
  });
}



//--------------------------mySQL-----------------------//
//ESTABLISH proxy
var establishProxy = function(callback){
  var socksConn = new SocksConnection(mysql_server_options, socks_options);

  // console.log(socksConn);
  var mysql_options =  {
    database: process.env.DB,
    user: process.env.US,
    password: process.env.PW,
    stream: socksConn
  }
  callback(mysql_options);
}

//FUNCTION ----> Run an INSERT STATEMNET/DATABASE READ
var testQuery = function(callback){
  establishProxy(function(mysql_options){
    var mysqlConn = mysql2.createConnection(mysql_options);
    var arr;
    return mysqlConn.connect(function(err){
      if(err){console.log(err);}
      else{
        console.log('\n\nDatabase Connected!');
        var t = new Date();
        var tf = t.toString("MMM/DD/yy   hh:mm: aa");
        console.log('TIME: ', t.toString("hh:mm: aa"));
        console.log(tf);

        console.log('\n\nInitial Query...\n');
        callback(mysqlConn.query('SELECT COUNT(DISTINCT(work_order)) AS WorkOrders, COUNT(work_order) AS PhotoFiles FROM progress_photos2;', function(err, rows){
          if(err) return console.log(err);
          console.log('Result: ', rows);
        }));
      }
    })
  });
}

var retrieveDB = function(rows, callback){
  console.log('\n\nUPDATING Database: \n\n\t Adding Rows: \n', rows);
  establishProxy(function(mysql_options){
    var mysqlConn = mysql2.createConnection(mysql_options);
    var arr;
    return mysqlConn.connect(function(err){
      if(err){console.log(err);}
      else{
        console.log('\n\nDatabase Connected!');
        var t = new Date();
        var tf = t.toString("MMM/DD/yy   hh:mm: aa");
        console.log('TIME: ', t.toString("hh:mm: aa"));
        console.log(tf);

        console.log('\n\nInitial Query...\n');
        // returns list of DISTINCT work_orders, how many files are referencing that work_order, and how many distinct work_orders are in the DB
        var sqlPhoto_stats = 'SELECT DISTINCT(work_order) as WorkOrders, COUNT(work_order) AS PhotoFiles FROM progress_photos2 GROUP BY WorkOrders;';
        var sqlPhoto_all = 'SELECT url FROM progress_photos2 LIMIT 100;';

        return mysqlConn.query(sqlPhoto_all, function(err, rows){
          if(err) return console.log(err);
          var i = 0;
          for(i = 0; i < rows.length; i++){
            if(i/10 == 1) console.log(rows[i]);
          }

          return mysqlConn.end(function(err){
            if(err) return console.log(err);
            console.log('\tDatabase DISCONNECTED!');
            var t = new Date();
            console.log('\t TIME: ', t.toString("hh:mm: tt"));
            console.log('\n\n\n');
            callback(rows);
            //PERFECT --> now udemy, review how to config HEROKU env. variables to stuff?
          });
        });

      }
    })
  });
}


var updateDB = function(sqlEntries, csvs, callback){
    establishProxy(function(mysql_options){
      var mysqlConn = mysql2.createConnection(mysql_options);
        var u = 0;
        for(u = 0; u < csvs.length; u ++){
          var failed = [];
          console.log(csvs[u].work_order);

          if(sqlEntries.indexOf(csvs[u].url)== -1){
            //do not add to db
            console.log('Adding entry: ', csvs[u]);
            var sqlPhoto_insert = 'INSERT INTO progress_photos2(work_order, url, description) VALUES(\'' + csvs[u].work_order + '\', \''+ csvs[u].url + '\', \'' +
            csvs[u].description + '\');';
            mysqlConn.query(sqlPhoto_insert, function(err, rows){
              if(err){
                failed.push(csvs[u]);
                return console.log(err);
              }
              var i = 0;
              for(i = 0; i < rows.length; i++){
                if(i/10 == 1) console.log(rows[i]);
              }
            });
          }
        }
        return mysqlConn.end(function(err){
          if(err) return console.log(err);
          console.log('\n\n\n\tDatabase DISCONNECTED!');
          var t = new Date();
          console.log('\t TIME: ', t.toString("hh:mm: tt"));
          console.log('\n\n\n');
          callback(failed);
          //PERFECT --> now udemy, review how to config HEROKU env. variables to stuff?
        });
      });
}
