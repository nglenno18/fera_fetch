var env = process.env.NODE_ENV || 'development'; //need to configure NODE_ENV in package.json
console.log(`***********ENVIRONMENT: `, env);

if(env=== 'development' || env === 'test' || env === 'test '){
  //LOAD in a SEPERATE json file where DEV and TEST config variables will live
      //that file ^^ config.json will NOT be part of git repo
  //REQUIRE the JSON file --> parse into object
  var config = require('./config.json');

  var envConfig = config[env]; //Stores JUST the config variables for current env

  console.log(Object.keys(envConfig));  //finds all the keys in env
  Object.keys(envConfig).forEach(function(key){ //callback gets called with each item
    process.env[key] = envConfig[key];  //set the process.env keys as the local
  });
}
