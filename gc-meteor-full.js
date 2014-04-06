var WIFI_ESSID = "XXX";
var WIFI_PASSPHRASE = 'XXX';

//var router = require('gc-router').router;
//var sockjs = require('gc-sockjs').sockjs;

// tmp
exports = {};

/* ************* gc-router.js *************** */

router = {

  routes: []

};

router.addRoute = function(path, options, func) {
	this.routes.push({
   path: path,
   func: func ? func : options,
   options: func ? options : {}
 });
};

router.incoming = function(req, res) {
  var routes = router.routes;
  var length = routes.length;

  // console.log(req);
  console.log(req.method + ' ' + req.url);

  for (var i=0; i < length; i++) {
    // no regexp yet :(
    var routePath, urlPath;

    if (routes[i].path[routes[i].path.length-1] == '*') {
      routePath = routes[i].path.substr(0, routes[i].path.length-2);
      urlPath = req.url.substr(0, routePath.length);
    } else {
      routePath = routes[i].path;
      urlPath = req.url;
    }

    if (urlPath == routePath) {

      // no 'end' emitter, no way to buffer data before calling handler :(
      // https://github.com/espruino/Espruino/issues/226
      routes[i].func(req, res);
      return;
    }
  }

  // No matching routes
  res.writeHead(404, {'Content-Type': 'text/plain'});
  res.write('404 Not found');
  res.end();

};

exports.router = router;


/* ************* gc-sockjs.js *************** */

// no websockets yet
// https://github.com/espruino/Espruino/issues/258

var HEARTBEAT_INTERVAL = 25;
var EXPIRE_INTERVAL = 60;

sockjs = {

  sessions: [],
  msgListeners: {}

};

sockjs.router = function(router) {
  // before /sockjs/* route
  router.addRoute('/sockjs/info?*', function(req, res) {
    res.writeHead(200, {
      "access-control-allow-origin": "*",
      "content-type:": "application/json; charset=UTF-8"
    });
    res.end(JSON.stringify({
      "cookie_needed": false,
      "entropy": "3135195014",
      "origins": "[*:*]",
      "websocket": false
    }));
  });

  // after /sockjs/info route
  router.addRoute('/sockjs/*', function(req, res) {
    var index = req.url.lastIndexOf('/');
    var file = req.url.substr(index+1);

    if (file == 'xhr')
      sockjs.xhr(req, res);
    else if (file == 'xhr_send')
      sockjs.xhr_send(req, res);
    else
      console.log('Unknown sockjs request: /' + file);
  });
};

sockjs.getSession = function(sessionId) {
  var sessions = this.sessions;
  var length = sessions.length;
  var session = null;
  for (var i=0; i < length; i++) {
    session = sessions[i];
    if (session.sessionId == sessionId)
      return session;
  }
  session = {
    state: 'new',
    queue: []
  };
  sessions.push(session);
  return session;
};

sockjs.send = function(session, data) {
  if (typeof(data) !== 'undefined') {
    session.queue.push(data);
  }
  if (session.queue.length && session.state == 'open' &&
      session.res !== null) {
    var output = [];
    for (var i=0; i < session.queue.length; i++)
      output.push(JSON.stringify(session.queue[i]));
    session.queue = [];
    output = 'a' + JSON.stringify(output) + '\n';
    console.log('[' + session.sessionId + '] < ' + output);
    session.res.end(output);
    session.res = null;
    session.state = 'ready';
    
    // oops, shouldn't actually affect heartbeats or should it?
    //session.lastSendAt = getTime();
    //console.log('snd lastSendAt ' + session.lastSendAt);
  }
};

sockjs.sendAll = function(data) {
  var sessions = sockjs.sessions;
  var length = sessions.length;
  for (var i=0; i < length; i++)
    sockjs.send(sessions[i], data);
};


sockjs.onMsg = function(msg, listener) {
  if (typeof(sockjs.msgListeners[msg]) === 'undefined')
    sockjs.msgListeners[msg] = [];
  sockjs.msgListeners[msg].push(listener);
};

sockjs.emitMsg = function(msg, session, data) {
  if (typeof(sockjs.msgListeners[msg]) === 'undefined')
    return;
  var listeners = sockjs.msgListeners[msg];
  for (var i=0; i < listeners.length; i++)
    listeners[i].call(session, data);
};

sockjs.onData = function(session, data) {
  console.log('['+session.sessionId + '] > ' + data);
  session.lastRecvAt = getTime();
  data = JSON.parse(data);
  var row;
  for (var i=0; i < data.length; i++) {
    console.log('  ' + i + ': ' + data[i]);
    row = JSON.parse(data[i]);
    sockjs.emitMsg(row.msg, session, row);
  }
};

if (sockjs.heart)
  clearInterval(sockjs.heart);
sockjs.heart = setInterval(function() {
  var sessions = sockjs.sessions;
  var length = sessions.length;
  var now = getTime();
  var session = null, diff = 0;
  for (var i=0; i < length; i++) {
    session = sessions[i];    
    if (now - sessions[i].lastRecvAt > EXPIRE_INTERVAL) {
      console.log('removing inactive ' + sessions[i].sessionId + ' in state ' + sessions[i].state);
      sessions.splice(i--, 1);
      length--;
    } else if (session.state == 'open' && now - sessions[i].lastSendAt > HEARTBEAT_INTERVAL) {
      if (session.res !== null)
        session.res.end('h\n');
      session.res = null;
      session.lastSendAt = getTime();
      console.log(' hb ' + session.sessionId + ' ' + (now - sessions[i].lastRecvAt) + ' ' + session.lastSendAt);
    }    
  }
}, 1000);

