## espruino-gc-meteor

*[Espruino](http://www.espruino.com/) + [Meteor](https://www.meteor.com/) = <3*

This is the code used in the [demo](https://www.youtube.com/watch?v=Pjbq2yqyPYM).

Please consider it more of a proof-of-concept than even a preview release.
Notably, there is no API yet.  You are welcome to play around with the given
example, but expect changes [especially in the Meteor API].  Some things
might change to an object orientated approach, I'm still considering the
memory and CPU implications.

Regrettably this was just a weekend project, to take a break from crazy pressure
at work which I have to get back to now, but hope to resume work on it soon.  Next
release would have an API and server-to-server DDP.  Definitely intend to invest
more in this as time allows.

All the code is in the `gc-meteor-full.js` file, it was just easier to work like
this in the new IDE.  Regarding the `gc-` prefix, this is to emphasize that these
aren't official packages for SockJS and Meteor, but partial implementations by me.
I guess router could be just `router`, after I've spent more time with it.

API's for Router and SockJS are below, but you don't really need to use them directly
beyond including them.  The Meteor example from the video follows below first, and the
actual website code is in the `website` directory.

Discussion on Espruino board: http://forum.espruino.com/conversations/1020/
Discussion on Meteor group: https://groups.google.com/forum/#!topic/meteor-talk/SYCjJk5cpPo 

### Meteor Example

Obviously in the future there'll be a cleaner API, possibly OO (see note above),
and examples for how to make your own collections and methods for servos,
sensors, etc.

```js
var WIFI_ESSID = "XXX";
var WIFI_PASSPHRASE = 'XXX';

var router = require('gc-router').router;
var sockjs = require('gc-sockjs').sockjs;

sockjs.router(router);
meteor.sockjs(sockjs);

router.addRoute('/', function(req, res) {
  res.writeHead(200);
  res.end("Hello World");
});

meteor.settablePins({
  'LED1': { color: 'red', state: false },
  'LED2': { color: 'green', state: false },
  'LED3': { color: 'blue', state: false }
});

meteor.watchPins(['BTN']);

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
```

### Router

Use like this:

```js
var router = require('gc-router').router;

router.addRoute('/', function(req, res) {
  res.writeHead(200);
  res.end("Hello World");
});

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
```

A asterisk ("*") wildcard is supported as the final character in the
path.  Nothing fancier than that yet (there is no RegExp implementation
in Espruino).  Potentially we could have an extra argument to match
against parsed query parameters.

### SockJS

Will probably be completely abandoned once we get native
websocket support [issue #258](https://github.com/espruino/Espruino/issues/258).

Accepts connections on the `/sockjs` prefix.  Partial implementation
of sockJS protocol, but enough to play with.  You can setup handlers
for received data and send data back to the client.

```js
var sockjs = require('gc-sockjs').sockjs;
sockjs.router(router);  // add routes to router

// receive data
sockjs.onMsg('msg', function(data) {
	// send reply (or sending in general)
	sockjs.send(this, {
		msg: 'something'
		other: 'data',
		andMore: 'data'
	});
});
```

`this` in handlers is the `session` object.  You should keep track of
`session.sessionId` to know who to talk to (they're all in `sockjs.sessions`).
`sockjs.getSession(id)` will return the session object if the `id` is known.
