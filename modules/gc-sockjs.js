// http://sockjs.github.io/sockjs-protocol/sockjs-protocol-0.3.html

sockjs = {

  sessions: [],
  msgListeners: {}

};

sockjs.attachTo = function(router) {
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
    console.log('sockjs route: ' + file);

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
    console.log('queuing data ', data);
    session.queue.push(data);
  }
  console.log('queue length: ' + session.queue.length);
  console.log('state: ' + session.state);
  if (session.queue.length && session.state == 'open') {
    var output = [];
    for (var i=0; i < session.queue.length; i++)
      output.push(JSON.stringify(session.queue[i]));
    session.queue = [];
    output = JSON.stringify(output);                  
    console.log('sending to ' + session.sessionId + ': ' + output);
    session.res.end(output);
    session.res = null;
    session.state = ready;
  }
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
//  console.log(session.sessionId + ' got ' + data);
  data = JSON.parse(data);
  var row;
  for (var i=0; i < data.length; i++) {
    row = JSON.parse(data[i]);
    console.log(session.sessionId + ' got ' + row);
    sockjs.emitMsg(msg, session, row);
    //meteor.gotMsg(row.msg, session, row);
  }
};

sockjs.xhr = function(req, res) {
  var path = req.url.substr(0, req.url.length-4); /* /xhr */
  var index = path.lastIndexOf('/');
  var sessionId = path.substr(index+1);
  var session = sockjs.getSession(sessionId);
  console.log('sessionId: ' + sessionId);
  
  res.writeHead(200, {
    "access-control-allow-origin": session.origin || req.headers.Origin,
    "access-control-allow-credentials": true,
    "content-type:": "application/javascript; charset=UTF-8"
  });
  
  if (session.state == 'new') {
    console.log('new session');
    session.sessionId = sessionId;
    session.origin = req.headers.Origin;
    session.state = 'ready';
    session.res = null;
    res.end('o\n');
  } else {
    console.log('existing');
    session.res = res;
    session.state = 'open';
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
  req.on('data', function(data) {
    sockjs.onData(session, data);
  });
};

exports.sockjs = sockjs;