sockjs.xhr = function(req, res) {
  var path = req.url.substr(0, req.url.length-4); /* /xhr */
  var index = path.lastIndexOf('/');
  var sessionId = path.substr(index+1);
  var session = sockjs.getSession(sessionId);
  
  res.writeHead(200, {
    "access-control-allow-origin": session.origin || req.headers.Origin,
    "access-control-allow-credentials": true,
    "content-type:": "application/javascript; charset=UTF-8"
  });
  
  if (session.state == 'new') {
    session.sessionId = sessionId;
    session.origin = req.headers.Origin;
    session.state = 'ready';
    session.res = null;
    session.lastRecvAt = getTime();
    session.lastSendAt = getTime();
    res.end('o\n');
  } else {
    session.res = res;
    session.state = 'open';
    session.lastRecvAt = getTime();
    sockjs.send(session); // check for queued data
    // res._send();  // flush headers, keep connection open
  }
};

sockjs.xhr_send = function(req, res) {
  var path = req.url.substr(0, req.url.length-9); /* /xhr_send */
  var index = path.lastIndexOf('/');
  var sessionId = path.substr(index+1);
  var session = sockjs.getSession(sessionId);

  res.writeHead(204, {
    "access-control-allow-origin": req.headers.Origin,
    "access-control-allow-credentials": true,
    "content-type:": "text/plain; charset=UTF-8"
  });
  res.end();

  // anonymous func required to reference session
  // but lets keep it as small as possible
  // https://github.com/espruino/Espruino/issues/275
  req.body = '';  
  req.on('data', function(data) {
    req.body += data;
    var lastChar = data.substr(data.length-1,1);
    // workaround to queue data
    // https://github.com/espruino/Espruino/issues/226
    if (lastChar == ']')
      sockjs.onData(session, req.body);
  });
};

exports.sockjs = sockjs;


/* ************* gc-meteor.js *************** */

// https://github.com/meteor/meteor/blob/devel/packages/livedata/DDP.md

//var WebSocketServer = require('ws').Server;

meteor = {

  collections: {}
  
};

meteor.newCollection = function(name) {
  meteor.collections[name] = {};
};

meteor.update = function(colName, id, value) {
  if (meteor.collections[colName][id] === 'undefined') {
    sockjs.sendAll({
      msg: "added",
      collection: colName,
      id: id,
      fields: value
    });
  } else {
    sockjs.sendAll({
      msg: "changed",
      collection: colName,
      id: id,
      fields: value
    });    
  }
  meteor.collections[colName][id] = value;  
};

meteor.sockjs = function(sockjs) {
  sockjs.onMsg('connect', function(data) {
    console.log('got "connect", sending response');
    // should be somewhere else?
    sockjs.send(this, {"server_id":"0"});

    // this is the correct place :)
    sockjs.send(this, {
      msg: "connected",
      session: "NGnPN7tqNYbovLFJE"
    });
  });

  sockjs.onMsg('sub', function(data) {
    // currently sub names are just the collection, no queries
    var col = data.name;
    for (var id in meteor.collections[col])
      sockjs.send(this, {
        msg: "added",
        collection: col,
        id: id,
        fields: meteor.collections[col][id]
      });
    sockjs.send(this, {
      msg: 'ready',
      subs: [data.id]
    });
  });

  sockjs.onMsg('method', function(data) {
    if (!meteor._methods[data.method])
      return;
    
    var result = meteor._methods[data.method].apply(this, data.params);
    sockjs.send(this, {
      msg: "result",
      id: data.id
    });
    sockjs.send(this, {
      msg: "updated",
      methods: [ data.id ]
    });
  });
};

meteor.newCollection('pins');

meteor.watchPins = function(pinList) {
  var pin = pinList[0];
  meteor.update('pins', 'BTN', { state: false });
  setWatch(function(data) {
    // https://github.com/espruino/Espruino/issues/286
    if (typeof data.lastTime === 'undefined')
      delete data.lastTime;
    meteor.update('pins', pin, data);
  }, pin, { repeat: true });
  
//  var length = pinList.length;
//  for (var i=0; i < length; i++) {
    // need a seperate anonymous func for each since
    // event doesn't include the pin info
    // https://github.com/espruino/Espruino/issues/275
//    setWatch(function(data) {
    // d'oh, we'll need a generator function for the
    // for loop, too lazy now :>
};

meteor.settablePins = function(pins) {
  for (var key in pins)
    meteor.update('pins', key, pins[key]);
};

meteor._methods = [];
meteor._methods['/pins/update'] = function(selector, query) {
  var id = selector._id;
  var data = meteor.collections.pins[id];
  data.state = query.$set.state;
  digitalWrite(id, data.state);
  meteor.update('pins', id, data);  
};

/* ************* example.js *************** */

var router = require('gc-router').router;
var sockjs = require('gc-sockjs').sockjs;

sockjs.router(router);

router.addRoute('/', function(req, res) {
  res.writeHead(200);
  res.end("Hello World");
});

meteor.sockjs(sockjs);

meteor.settablePins({
  'LED1': { color: 'red', state: false },
  'LED2': { color: 'green', state: false },
  'LED3': { color: 'blue', state: false }
});

meteor.watchPins(['BTN']);


// $('ul.port-list').find('[data-port]').eq(0).data('port', '/dev/ttyACM0').click();


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
