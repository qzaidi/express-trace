
/*!
 * express-trace
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var http = require('http');
var logger = require('./backend/console');

/**
 * Export trace function.
 */

exports = module.exports = trace;

/**
 * Library version.
 */

exports.version = '0.0.3';

/**
 * Status code color map.
 */

var colors = {
    2: 32
  , 3: 36
  , 4: 33
  , 5: 31
};

/**
 * Trace middleware in the given `app`.
 *
 * @param {express.HTTPServer} app
 * @api public
 */

function trace(app) {
  var stack = app.stack
    , len = stack.length;

  for (var i = 0; i < len; ++i) {
    stack[i].handle = (function(route, fn){
      // TODO: mounted apps
      // TODO: route middleware

      // router
      if ('router' == fn.name) {
        for (var method in app.routes) {
          app.routes[method].forEach(function(route){

            // middleware
            route.callbacks = route.callbacks.map(function(fn,idx){
              if (fn.length == 4) {
                return fn;
              }

              return function(req, res, next){
                var name = req._routemw = fn.name || 'anonymous'
                  , start = req._tracer = new Date;

                logger('',1,name);

                fn(req, res, function(err){
                  logger('',1,name,new Date - start);
                  next(err);
                });
              }
            });
          });
        }
      }

      // regular middleware
      if (fn.length == 4) {
        console.log('skipping ' + fn.name);
        return fn; // no hooking errors currently
      } else {
        return function (req, res, next){
          var route = route || '/'
          , name = fn.name || 'anonymous'
          , router = 'router' == fn.name
          , start = new Date;

          // middleware
          logger(route,0,name);

          // duration
          fn(req, res, function(err){
            logger(route,0,name,new Date - start);
            next(err);
          });
        }
     }

      


    })(stack[i].route, stack[i].handle);
  }

  stack.unshift({
      route: ''
    , handle: function(req, res, next){
      var start = new Date;
      res.on('finish', function(){
        var color = colors[res.statusCode / 100 | 0];
        if (req._tracer) {
          logger('',1,req._routemw,new Date - req._tracer);
        }
        console.error('\n  \033[90mresponded to %s \033[33m%s\033[0m '
          + '\033[90min %dms with \033[' + color + 'm%s\033[0m'
          + ' \033[90m"%s"\033[0m'
          , req.method
          , req.url
          , new Date - start
          , res.statusCode
          , http.STATUS_CODES[res.statusCode]);
      });
      console.error('\n  \033[90m%s \033[33m%s\033[0m', req.method, req.url);
      next();
    }
  });

  stack.push({
      route: ''
    , handle: function(req, res, next){
      next();
    }
  });
  
  stack.push({
      route: ''
    , handle: function(err, req, res, next){
      req.__err = err;
      next(err);
    }
  });
};
