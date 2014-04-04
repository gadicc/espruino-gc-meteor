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
