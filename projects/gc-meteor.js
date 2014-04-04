var router = require('gc-router').router;
var sockjs = require('gc-sockjs').sockjs;

//sockjs.attachTo(router);

//var WebSocketServer = require('ws').Server;

router.addRoute('/', function(req, res) {
  res.writeHead(200);
  res.end("Hello World");
});

meteor = {
  
};


/*
sockjs.onMsg('connect', function(data) {
  console.log('got "connect", sending response');
  sockjs.send(this, {"server_id":"webgQzL8vM5Chp7ut"});
});
*/

meteor.gotMsg = function(msg, session, data) {
  console.log('gotMsg ' + msg);
  if (msg == "connect") {
    console.log('sending response');
    sockjs.send(session, {"server_id":"webgQzL8vM5Chp7ut"});
  }
};

console.log('complete');


/*
console.log('Loading CC3000 module...');
var wlan = require("CC3000").connect();
console.log('Finished loading CC3000 module.');

console.log('Connecting to Access Point "' + WIFI_ESSID + '"...');
wlan.connect(WIFI_ESSID, WIFI_PASSPHRASE, function (s) {
  console.log('Connected, got "' + s + '"');
  if (s=="dhcp") {
    console.log("My IP is "+wlan.getIP().ip);
    var http = require("http");
    var server = http.createServer(router.incoming).listen(80);  
  }
});
*/
