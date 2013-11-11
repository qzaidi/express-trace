/*!
 * express-trace
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

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

                logger.log(req._ctx,'',name);

                fn(req, res, function(err){
                  logger.log(req._ctx,'',name,new Date - start);
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
          logger.log(req._ctx,route,name);

          // duration
          fn(req, res, function(err){
            logger.log(req._ctx,route,name,new Date - start);
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
        var now = new Date;
        if (req._tracer) {
          logger.log(req._ctx,'',req._routemw,now - req._tracer);
        }
        logger.end(req._ctx || {},res.statusCode,now - start);
      });
      req._ctx = logger.start(req);
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
