
/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("component-reduce/index.js", function(exports, require, module){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
});
require.register("visionmedia-superagent/lib/client.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? this
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

function getXHR() {
  if (root.XMLHttpRequest
    && ('file:' != root.location.protocol || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
}

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(obj[key]));
    }
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  this.text = this.xhr.responseText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status || 1223 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var path = req.path;

  var msg = 'cannot ' + method + ' ' + path + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.path = path;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var res = new Response(self);
    if ('HEAD' == method) res.text = null;
    self.callback(null, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  if (2 == fn.length) return fn(err, res);
  if (err) return this.emit('error', err);
  fn(res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;
    if (0 == xhr.status) {
      if (self.aborted) return self.timeoutError();
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  if (xhr.upload) {
    xhr.upload.onprogress = function(e){
      e.percent = e.loaded / e.total * 100;
      self.emit('progress', e);
    };
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

});
require.register("optimuslime-win-query/lib/win-query.js", function(exports, require, module){
var request = require('superagent');

module.exports = winquery;

function winquery(backbone, globalConfig, localConfig)
{
  var self= this;

  //need to make requests, much like win-publish
  //pull in backbone info, we gotta set our logger/emitter up
  var self = this;

  self.winFunction = "query";

  //this is how we talk to win-backbone
  self.backEmit = backbone.getEmitter(self);

  //grab our logger
  self.log = backbone.getLogger(self);

  //only vital stuff goes out for normal logs
  self.log.logLevel = localConfig.logLevel || self.log.normal;

  //we have logger and emitter, set up some of our functions

  if(!globalConfig.server || !globalConfig.port)
    throw new Error("Global configuration requires server location and port")

  self.hostname = globalConfig.server;
  self.port = globalConfig.port;

  var baseWIN = function()
  {
    return self.hostname + ":" + self.port + "/api";
  }

  self.getWIN = function(apiPath, queryObjects, resFunction)
  {
    var base = baseWIN();

    if(typeof queryObjects == "function")
    {
      resFunction = queryObjects;
      queryObjects = {};
    }
    else //make sure to always have at least an empty object
      queryObjects = queryObjects || {};

    var qNotEmpty = false;
    var queryAdditions = "?";
    for(var key in queryObjects){
      if(queryAdditions.length > 1)
        queryAdditions += "&";

      qNotEmpty = true;
      queryAdditions += key + "=" + queryObjects[key];
    } 
    var fullPath = base + apiPath + (qNotEmpty ? queryAdditions : "");

    self.log("Requesting get from: ",fullPath )
    request
      .get(fullPath)
      // .send(data)
      .set('Accept', 'application/json')
      .end(resFunction);
  }

  self.postWIN = function(apiPath, data, resFunction)
  {
    var base = baseWIN();

    var fullPath= base + apiPath;
    self.log("Requesting post to: ",fullPath )

    request
      .post(fullPath)
      .send(data)
      .set('Accept', 'application/json')
      .end(resFunction);
  }

  //what events do we need?
  //none for now, though in the future, we might have a way to communicate with foreign win-backbones as if it was just sending
  //a message within our own backbone -- thereby obfuscating what is done remotely and what is done locally 
  self.requiredEvents = function()
  {
    return [
    ];
  }

  //what events do we respond to?
  self.eventCallbacks = function()
  { 
    return {
      "query:getArtifacts" : self.getArtifacts,
      "query:getSeeds" : self.getSeeds,
      "query:getHomeQuery" : self.getHomeData
    };
  }
  self.getArtifacts = function(type, list, finished)
  {
    var apiPath = "/artifacts";

    var lstring;
    //combine artifacts together
    if(typeof list == "string")
    {
      lString = list;
    }
    else if(Array.isArray(list))
    {
      lString = list.join(',');
    }

    self.getWIN(apiPath, {artifactType: type, wids: list}, function(err, res)
    {
      // self.log("Artifact return: ", err, " res: ", res.error);
      if(err)
      {
        finished(err);
        return;
      }
      else if(res.statusCode == 500 || res.statusCode == 404)
      {
        finished("Server Artifacts failure: " + JSON.stringify(res.error) + " | message: " + err.message);
        return;
      }

      //otherwise, all good -- pass the body back -- just a list of artifacts
      finished(undefined, res.body);

    });
  }
  self.getHomeData = function(start, end, finished)
  {
    //simply make a request that fetches the different categories from the server
    var apiPath = '/home/recent';
      
    //send start/end for knowing which part to look through

    self.getWIN(apiPath, {start: start, end: end}, function(err, res)
    {
      self.log("Artifact return: ", err, " res: ", res.error);
      if(err)
      {
        finished(err);
        return;
      }
      else if(res.statusCode == 500 || res.statusCode == 404)
      {
        finished("Server Home failure: " + JSON.stringify(res.error) + " | message: " + err.message);
        return;
      }

      //otherwise, all good
      finished(undefined, {"recent" : res.body});

    });
  }
  self.getSeeds = function(type, maxCount, finished)
  {
    var apiPath = "/seeds";

    //grab the seeds (up to a maximum number)
    self.getWIN(apiPath, {maxSeeds: maxCount}, function(err, res)
    {
      // self.log("Artifact return: ", err, " res: ", res.error);
      if(err)
      {
        finished(err);
        return;
      }
      else if(res.statusCode == 500 || res.statusCode == 404)
      {
        finished("Server Seed failure: " + JSON.stringify(res.error) + " | message: " + err.message);
        return;
      }

      //otherwise, all good -- pass the body back -- just a list of artifacts
      finished(undefined, res.body);

    });
  }

  return self;

}


});
require.register("optimuslime-win-data/lib/win-data.js", function(exports, require, module){
var request = require('superagent');

module.exports = windata;


function windata(backbone, globalConfig, localConfig)
{
	var self= this;

	//need to make requests, much like win-publish
	//pull in backbone info, we gotta set our logger/emitter up
	var self = this;

	self.winFunction = "data";

	//this is how we talk to win-backbone
	self.backEmit = backbone.getEmitter(self);

	//grab our logger
	self.log = backbone.getLogger(self);

	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	//we have logger and emitter, set up some of our functions

	if(!globalConfig.server || !globalConfig.port)
		throw new Error("Global configuration requires server location and port")

	self.hostname = globalConfig.server;
	self.port = globalConfig.port;

	//what events do we need?
	//none for now, though in the future, we might have a way to communicate with foreign win-backbones as if it was just sending
	//a message within our own backbone -- thereby obfuscating what is done remotely and what is done locally 
	self.requiredEvents = function()
	{
		return [
		];
	}

	//what events do we respond to?
	self.eventCallbacks = function()
	{ 
		return {
			"data:winPOST" : self.postWIN,
			"data:winGET" : self.getWIN
		};
	}

	 var baseWIN = function()
	{
		return self.hostname + ":" + self.port + "/api";
	}

	self.getWIN = function(apiPath, queryObjects, resFunction)
	{
		var base = baseWIN();

		if(typeof queryObjects == "function")
		{
		  resFunction = queryObjects;
		  queryObjects = {};
		}
		else //make sure to always have at least an empty object
		  queryObjects = queryObjects || {};

		var qNotEmpty = false;
		var queryAdditions = "?";
		for(var key in queryObjects){
		  if(queryAdditions.length > 1)
		    queryAdditions += "&";

		  qNotEmpty = true;
		  queryAdditions += key + "=" + queryObjects[key];
		} 
		var fullPath = base + apiPath + (qNotEmpty ? queryAdditions : "");

		self.log("Requesting get from: ",fullPath )
		request
		  .get(fullPath)
		  // .send(data)
		  .set('Accept', 'application/json')
		  .end(resFunction);
	}

	self.postWIN = function(apiPath, data, resFunction)
	{
		var base = baseWIN();

		var fullPath= base + apiPath;
		self.log("Requesting post to: ",fullPath )

		request
		  .post(fullPath)
		  .send(data)
		  .set('Accept', 'application/json')
		  .end(resFunction);
	}


	return self;
}



});
require.register("optimuslime-win-utils/winutils.js", function(exports, require, module){

var winutils = {};

module.exports = winutils;

//right now, it's all we have setup -- later there will be more utilities
winutils.cuid = require('./uuid/cuid.js');

winutils.math = require('./math/winmath.js');


});
require.register("optimuslime-win-utils/uuid/cuid.js", function(exports, require, module){
/**
 * cuid.js
 * Collision-resistant UID generator for browsers and node.
 * Sequential for fast db lookups and recency sorting.
 * Safe for element IDs and server-side lookups.
 *
 * Extracted from CLCTR
 * 
 * Copyright (c) Eric Elliott 2012
 * MIT License
 */
//From: https://github.com/dilvie/cuid

//note that module.exports is at the end -- it exports the api variable

/*global window, navigator, document, require, process, module */
var c = 0,
    blockSize = 4,
    base = 36,
    discreteValues = Math.pow(base, blockSize),

    pad = function pad(num, size) {
      var s = "000000000" + num;
      return s.substr(s.length-size);
    },

    randomBlock = function randomBlock() {
      return pad((Math.random() *
            discreteValues << 0)
            .toString(base), blockSize);
    },

    api = function cuid() {
      // Starting with a lowercase letter makes
      // it HTML element ID friendly.
      var letter = 'c', // hard-coded allows for sequential access

        // timestamp
        // warning: this exposes the exact date and time
        // that the uid was created.
        timestamp = (new Date().getTime()).toString(base),

        // Prevent same-machine collisions.
        counter,

        // A few chars to generate distinct ids for different
        // clients (so different computers are far less
        // likely to generate the same id)
        fingerprint = api.fingerprint(),

        // Grab some more chars from Math.random()
        random = randomBlock() + randomBlock() + randomBlock() + randomBlock();

        c = (c < discreteValues) ? c : 0;
        counter = pad(c.toString(base), blockSize);

      c++; // this is not subliminal

      return  (letter + timestamp + counter + fingerprint + random);
    };

api.slug = function slug() {
  var date = new Date().getTime().toString(36),
    counter = c.toString(36).slice(-1),
    print = api.fingerprint().slice(0,1) +
      api.fingerprint().slice(-1),
    random = randomBlock().slice(-1);

  c++;

  return date.slice(2,4) + date.slice(-2) + 
    counter + print + random;
};

//fingerprint changes based on nodejs or component setup
var isBrowser = (typeof process == 'undefined');

api.fingerprint = isBrowser ?
  function browserPrint() {
      return pad((navigator.mimeTypes.length +
          navigator.userAgent.length).toString(36) +
          api.globalCount().toString(36), 4);
  }
: function nodePrint() {
  var os = require('os'),

  padding = 2,
  pid = pad((process.pid).toString(36), padding),
  hostname = os.hostname(),
  length = hostname.length,
  hostId = pad((hostname)
    .split('')
    .reduce(function (prev, char) {
      return +prev + char.charCodeAt(0);
    }, +length + 36)
    .toString(36),
  padding);
return pid + hostId;
};

api.globalCount = function globalCount() {
    // We want to cache the results of this
    var cache = (function calc() {
        var i,
            count = 0;

            //global count only ever called inside browser environment
            //lets loop through and count the keys in window -- then cahce that as part of our fingerprint
        for (i in window) {
            count++;
        }

        return count;
    }());

    api.globalCount = function () { return cache; };
    return cache;
};

api.isLessThan = function(first, second)
{
  var fParse= parseInt(first);
  var sParse = parseInt(second);
  if(isNaN(fParse) && isNaN(sParse))
  {
     //tease apart first, second to determine which ID came first
    //counter + fingerprint + random = 6 blocks of 4 = 24
    var dateEnd = 6*blockSize;
    var counterEnd = 5*blockSize;
    var charStart = 1;

    //convert the base-36 time string to base 10 number -- parseint handles this by sending in the original radix
    var firstTime = parseInt(first.slice(charStart, first.length - dateEnd), base);
    //ditto for counter
    var firstCounter = parseInt(first.slice(first.length - dateEnd, first.length - counterEnd),base);

    //convert the base-36 time string to base 10 number -- parseint handles this by sending in the original radix
    var secondTime =  parseInt(second.slice(charStart, second.length - dateEnd), base);
    
    //ditto for counter 
    var secondCounter = parseInt(second.slice(second.length - dateEnd, second.length - counterEnd), base);

    //either the first time is less than the second time, and we answer this question immediately
    //or the times are equal -- then we pull the lower counter
    //techincially counters can wrap, but this won't happen very often AND this is all for measuring disjoint/excess behavior
    //the time should be enough of an ordering principal for this not to matter
    return firstTime < secondTime || (firstTime == secondTime && firstCounter < secondCounter);

  }
  else if(isNaN(sParse))
  {
    //if sParse is a string, then the first is a number and the second is a string UUID
    //to maintain backwards compat -- number come before strings in neatjs ordering
    return true;
  }//both are not NaN -- we have two numbers to compare
  else
  {
    return fParse < sParse;
  }
}

//we send out API
module.exports = api;




});
require.register("optimuslime-win-utils/math/winmath.js", function(exports, require, module){

var mathHelper = {};

module.exports = mathHelper;

mathHelper.next = function(max)
{
    return Math.floor(Math.random()*max);
};

});
require.register("optimuslime-traverse/index.js", function(exports, require, module){
var traverse = module.exports = function (obj) {
    return new Traverse(obj);
};

function Traverse (obj) {
    this.value = obj;
}

Traverse.prototype.get = function (ps) {
    var node = this.value;
    for (var i = 0; i < ps.length; i ++) {
        var key = ps[i];
        if (!node || !hasOwnProperty.call(node, key)) {
            node = undefined;
            break;
        }
        node = node[key];
    }
    return node;
};

Traverse.prototype.has = function (ps) {
    var node = this.value;
    for (var i = 0; i < ps.length; i ++) {
        var key = ps[i];
        if (!node || !hasOwnProperty.call(node, key)) {
            return false;
        }
        node = node[key];
    }
    return true;
};

Traverse.prototype.set = function (ps, value) {
    var node = this.value;
    for (var i = 0; i < ps.length - 1; i ++) {
        var key = ps[i];
        if (!hasOwnProperty.call(node, key)) node[key] = {};
        node = node[key];
    }
    node[ps[i]] = value;
    return value;
};

Traverse.prototype.map = function (cb) {
    return walk(this.value, cb, true);
};

Traverse.prototype.forEach = function (cb) {
    this.value = walk(this.value, cb, false);
    return this.value;
};

Traverse.prototype.reduce = function (cb, init) {
    var skip = arguments.length === 1;
    var acc = skip ? this.value : init;
    this.forEach(function (x) {
        if (!this.isRoot || !skip) {
            acc = cb.call(this, acc, x);
        }
    });
    return acc;
};

Traverse.prototype.paths = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.path); 
    });
    return acc;
};

Traverse.prototype.nodes = function () {
    var acc = [];
    this.forEach(function (x) {
        acc.push(this.node);
    });
    return acc;
};

Traverse.prototype.clone = function () {
    var parents = [], nodes = [];
    
    return (function clone (src) {
        for (var i = 0; i < parents.length; i++) {
            if (parents[i] === src) {
                return nodes[i];
            }
        }
        
        if (typeof src === 'object' && src !== null) {
            var dst = copy(src);
            
            parents.push(src);
            nodes.push(dst);
            
            forEach(objectKeys(src), function (key) {
                dst[key] = clone(src[key]);
            });
            
            parents.pop();
            nodes.pop();
            return dst;
        }
        else {
            return src;
        }
    })(this.value);
};

function walk (root, cb, immutable) {
    var path = [];
    var parents = [];
    var alive = true;
    
    return (function walker (node_) {
        var node = immutable ? copy(node_) : node_;
        var modifiers = {};
        
        var keepGoing = true;
        
        var state = {
            node : node,
            node_ : node_,
            path : [].concat(path),
            parent : parents[parents.length - 1],
            parents : parents,
            key : path.slice(-1)[0],
            isRoot : path.length === 0,
            level : path.length,
            circular : null,
            update : function (x, stopHere) {
                if (!state.isRoot) {
                    state.parent.node[state.key] = x;
                }
                state.node = x;
                if (stopHere) keepGoing = false;
            },
            'delete' : function (stopHere) {
                delete state.parent.node[state.key];
                if (stopHere) keepGoing = false;
            },
            remove : function (stopHere) {
                if (isArray(state.parent.node)) {
                    state.parent.node.splice(state.key, 1);
                }
                else {
                    delete state.parent.node[state.key];
                }
                if (stopHere) keepGoing = false;
            },
            keys : null,
            before : function (f) { modifiers.before = f },
            after : function (f) { modifiers.after = f },
            pre : function (f) { modifiers.pre = f },
            post : function (f) { modifiers.post = f },
            stop : function () { alive = false },
            block : function () { keepGoing = false }
        };
        
        if (!alive) return state;
        
        function updateState() {
            if (typeof state.node === 'object' && state.node !== null) {
                if (!state.keys || state.node_ !== state.node) {
                    state.keys = objectKeys(state.node)
                }
                
                state.isLeaf = state.keys.length == 0;
                
                for (var i = 0; i < parents.length; i++) {
                    if (parents[i].node_ === node_) {
                        state.circular = parents[i];
                        break;
                    }
                }
            }
            else {
                state.isLeaf = true;
                state.keys = null;
            }
            
            state.notLeaf = !state.isLeaf;
            state.notRoot = !state.isRoot;
        }
        
        updateState();
        
        // use return values to update if defined
        var ret = cb.call(state, state.node);
        if (ret !== undefined && state.update) state.update(ret);
        
        if (modifiers.before) modifiers.before.call(state, state.node);
        
        if (!keepGoing) return state;
        
        if (typeof state.node == 'object'
        && state.node !== null && !state.circular) {
            parents.push(state);
            
            updateState();
            
            forEach(state.keys, function (key, i) {
                path.push(key);
                
                if (modifiers.pre) modifiers.pre.call(state, state.node[key], key);
                
                var child = walker(state.node[key]);
                if (immutable && hasOwnProperty.call(state.node, key)) {
                    state.node[key] = child.node;
                }
                
                child.isLast = i == state.keys.length - 1;
                child.isFirst = i == 0;
                
                if (modifiers.post) modifiers.post.call(state, child);
                
                path.pop();
            });
            parents.pop();
        }
        
        if (modifiers.after) modifiers.after.call(state, state.node);
        
        return state;
    })(root).node;
}

function copy (src) {
    if (typeof src === 'object' && src !== null) {
        var dst;
        
        if (isArray(src)) {
            dst = [];
        }
        else if (isDate(src)) {
            dst = new Date(src.getTime ? src.getTime() : src);
        }
        else if (isRegExp(src)) {
            dst = new RegExp(src);
        }
        else if (isError(src)) {
            dst = { message: src.message };
        }
        else if (isBoolean(src)) {
            dst = new Boolean(src);
        }
        else if (isNumber(src)) {
            dst = new Number(src);
        }
        else if (isString(src)) {
            dst = new String(src);
        }
        else if (Object.create && Object.getPrototypeOf) {
            dst = Object.create(Object.getPrototypeOf(src));
        }
        else if (src.constructor === Object) {
            dst = {};
        }
        else {
            var proto =
                (src.constructor && src.constructor.prototype)
                || src.__proto__
                || {}
            ;
            var T = function () {};
            T.prototype = proto;
            dst = new T;
        }
        
        forEach(objectKeys(src), function (key) {
            dst[key] = src[key];
        });
        return dst;
    }
    else return src;
}

var objectKeys = Object.keys || function keys (obj) {
    var res = [];
    for (var key in obj) res.push(key)
    return res;
};

function toS (obj) { return Object.prototype.toString.call(obj) }
function isDate (obj) { return toS(obj) === '[object Date]' }
function isRegExp (obj) { return toS(obj) === '[object RegExp]' }
function isError (obj) { return toS(obj) === '[object Error]' }
function isBoolean (obj) { return toS(obj) === '[object Boolean]' }
function isNumber (obj) { return toS(obj) === '[object Number]' }
function isString (obj) { return toS(obj) === '[object String]' }

var isArray = Array.isArray || function isArray (xs) {
    return Object.prototype.toString.call(xs) === '[object Array]';
};

var forEach = function (xs, fn) {
    if (xs.forEach) return xs.forEach(fn)
    else for (var i = 0; i < xs.length; i++) {
        fn(xs[i], i, xs);
    }
};

forEach(objectKeys(Traverse.prototype), function (key) {
    traverse[key] = function (obj) {
        var args = [].slice.call(arguments, 1);
        var t = new Traverse(obj);
        return t[key].apply(t, args);
    };
});

var hasOwnProperty = Object.hasOwnProperty || function (obj, key) {
    return key in obj;
};

});
require.register("optimuslime-win-phylogeny/lib/win-phylogeny.js", function(exports, require, module){
//this will help us navigate complicated json tree objects
var traverse = require('optimuslime-traverse');

module.exports = winphylogeny;

function winphylogeny(backbone, globalConfig, localConfig)
{
	var self= this;

	//need to make requests, much like win-publish
	//pull in backbone info, we gotta set our logger/emitter up
	var self = this;

	self.winFunction = "phylogeny";

	//this is how we talk to win-backbone
	self.backEmit = backbone.getEmitter(self);

	//grab our logger
	self.log = backbone.getLogger(self);

	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	//we have logger and emitter, set up some of our functions

	//what events do we need?
	//none for now, though in the future, we might have a way to communicate with foreign win-backbones as if it was just sending
	//a message within our own backbone -- thereby obfuscating what is done remotely and what is done locally 
	self.requiredEvents = function()
	{
		return [
			"data:winGET"
		];
	}

	//what events do we respond to?
	self.eventCallbacks = function()
	{ 
		return {
			"phylogeny:fullAncestry" : self.fullAncestry,
			//for now, partial == full -- for now
			"phylogeny:partialAncestry" : self.fullAncestry,
			"phylogeny:fullTreeOfArtifacts" : self.getFullTreeOfArtifacts,
			"phylogeny:buildTreeOfArtifacts" : self.buildTreeOfArtifacts
		};	
	}

	self.fullAncestry = function(finished)
	{
		//
		self.log("WARNING: calling full phylogeny might be dangerously consuming for the server. Therefore, this is a two step function." + 
			" I give you a function, you call the function. ");
		self.log("In the future, there will be an authorization password for doing this. This will deter accidents for now");

		//send it back -- no error
		finished(undefined, self.internalFullPhylogeny);
	}

	self.internalFullPhylogeny = function(artifactType, password, finished)
	{
		//query all artifacts from our server -- use a password please
		self.backEmit("data:winGET", "/artifacts", {artifactType: artifactType, all: true, password: password}, function(err, res){
			
			if(err)
			{
				finished(err);
				return;
			}
			else if(res.statusCode == 500 || res.statusCode == 404)
			{
				finished("Server full phylogeny failure: " + JSON.stringify(res.error) + " | message: " + err.message);
				return;
			}
			//there is an implicit assumption here that there aren't complicated parent child relationships here -- like 1 to 1 
			//uh oh for iesor?

			var artifacts = res.body;

			var childrenToParents = {};
			var parentsToChildren = {};

			var childrenParentCount = {};
			var parentChildrenCount = {};

			var widArtifacts = {};
			
			//this is for main artifacts
			for(var i=0; i < artifacts.length; i++)
			{
				var aChild = artifacts[i];
				var aWID = aChild.wid;
				var parents = aChild.parents;

				//a simple mapping from artifactWID to object
				widArtifacts[aWID] = aChild;

				var c2pObject = childrenToParents[aWID];
				if(!c2pObject)
				{
					c2pObject = {};
					childrenParentCount[aWID] = parents.length;
					childrenToParents[aWID] = c2pObject;
				}
				var p2cObject;
				for(var p=0; p < parents.length; p++)
				{
					var aParWID = parents[p];
					//now we map children to parents
					p2cObject = parentsToChildren[aParWID]; 
					if(!p2cObject)
					{
						p2cObject = {};
						parentChildrenCount[aParWID] = 0;
						parentsToChildren[aParWID] = p2cObject;
					}

					//now we have all information here
					//the child object marks the parent object
					c2pObject[aParWID] = true;

					//the parent object marks the child wid as a child
					p2cObject[aWID] = true;

					//increment the child count
					parentChildrenCount[aParWID]++;
				}

				//now we know all the parents for this artifact, and all the parents know this is a child
			}

			finished(undefined, {
				artifacts :  widArtifacts,
				parentsToChildren: parentsToChildren, 
				childrenToParents: childrenToParents, 
				artifactCount: artifacts.length, 
				childrenParentCount: childrenParentCount
			});

		});
	}

	//grab the full tree
	self.getFullTreeOfArtifacts = function(finished)
	{
		self.log("WARNING: calling full phylogeny/artifact tree might be dangerously consuming for the server. Therefore, this is a two step function. I give you a function, you call the function. ");
		self.log("In the future, there will be an authorization password for doing this. This will deter accidents for now");

		//send it back -- no error
		finished(undefined, self.internalFullTree);
	}
	self.internalFullTree = function(artifactType, password, finished)
	{
		//two step process, grab phylo info, then work on the tree
		self.internalFullPhylogeny(artifactType, password, function(err, artStuff)
		{
			if(err)
			{
				finished(err);
				return;
			}

			self.buildTreeOfArtifacts(artStuff, function(err, tree)
			{
				//if we have an err, it'll be passed on anyways
				finished(err, tree);
			});
		});
	}

	//we build up a full tree here
	self.buildTreeOfArtifacts = function(artObject, finished)
	{
		//got all these artifcats yo
		var artifacts = artObject.artifacts;
		var parentsToChildren  = artObject.parentsToChildren;
		var childrenToParents = artObject.childrenToParents;
		var artifactCount = artObject.artifactCount;
		var childrenParentCount = artObject.childrenParentCount;

		//so we know who is root by how many parents they have
		// self.log("C2PCount: ", childrenParentCount);

		var minChildren = Number.MAX_VALUE;
		//get the minimum
		for(var key in childrenParentCount)
			minChildren = Math.min(minChildren, childrenParentCount[key]);
	
		self.log("Minimum children among arts: " , minChildren);
		//let's follow the chain, and build a tree of sorts
		//at the top are the roots
		var root = {};
		for(var key in childrenParentCount)
		{
			//these are root objects -- they don't have any parents!
			if(childrenParentCount[key] == minChildren)
				root[key] = {};
		}

	
		//let's turn this tree into numbers, and the appropriate mapping for each artifact
		//first we'll go by layers -- mapping objects to lyaers

		//we need a real list of layers
		function recursiveTrueLayers(layer, wid, trueLayers, p2c)
		{
			var layerInfo = trueLayers[wid];

			//looking for layer info for children after we set
			//we set each object EVERY time we see it -- but do not investigate those already checked
			if(layerInfo)
				return;

			//otherwise, we don't exist!
			layerInfo = {layer: layer};
			//make it part of our object
			trueLayers[wid] = layerInfo;

			//all done with that, lets check our children and their parents!
			var children = p2c[wid];

			//making our job easy, nothing to do here
			if(!children)
				return;

			var childLayer = layerInfo.layer + 1;

			//loop through our children
			for(var widChild in children)
			{
				//look at our children, their layers are the max of our layer + 1
				recursiveTrueLayers(childLayer, widChild, trueLayers, p2c);

				//it must exist
				var clObject = trueLayers[widChild];

				//either its the current layer -- or the original layer determined (whichever is greater)
				clObject.layer = Math.max(clObject.layer, childLayer); 
			}
		}

		//we need things with the proper dependencies
		var artifactsToLayers = {};
		var layersToArtifacts = {};

		//starting from root -- find true layering info by recursively examining children
		for(var wid in root)
		{
			var startLayer = 0;
			recursiveTrueLayers(startLayer, wid, artifactsToLayers, parentsToChildren);
		}

		//appropriate layers
		for(var wid in artifactsToLayers)
		{
			//grab the layer
			var layer = artifactsToLayers[wid].layer;

			//grab the existing layer
			var layer2Art = layersToArtifacts[layer]; 
			if(!layer2Art)
 			{
 				layer2Art = {};
 				layersToArtifacts[layer] = layer2Art;
			}

			//layer to objects
			layer2Art[wid] = artifacts[wid];
		}

		//now we have layers of objects
		self.log("Artifacts to layers: ", layersToArtifacts);

		var buildNames = {};
		var links = [];

		//we now have all the info needed to name something
		var fullTreeNames = {};


		//because it's in layers, it is guaranteed to be in order of the tree of dependencies
		//that is, every child can reference a parent and the naming will be done by induction
		for(var layer in layersToArtifacts)
		{	
			var lCount = 0;
			for(var wid in layersToArtifacts[layer])
			{
				var artifact = layersToArtifacts[layer][wid];

				//what's the base -- the layer, and count of object
				var baseName = [layer, lCount++].join('-');

				//now we need to note our parents by their layer ids 
				var name =  {base: baseName, parents: []};
				
				//parents? Everyone is at least an empty array
				var parents = Object.keys(childrenToParents[wid]);

				for(var i=0; i < parents.length; i++)
				{
					//grab our parent ids
					var pWID = parents[i];
					name.parents.push(buildNames[pWID].base);
				}

				//now we have everything we need in name
				name.fullName = name.base + (name.parents.length ? "_p_" + name.parents.join('_') : "");
				name.artifact = artifact;

				//need to link parent and child
				for(var i=0; i < parents.length; i++)
				{	
					var pWID = parents[i];
					links.push({source: buildNames[pWID].fullName, target: name.fullName});
				}

				//all done, we have naming info
				buildNames[wid] = name;	

				//we have all we need for full names
				fullTreeNames[wid] = name.fullName;
			}
		}

		//have build identification
		//yeah boyeee
		//send back what we know about the tree stuffff
		finished(undefined, {nameTree: fullTreeNames, artifacts: artifacts, links: links});
	}

	self.recursiveFollowChildren = function(layer, wid, build, p2c, alreadyInvestigated, treeProperties)
	{
		//grab our potential children (might not exist)
		var children = p2c[wid];

		//this is the child of the build object -- everything must make one!
		build[wid] = {layer: layer};

		//how deep do we go???
		treeProperties.maxLayer = Math.max(treeProperties.maxLayer, layer);

		//still counts!
		treeProperties.totalCount++;

		//this object ain't got no children
		if(!children)
		{
			//no children, mark as leaf, count leaves, peace!
			treeProperties.leafCount++;

			//we're the end of the line -- here we simple store something?
			build[wid].isLeaf = true;

			return;
		}
		
		//these are all the children we need to investigate
		var investigate = Object.keys(children);	
		
		//otherwise we have to investigate all our children -- no duplicates please
		for(var i=0; i < investigate.length; i++)
		{	
			var iWID = investigate[i];

			//make sure not to fall into infinite recursion -- the worst way to die 
			if(!alreadyInvestigated[iWID])
			{
				//mark as seen
				alreadyInvestigated[iWID] = true;

				//how many non leafs do we have?
				treeProperties.nonLeafCount++;

				//keep building!
				self.recursiveFollowChildren(layer + 1, iWID, build[wid], p2c, alreadyInvestigated, treeProperties);
			}
			else
			{
				//we have seen this already, we have a cycle
				treeProperties.hasCycle = true;
				if(!treeProperties.cycle)
					treeProperties.cycle = {};

				//grab all the objects responsible for causing a cycle -- this can affect layers later
				treeProperties.cycle[iWID] = true;

			}			
		}
	}

	return self;
}







});
require.register("techjacker-q/q.js", function(exports, require, module){
// vim:ts=4:sts=4:sw=4:
/*!
 *
 * Copyright 2009-2012 Kris Kowal under the terms of the MIT
 * license found at http://github.com/kriskowal/q/raw/master/LICENSE
 *
 * With parts by Tyler Close
 * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
 * at http://www.opensource.org/licenses/mit-license.html
 * Forked at ref_send.js version: 2009-05-11
 *
 * With parts by Mark Miller
 * Copyright (C) 2011 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

(function (definition) {
    // Turn off strict mode for this function so we can assign to global.Q
    /* jshint strict: false */

    // This file will function properly as a <script> tag, or a module
    // using CommonJS and NodeJS or RequireJS module formats.  In
    // Common/Node/RequireJS, the module exports the Q API and when
    // executed as a simple <script>, it creates a Q global instead.

    // Montage Require
    if (typeof bootstrap === "function") {
        bootstrap("promise", definition);

    // CommonJS
    } else if (typeof exports === "object") {
        module.exports = definition();

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
        define(definition);

    // SES (Secure EcmaScript)
    } else if (typeof ses !== "undefined") {
        if (!ses.ok()) {
            return;
        } else {
            ses.makeQ = definition;
        }

    // <script>
    } else {
        Q = definition();
    }

})(function () {
"use strict";

var hasStacks = false;
try {
    throw new Error();
} catch (e) {
    hasStacks = !!e.stack;
}

// All code after this point will be filtered from stack traces reported
// by Q.
var qStartingLine = captureLine();
var qFileName;

// shims

// used for fallback in "allResolved"
var noop = function () {};

// Use the fastest possible means to execute a task in a future turn
// of the event loop.
var nextTick =(function () {
    // linked list of tasks (single, with head node)
    var head = {task: void 0, next: null};
    var tail = head;
    var flushing = false;
    var requestTick = void 0;
    var isNodeJS = false;

    function flush() {
        /* jshint loopfunc: true */

        while (head.next) {
            head = head.next;
            var task = head.task;
            head.task = void 0;
            var domain = head.domain;

            if (domain) {
                head.domain = void 0;
                domain.enter();
            }

            try {
                task();

            } catch (e) {
                if (isNodeJS) {
                    // In node, uncaught exceptions are considered fatal errors.
                    // Re-throw them synchronously to interrupt flushing!

                    // Ensure continuation if the uncaught exception is suppressed
                    // listening "uncaughtException" events (as domains does).
                    // Continue in next event to avoid tick recursion.
                    if (domain) {
                        domain.exit();
                    }
                    setTimeout(flush, 0);
                    if (domain) {
                        domain.enter();
                    }

                    throw e;

                } else {
                    // In browsers, uncaught exceptions are not fatal.
                    // Re-throw them asynchronously to avoid slow-downs.
                    setTimeout(function() {
                       throw e;
                    }, 0);
                }
            }

            if (domain) {
                domain.exit();
            }
        }

        flushing = false;
    }

    nextTick = function (task) {
        tail = tail.next = {
            task: task,
            domain: isNodeJS && process.domain,
            next: null
        };

        if (!flushing) {
            flushing = true;
            requestTick();
        }
    };

    if (typeof process !== "undefined" && process.nextTick) {
        // Node.js before 0.9. Note that some fake-Node environments, like the
        // Mocha test runner, introduce a `process` global without a `nextTick`.
        isNodeJS = true;

        requestTick = function () {
            process.nextTick(flush);
        };

    } else if (typeof setImmediate === "function") {
        // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
        if (typeof window !== "undefined") {
            requestTick = setImmediate.bind(window, flush);
        } else {
            requestTick = function () {
                setImmediate(flush);
            };
        }

    } else if (typeof MessageChannel !== "undefined") {
        // modern browsers
        // http://www.nonblocking.io/2011/06/windownexttick.html
        var channel = new MessageChannel();
        channel.port1.onmessage = flush;
        requestTick = function () {
            channel.port2.postMessage(0);
        };

    } else {
        // old browsers
        requestTick = function () {
            setTimeout(flush, 0);
        };
    }

    return nextTick;
})();

// Attempt to make generics safe in the face of downstream
// modifications.
// There is no situation where this is necessary.
// If you need a security guarantee, these primordials need to be
// deeply frozen anyway, and if you don’t need a security guarantee,
// this is just plain paranoid.
// However, this does have the nice side-effect of reducing the size
// of the code by reducing x.call() to merely x(), eliminating many
// hard-to-minify characters.
// See Mark Miller’s explanation of what this does.
// http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
var call = Function.call;
function uncurryThis(f) {
    return function () {
        return call.apply(f, arguments);
    };
}
// This is equivalent, but slower:
// uncurryThis = Function_bind.bind(Function_bind.call);
// http://jsperf.com/uncurrythis

var array_slice = uncurryThis(Array.prototype.slice);

var array_reduce = uncurryThis(
    Array.prototype.reduce || function (callback, basis) {
        var index = 0,
            length = this.length;
        // concerning the initial value, if one is not provided
        if (arguments.length === 1) {
            // seek to the first value in the array, accounting
            // for the possibility that is is a sparse array
            do {
                if (index in this) {
                    basis = this[index++];
                    break;
                }
                if (++index >= length) {
                    throw new TypeError();
                }
            } while (1);
        }
        // reduce
        for (; index < length; index++) {
            // account for the possibility that the array is sparse
            if (index in this) {
                basis = callback(basis, this[index], index);
            }
        }
        return basis;
    }
);

var array_indexOf = uncurryThis(
    Array.prototype.indexOf || function (value) {
        // not a very good shim, but good enough for our one use of it
        for (var i = 0; i < this.length; i++) {
            if (this[i] === value) {
                return i;
            }
        }
        return -1;
    }
);

var array_map = uncurryThis(
    Array.prototype.map || function (callback, thisp) {
        var self = this;
        var collect = [];
        array_reduce(self, function (undefined, value, index) {
            collect.push(callback.call(thisp, value, index, self));
        }, void 0);
        return collect;
    }
);

var object_create = Object.create || function (prototype) {
    function Type() { }
    Type.prototype = prototype;
    return new Type();
};

var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

var object_keys = Object.keys || function (object) {
    var keys = [];
    for (var key in object) {
        if (object_hasOwnProperty(object, key)) {
            keys.push(key);
        }
    }
    return keys;
};

var object_toString = uncurryThis(Object.prototype.toString);

function isObject(value) {
    return value === Object(value);
}

// generator related shims

// FIXME: Remove this function once ES6 generators are in SpiderMonkey.
function isStopIteration(exception) {
    return (
        object_toString(exception) === "[object StopIteration]" ||
        exception instanceof QReturnValue
    );
}

// FIXME: Remove this helper and Q.return once ES6 generators are in
// SpiderMonkey.
var QReturnValue;
if (typeof ReturnValue !== "undefined") {
    QReturnValue = ReturnValue;
} else {
    QReturnValue = function (value) {
        this.value = value;
    };
}

// Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
// engine that has a deployed base of browsers that support generators.
// However, SM's generators use the Python-inspired semantics of
// outdated ES6 drafts.  We would like to support ES6, but we'd also
// like to make it possible to use generators in deployed browsers, so
// we also support Python-style generators.  At some point we can remove
// this block.
var hasES6Generators;
try {
    /* jshint evil: true, nonew: false */
    new Function("(function* (){ yield 1; })");
    hasES6Generators = true;
} catch (e) {
    hasES6Generators = false;
}

// long stack traces

var STACK_JUMP_SEPARATOR = "From previous event:";

function makeStackTraceLong(error, promise) {
    // If possible, transform the error stack trace by removing Node and Q
    // cruft, then concatenating with the stack trace of `promise`. See #57.
    if (hasStacks &&
        promise.stack &&
        typeof error === "object" &&
        error !== null &&
        error.stack &&
        error.stack.indexOf(STACK_JUMP_SEPARATOR) === -1
    ) {
        var stacks = [];
        for (var p = promise; !!p; p = p.source) {
            if (p.stack) {
                stacks.unshift(p.stack);
            }
        }
        stacks.unshift(error.stack);

        var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
        error.stack = filterStackString(concatedStacks);
    }
}

function filterStackString(stackString) {
    var lines = stackString.split("\n");
    var desiredLines = [];
    for (var i = 0; i < lines.length; ++i) {
        var line = lines[i];

        if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
            desiredLines.push(line);
        }
    }
    return desiredLines.join("\n");
}

function isNodeFrame(stackLine) {
    return stackLine.indexOf("(module.js:") !== -1 ||
           stackLine.indexOf("(node.js:") !== -1;
}

function getFileNameAndLineNumber(stackLine) {
    // Named functions: "at functionName (filename:lineNumber:columnNumber)"
    // In IE10 function name can have spaces ("Anonymous function") O_o
    var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
    if (attempt1) {
        return [attempt1[1], Number(attempt1[2])];
    }

    // Anonymous functions: "at filename:lineNumber:columnNumber"
    var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
    if (attempt2) {
        return [attempt2[1], Number(attempt2[2])];
    }

    // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
    var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
    if (attempt3) {
        return [attempt3[1], Number(attempt3[2])];
    }
}

function isInternalFrame(stackLine) {
    var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

    if (!fileNameAndLineNumber) {
        return false;
    }

    var fileName = fileNameAndLineNumber[0];
    var lineNumber = fileNameAndLineNumber[1];

    return fileName === qFileName &&
        lineNumber >= qStartingLine &&
        lineNumber <= qEndingLine;
}

// discover own file name and line number range for filtering stack
// traces
function captureLine() {
    if (!hasStacks) {
        return;
    }

    try {
        throw new Error();
    } catch (e) {
        var lines = e.stack.split("\n");
        var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
        var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
        if (!fileNameAndLineNumber) {
            return;
        }

        qFileName = fileNameAndLineNumber[0];
        return fileNameAndLineNumber[1];
    }
}

function deprecate(callback, name, alternative) {
    return function () {
        if (typeof console !== "undefined" &&
            typeof console.warn === "function") {
            console.warn(name + " is deprecated, use " + alternative +
                         " instead.", new Error("").stack);
        }
        return callback.apply(callback, arguments);
    };
}

// end of shims
// beginning of real work

/**
 * Constructs a promise for an immediate reference, passes promises through, or
 * coerces promises from different systems.
 * @param value immediate reference or promise
 */
function Q(value) {
    // If the object is already a Promise, return it directly.  This enables
    // the resolve function to both be used to created references from objects,
    // but to tolerably coerce non-promises to promises.
    if (isPromise(value)) {
        return value;
    }

    // assimilate thenables
    if (isPromiseAlike(value)) {
        return coerce(value);
    } else {
        return fulfill(value);
    }
}
Q.resolve = Q;

/**
 * Performs a task in a future turn of the event loop.
 * @param {Function} task
 */
Q.nextTick = nextTick;

/**
 * Controls whether or not long stack traces will be on
 */
Q.longStackSupport = false;

/**
 * Constructs a {promise, resolve, reject} object.
 *
 * `resolve` is a callback to invoke with a more resolved value for the
 * promise. To fulfill the promise, invoke `resolve` with any value that is
 * not a thenable. To reject the promise, invoke `resolve` with a rejected
 * thenable, or invoke `reject` with the reason directly. To resolve the
 * promise to another thenable, thus putting it in the same state, invoke
 * `resolve` with that other thenable.
 */
Q.defer = defer;
function defer() {
    // if "messages" is an "Array", that indicates that the promise has not yet
    // been resolved.  If it is "undefined", it has been resolved.  Each
    // element of the messages array is itself an array of complete arguments to
    // forward to the resolved promise.  We coerce the resolution value to a
    // promise using the `resolve` function because it handles both fully
    // non-thenable values and other thenables gracefully.
    var messages = [], progressListeners = [], resolvedPromise;

    var deferred = object_create(defer.prototype);
    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, operands) {
        var args = array_slice(arguments);
        if (messages) {
            messages.push(args);
            if (op === "when" && operands[1]) { // progress operand
                progressListeners.push(operands[1]);
            }
        } else {
            nextTick(function () {
                resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
            });
        }
    };

    // XXX deprecated
    promise.valueOf = deprecate(function () {
        if (messages) {
            return promise;
        }
        var nearerValue = nearer(resolvedPromise);
        if (isPromise(nearerValue)) {
            resolvedPromise = nearerValue; // shorten chain
        }
        return nearerValue;
    }, "valueOf", "inspect");

    promise.inspect = function () {
        if (!resolvedPromise) {
            return { state: "pending" };
        }
        return resolvedPromise.inspect();
    };

    if (Q.longStackSupport && hasStacks) {
        try {
            throw new Error();
        } catch (e) {
            // NOTE: don't try to use `Error.captureStackTrace` or transfer the
            // accessor around; that causes memory leaks as per GH-111. Just
            // reify the stack trace as a string ASAP.
            //
            // At the same time, cut off the first line; it's always just
            // "[object Promise]\n", as per the `toString`.
            promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
        }
    }

    // NOTE: we do the checks for `resolvedPromise` in each method, instead of
    // consolidating them into `become`, since otherwise we'd create new
    // promises with the lines `become(whatever(value))`. See e.g. GH-252.

    function become(newPromise) {
        resolvedPromise = newPromise;
        promise.source = newPromise;

        array_reduce(messages, function (undefined, message) {
            nextTick(function () {
                newPromise.promiseDispatch.apply(newPromise, message);
            });
        }, void 0);

        messages = void 0;
        progressListeners = void 0;
    }

    deferred.promise = promise;
    deferred.resolve = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(Q(value));
    };

    deferred.fulfill = function (value) {
        if (resolvedPromise) {
            return;
        }

        become(fulfill(value));
    };
    deferred.reject = function (reason) {
        if (resolvedPromise) {
            return;
        }

        become(reject(reason));
    };
    deferred.notify = function (progress) {
        if (resolvedPromise) {
            return;
        }

        array_reduce(progressListeners, function (undefined, progressListener) {
            nextTick(function () {
                progressListener(progress);
            });
        }, void 0);
    };

    return deferred;
}

/**
 * Creates a Node-style callback that will resolve or reject the deferred
 * promise.
 * @returns a nodeback
 */
defer.prototype.makeNodeResolver = function () {
    var self = this;
    return function (error, value) {
        if (error) {
            self.reject(error);
        } else if (arguments.length > 2) {
            self.resolve(array_slice(arguments, 1));
        } else {
            self.resolve(value);
        }
    };
};

/**
 * @param resolver {Function} a function that returns nothing and accepts
 * the resolve, reject, and notify functions for a deferred.
 * @returns a promise that may be resolved with the given resolve and reject
 * functions, or rejected by a thrown exception in resolver
 */
Q.promise = promise;
function promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("resolver must be a function.");
    }
    var deferred = defer();
    try {
        resolver(deferred.resolve, deferred.reject, deferred.notify);
    } catch (reason) {
        deferred.reject(reason);
    }
    return deferred.promise;
}

// XXX experimental.  This method is a way to denote that a local value is
// serializable and should be immediately dispatched to a remote upon request,
// instead of passing a reference.
Q.passByCopy = function (object) {
    //freeze(object);
    //passByCopies.set(object, true);
    return object;
};

Promise.prototype.passByCopy = function () {
    //freeze(object);
    //passByCopies.set(object, true);
    return this;
};

/**
 * If two promises eventually fulfill to the same value, promises that value,
 * but otherwise rejects.
 * @param x {Any*}
 * @param y {Any*}
 * @returns {Any*} a promise for x and y if they are the same, but a rejection
 * otherwise.
 *
 */
Q.join = function (x, y) {
    return Q(x).join(y);
};

Promise.prototype.join = function (that) {
    return Q([this, that]).spread(function (x, y) {
        if (x === y) {
            // TODO: "===" should be Object.is or equiv
            return x;
        } else {
            throw new Error("Can't join: not the same: " + x + " " + y);
        }
    });
};

/**
 * Returns a promise for the first of an array of promises to become fulfilled.
 * @param answers {Array[Any*]} promises to race
 * @returns {Any*} the first promise to be fulfilled
 */
Q.race = race;
function race(answerPs) {
    return promise(function(resolve, reject) {
        // Switch to this once we can assume at least ES5
        // answerPs.forEach(function(answerP) {
        //     Q(answerP).then(resolve, reject);
        // });
        // Use this in the meantime
        for (var i = 0, len = answerPs.length; i < len; i++) {
            Q(answerPs[i]).then(resolve, reject);
        }
    });
}

Promise.prototype.race = function () {
    return this.then(Q.race);
};

/**
 * Constructs a Promise with a promise descriptor object and optional fallback
 * function.  The descriptor contains methods like when(rejected), get(name),
 * set(name, value), post(name, args), and delete(name), which all
 * return either a value, a promise for a value, or a rejection.  The fallback
 * accepts the operation name, a resolver, and any further arguments that would
 * have been forwarded to the appropriate method above had a method been
 * provided with the proper name.  The API makes no guarantees about the nature
 * of the returned object, apart from that it is usable whereever promises are
 * bought and sold.
 */
Q.makePromise = Promise;
function Promise(descriptor, fallback, inspect) {
    if (fallback === void 0) {
        fallback = function (op) {
            return reject(new Error(
                "Promise does not support operation: " + op
            ));
        };
    }
    if (inspect === void 0) {
        inspect = function () {
            return {state: "unknown"};
        };
    }

    var promise = object_create(Promise.prototype);

    promise.promiseDispatch = function (resolve, op, args) {
        var result;
        try {
            if (descriptor[op]) {
                result = descriptor[op].apply(promise, args);
            } else {
                result = fallback.call(promise, op, args);
            }
        } catch (exception) {
            result = reject(exception);
        }
        if (resolve) {
            resolve(result);
        }
    };

    promise.inspect = inspect;

    // XXX deprecated `valueOf` and `exception` support
    if (inspect) {
        var inspected = inspect();
        if (inspected.state === "rejected") {
            promise.exception = inspected.reason;
        }

        promise.valueOf = deprecate(function () {
            var inspected = inspect();
            if (inspected.state === "pending" ||
                inspected.state === "rejected") {
                return promise;
            }
            return inspected.value;
        });
    }

    return promise;
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.then = function (fulfilled, rejected, progressed) {
    var self = this;
    var deferred = defer();
    var done = false;   // ensure the untrusted promise makes at most a
                        // single call to one of the callbacks

    function _fulfilled(value) {
        try {
            return typeof fulfilled === "function" ? fulfilled(value) : value;
        } catch (exception) {
            return reject(exception);
        }
    }

    function _rejected(exception) {
        if (typeof rejected === "function") {
            makeStackTraceLong(exception, self);
            try {
                return rejected(exception);
            } catch (newException) {
                return reject(newException);
            }
        }
        return reject(exception);
    }

    function _progressed(value) {
        return typeof progressed === "function" ? progressed(value) : value;
    }

    nextTick(function () {
        self.promiseDispatch(function (value) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_fulfilled(value));
        }, "when", [function (exception) {
            if (done) {
                return;
            }
            done = true;

            deferred.resolve(_rejected(exception));
        }]);
    });

    // Progress propagator need to be attached in the current tick.
    self.promiseDispatch(void 0, "when", [void 0, function (value) {
        var newValue;
        var threw = false;
        try {
            newValue = _progressed(value);
        } catch (e) {
            threw = true;
            if (Q.onerror) {
                Q.onerror(e);
            } else {
                throw e;
            }
        }

        if (!threw) {
            deferred.notify(newValue);
        }
    }]);

    return deferred.promise;
};

/**
 * Registers an observer on a promise.
 *
 * Guarantees:
 *
 * 1. that fulfilled and rejected will be called only once.
 * 2. that either the fulfilled callback or the rejected callback will be
 *    called, but not both.
 * 3. that fulfilled and rejected will not be called in this turn.
 *
 * @param value      promise or immediate reference to observe
 * @param fulfilled  function to be called with the fulfilled value
 * @param rejected   function to be called with the rejection exception
 * @param progressed function to be called on any progress notifications
 * @return promise for the return value from the invoked callback
 */
Q.when = when;
function when(value, fulfilled, rejected, progressed) {
    return Q(value).then(fulfilled, rejected, progressed);
}

Promise.prototype.thenResolve = function (value) {
    return this.then(function () { return value; });
};

Q.thenResolve = function (promise, value) {
    return Q(promise).thenResolve(value);
};

Promise.prototype.thenReject = function (reason) {
    return this.then(function () { throw reason; });
};

Q.thenReject = function (promise, reason) {
    return Q(promise).thenReject(reason);
};

/**
 * If an object is not a promise, it is as "near" as possible.
 * If a promise is rejected, it is as "near" as possible too.
 * If it’s a fulfilled promise, the fulfillment value is nearer.
 * If it’s a deferred promise and the deferred has been resolved, the
 * resolution is "nearer".
 * @param object
 * @returns most resolved (nearest) form of the object
 */

// XXX should we re-do this?
Q.nearer = nearer;
function nearer(value) {
    if (isPromise(value)) {
        var inspected = value.inspect();
        if (inspected.state === "fulfilled") {
            return inspected.value;
        }
    }
    return value;
}

/**
 * @returns whether the given object is a promise.
 * Otherwise it is a fulfilled value.
 */
Q.isPromise = isPromise;
function isPromise(object) {
    return isObject(object) &&
        typeof object.promiseDispatch === "function" &&
        typeof object.inspect === "function";
}

Q.isPromiseAlike = isPromiseAlike;
function isPromiseAlike(object) {
    return isObject(object) && typeof object.then === "function";
}

/**
 * @returns whether the given object is a pending promise, meaning not
 * fulfilled or rejected.
 */
Q.isPending = isPending;
function isPending(object) {
    return isPromise(object) && object.inspect().state === "pending";
}

Promise.prototype.isPending = function () {
    return this.inspect().state === "pending";
};

/**
 * @returns whether the given object is a value or fulfilled
 * promise.
 */
Q.isFulfilled = isFulfilled;
function isFulfilled(object) {
    return !isPromise(object) || object.inspect().state === "fulfilled";
}

Promise.prototype.isFulfilled = function () {
    return this.inspect().state === "fulfilled";
};

/**
 * @returns whether the given object is a rejected promise.
 */
Q.isRejected = isRejected;
function isRejected(object) {
    return isPromise(object) && object.inspect().state === "rejected";
}

Promise.prototype.isRejected = function () {
    return this.inspect().state === "rejected";
};

//// BEGIN UNHANDLED REJECTION TRACKING

// This promise library consumes exceptions thrown in handlers so they can be
// handled by a subsequent promise.  The exceptions get added to this array when
// they are created, and removed when they are handled.  Note that in ES6 or
// shimmed environments, this would naturally be a `Set`.
var unhandledReasons = [];
var unhandledRejections = [];
var unhandledReasonsDisplayed = false;
var trackUnhandledRejections = true;
function displayUnhandledReasons() {
    if (
        !unhandledReasonsDisplayed &&
        typeof window !== "undefined" &&
        !window.Touch &&
        window.console
    ) {
        console.warn("[Q] Unhandled rejection reasons (should be empty):",
                     unhandledReasons);
    }

    unhandledReasonsDisplayed = true;
}

function logUnhandledReasons() {
    for (var i = 0; i < unhandledReasons.length; i++) {
        var reason = unhandledReasons[i];
        if (reason && typeof reason.stack !== "undefined") {
            console.warn("Unhandled rejection reason:", reason.stack);
        } else {
            console.warn("Unhandled rejection reason (no stack):", reason);
        }
    }
}

function resetUnhandledRejections() {
    unhandledReasons.length = 0;
    unhandledRejections.length = 0;
    unhandledReasonsDisplayed = false;

    if (!trackUnhandledRejections) {
        trackUnhandledRejections = true;

        // Show unhandled rejection reasons if Node exits without handling an
        // outstanding rejection.  (Note that Browserify presently produces a
        // `process` global without the `EventEmitter` `on` method.)
        if (typeof process !== "undefined" && process.on) {
            process.on("exit", logUnhandledReasons);
        }
    }
}

function trackRejection(promise, reason) {
    if (!trackUnhandledRejections) {
        return;
    }

    unhandledRejections.push(promise);
    unhandledReasons.push(reason);
    displayUnhandledReasons();
}

function untrackRejection(promise) {
    if (!trackUnhandledRejections) {
        return;
    }

    var at = array_indexOf(unhandledRejections, promise);
    if (at !== -1) {
        unhandledRejections.splice(at, 1);
        unhandledReasons.splice(at, 1);
    }
}

Q.resetUnhandledRejections = resetUnhandledRejections;

Q.getUnhandledReasons = function () {
    // Make a copy so that consumers can't interfere with our internal state.
    return unhandledReasons.slice();
};

Q.stopUnhandledRejectionTracking = function () {
    resetUnhandledRejections();
    if (typeof process !== "undefined" && process.on) {
        process.removeListener("exit", logUnhandledReasons);
    }
    trackUnhandledRejections = false;
};

resetUnhandledRejections();

//// END UNHANDLED REJECTION TRACKING

/**
 * Constructs a rejected promise.
 * @param reason value describing the failure
 */
Q.reject = reject;
function reject(reason) {
    var rejection = Promise({
        "when": function (rejected) {
            // note that the error has been handled
            if (rejected) {
                untrackRejection(this);
            }
            return rejected ? rejected(reason) : this;
        }
    }, function fallback() {
        return this;
    }, function inspect() {
        return { state: "rejected", reason: reason };
    });

    // Note that the reason has not been handled.
    trackRejection(rejection, reason);

    return rejection;
}

/**
 * Constructs a fulfilled promise for an immediate reference.
 * @param value immediate reference
 */
Q.fulfill = fulfill;
function fulfill(value) {
    return Promise({
        "when": function () {
            return value;
        },
        "get": function (name) {
            return value[name];
        },
        "set": function (name, rhs) {
            value[name] = rhs;
        },
        "delete": function (name) {
            delete value[name];
        },
        "post": function (name, args) {
            // Mark Miller proposes that post with no name should apply a
            // promised function.
            if (name === null || name === void 0) {
                return value.apply(void 0, args);
            } else {
                return value[name].apply(value, args);
            }
        },
        "apply": function (thisp, args) {
            return value.apply(thisp, args);
        },
        "keys": function () {
            return object_keys(value);
        }
    }, void 0, function inspect() {
        return { state: "fulfilled", value: value };
    });
}

/**
 * Converts thenables to Q promises.
 * @param promise thenable promise
 * @returns a Q promise
 */
function coerce(promise) {
    var deferred = defer();
    nextTick(function () {
        try {
            promise.then(deferred.resolve, deferred.reject, deferred.notify);
        } catch (exception) {
            deferred.reject(exception);
        }
    });
    return deferred.promise;
}

/**
 * Annotates an object such that it will never be
 * transferred away from this process over any promise
 * communication channel.
 * @param object
 * @returns promise a wrapping of that object that
 * additionally responds to the "isDef" message
 * without a rejection.
 */
Q.master = master;
function master(object) {
    return Promise({
        "isDef": function () {}
    }, function fallback(op, args) {
        return dispatch(object, op, args);
    }, function () {
        return Q(object).inspect();
    });
}

/**
 * Spreads the values of a promised array of arguments into the
 * fulfillment callback.
 * @param fulfilled callback that receives variadic arguments from the
 * promised array
 * @param rejected callback that receives the exception if the promise
 * is rejected.
 * @returns a promise for the return value or thrown exception of
 * either callback.
 */
Q.spread = spread;
function spread(value, fulfilled, rejected) {
    return Q(value).spread(fulfilled, rejected);
}

Promise.prototype.spread = function (fulfilled, rejected) {
    return this.all().then(function (array) {
        return fulfilled.apply(void 0, array);
    }, rejected);
};

/**
 * The async function is a decorator for generator functions, turning
 * them into asynchronous generators.  Although generators are only part
 * of the newest ECMAScript 6 drafts, this code does not cause syntax
 * errors in older engines.  This code should continue to work and will
 * in fact improve over time as the language improves.
 *
 * ES6 generators are currently part of V8 version 3.19 with the
 * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
 * for longer, but under an older Python-inspired form.  This function
 * works on both kinds of generators.
 *
 * Decorates a generator function such that:
 *  - it may yield promises
 *  - execution will continue when that promise is fulfilled
 *  - the value of the yield expression will be the fulfilled value
 *  - it returns a promise for the return value (when the generator
 *    stops iterating)
 *  - the decorated function returns a promise for the return value
 *    of the generator or the first rejected promise among those
 *    yielded.
 *  - if an error is thrown in the generator, it propagates through
 *    every following yield until it is caught, or until it escapes
 *    the generator function altogether, and is translated into a
 *    rejection for the promise returned by the decorated generator.
 */
Q.async = async;
function async(makeGenerator) {
    return function () {
        // when verb is "send", arg is a value
        // when verb is "throw", arg is an exception
        function continuer(verb, arg) {
            var result;
            if (hasES6Generators) {
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    return reject(exception);
                }
                if (result.done) {
                    return result.value;
                } else {
                    return when(result.value, callback, errback);
                }
            } else {
                // FIXME: Remove this case when SM does ES6 generators.
                try {
                    result = generator[verb](arg);
                } catch (exception) {
                    if (isStopIteration(exception)) {
                        return exception.value;
                    } else {
                        return reject(exception);
                    }
                }
                return when(result, callback, errback);
            }
        }
        var generator = makeGenerator.apply(this, arguments);
        var callback = continuer.bind(continuer, "next");
        var errback = continuer.bind(continuer, "throw");
        return callback();
    };
}

/**
 * The spawn function is a small wrapper around async that immediately
 * calls the generator and also ends the promise chain, so that any
 * unhandled errors are thrown instead of forwarded to the error
 * handler. This is useful because it's extremely common to run
 * generators at the top-level to work with libraries.
 */
Q.spawn = spawn;
function spawn(makeGenerator) {
    Q.done(Q.async(makeGenerator)());
}

// FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
/**
 * Throws a ReturnValue exception to stop an asynchronous generator.
 *
 * This interface is a stop-gap measure to support generator return
 * values in older Firefox/SpiderMonkey.  In browsers that support ES6
 * generators like Chromium 29, just use "return" in your generator
 * functions.
 *
 * @param value the return value for the surrounding generator
 * @throws ReturnValue exception with the value.
 * @example
 * // ES6 style
 * Q.async(function* () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      return foo + bar;
 * })
 * // Older SpiderMonkey style
 * Q.async(function () {
 *      var foo = yield getFooPromise();
 *      var bar = yield getBarPromise();
 *      Q.return(foo + bar);
 * })
 */
Q["return"] = _return;
function _return(value) {
    throw new QReturnValue(value);
}

/**
 * The promised function decorator ensures that any promise arguments
 * are settled and passed as values (`this` is also settled and passed
 * as a value).  It will also ensure that the result of a function is
 * always a promise.
 *
 * @example
 * var add = Q.promised(function (a, b) {
 *     return a + b;
 * });
 * add(Q(a), Q(B));
 *
 * @param {function} callback The function to decorate
 * @returns {function} a function that has been decorated.
 */
Q.promised = promised;
function promised(callback) {
    return function () {
        return spread([this, all(arguments)], function (self, args) {
            return callback.apply(self, args);
        });
    };
}

/**
 * sends a message to a value in a future turn
 * @param object* the recipient
 * @param op the name of the message operation, e.g., "when",
 * @param args further arguments to be forwarded to the operation
 * @returns result {Promise} a promise for the result of the operation
 */
Q.dispatch = dispatch;
function dispatch(object, op, args) {
    return Q(object).dispatch(op, args);
}

Promise.prototype.dispatch = function (op, args) {
    var self = this;
    var deferred = defer();
    nextTick(function () {
        self.promiseDispatch(deferred.resolve, op, args);
    });
    return deferred.promise;
};

/**
 * Gets the value of a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to get
 * @return promise for the property value
 */
Q.get = function (object, key) {
    return Q(object).dispatch("get", [key]);
};

Promise.prototype.get = function (key) {
    return this.dispatch("get", [key]);
};

/**
 * Sets the value of a property in a future turn.
 * @param object    promise or immediate reference for object object
 * @param name      name of property to set
 * @param value     new value of property
 * @return promise for the return value
 */
Q.set = function (object, key, value) {
    return Q(object).dispatch("set", [key, value]);
};

Promise.prototype.set = function (key, value) {
    return this.dispatch("set", [key, value]);
};

/**
 * Deletes a property in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of property to delete
 * @return promise for the return value
 */
Q.del = // XXX legacy
Q["delete"] = function (object, key) {
    return Q(object).dispatch("delete", [key]);
};

Promise.prototype.del = // XXX legacy
Promise.prototype["delete"] = function (key) {
    return this.dispatch("delete", [key]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param value     a value to post, typically an array of
 *                  invocation arguments for promises that
 *                  are ultimately backed with `resolve` values,
 *                  as opposed to those backed with URLs
 *                  wherein the posted value can be any
 *                  JSON serializable object.
 * @return promise for the return value
 */
// bound locally because it is used by other methods
Q.mapply = // XXX As proposed by "Redsandro"
Q.post = function (object, name, args) {
    return Q(object).dispatch("post", [name, args]);
};

Promise.prototype.mapply = // XXX As proposed by "Redsandro"
Promise.prototype.post = function (name, args) {
    return this.dispatch("post", [name, args]);
};

/**
 * Invokes a method in a future turn.
 * @param object    promise or immediate reference for target object
 * @param name      name of method to invoke
 * @param ...args   array of invocation arguments
 * @return promise for the return value
 */
Q.send = // XXX Mark Miller's proposed parlance
Q.mcall = // XXX As proposed by "Redsandro"
Q.invoke = function (object, name /*...args*/) {
    return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
};

Promise.prototype.send = // XXX Mark Miller's proposed parlance
Promise.prototype.mcall = // XXX As proposed by "Redsandro"
Promise.prototype.invoke = function (name /*...args*/) {
    return this.dispatch("post", [name, array_slice(arguments, 1)]);
};

/**
 * Applies the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param args      array of application arguments
 */
Q.fapply = function (object, args) {
    return Q(object).dispatch("apply", [void 0, args]);
};

Promise.prototype.fapply = function (args) {
    return this.dispatch("apply", [void 0, args]);
};

/**
 * Calls the promised function in a future turn.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q["try"] =
Q.fcall = function (object /* ...args*/) {
    return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
};

Promise.prototype.fcall = function (/*...args*/) {
    return this.dispatch("apply", [void 0, array_slice(arguments)]);
};

/**
 * Binds the promised function, transforming return values into a fulfilled
 * promise and thrown errors into a rejected one.
 * @param object    promise or immediate reference for target function
 * @param ...args   array of application arguments
 */
Q.fbind = function (object /*...args*/) {
    var promise = Q(object);
    var args = array_slice(arguments, 1);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};
Promise.prototype.fbind = function (/*...args*/) {
    var promise = this;
    var args = array_slice(arguments);
    return function fbound() {
        return promise.dispatch("apply", [
            this,
            args.concat(array_slice(arguments))
        ]);
    };
};

/**
 * Requests the names of the owned properties of a promised
 * object in a future turn.
 * @param object    promise or immediate reference for target object
 * @return promise for the keys of the eventually settled object
 */
Q.keys = function (object) {
    return Q(object).dispatch("keys", []);
};

Promise.prototype.keys = function () {
    return this.dispatch("keys", []);
};

/**
 * Turns an array of promises into a promise for an array.  If any of
 * the promises gets rejected, the whole array is rejected immediately.
 * @param {Array*} an array (or promise for an array) of values (or
 * promises for values)
 * @returns a promise for an array of the corresponding values
 */
// By Mark Miller
// http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
Q.all = all;
function all(promises) {
    return when(promises, function (promises) {
        var countDown = 0;
        var deferred = defer();
        array_reduce(promises, function (undefined, promise, index) {
            var snapshot;
            if (
                isPromise(promise) &&
                (snapshot = promise.inspect()).state === "fulfilled"
            ) {
                promises[index] = snapshot.value;
            } else {
                ++countDown;
                when(
                    promise,
                    function (value) {
                        promises[index] = value;
                        if (--countDown === 0) {
                            deferred.resolve(promises);
                        }
                    },
                    deferred.reject,
                    function (progress) {
                        deferred.notify({ index: index, value: progress });
                    }
                );
            }
        }, void 0);
        if (countDown === 0) {
            deferred.resolve(promises);
        }
        return deferred.promise;
    });
}

Promise.prototype.all = function () {
    return all(this);
};

/**
 * Waits for all promises to be settled, either fulfilled or
 * rejected.  This is distinct from `all` since that would stop
 * waiting at the first rejection.  The promise returned by
 * `allResolved` will never be rejected.
 * @param promises a promise for an array (or an array) of promises
 * (or values)
 * @return a promise for an array of promises
 */
Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
function allResolved(promises) {
    return when(promises, function (promises) {
        promises = array_map(promises, Q);
        return when(all(array_map(promises, function (promise) {
            return when(promise, noop, noop);
        })), function () {
            return promises;
        });
    });
}

Promise.prototype.allResolved = function () {
    return allResolved(this);
};

/**
 * @see Promise#allSettled
 */
Q.allSettled = allSettled;
function allSettled(promises) {
    return Q(promises).allSettled();
}

/**
 * Turns an array of promises into a promise for an array of their states (as
 * returned by `inspect`) when they have all settled.
 * @param {Array[Any*]} values an array (or promise for an array) of values (or
 * promises for values)
 * @returns {Array[State]} an array of states for the respective values.
 */
Promise.prototype.allSettled = function () {
    return this.then(function (promises) {
        return all(array_map(promises, function (promise) {
            promise = Q(promise);
            function regardless() {
                return promise.inspect();
            }
            return promise.then(regardless, regardless);
        }));
    });
};

/**
 * Captures the failure of a promise, giving an oportunity to recover
 * with a callback.  If the given promise is fulfilled, the returned
 * promise is fulfilled.
 * @param {Any*} promise for something
 * @param {Function} callback to fulfill the returned promise if the
 * given promise is rejected
 * @returns a promise for the return value of the callback
 */
Q.fail = // XXX legacy
Q["catch"] = function (object, rejected) {
    return Q(object).then(void 0, rejected);
};

Promise.prototype.fail = // XXX legacy
Promise.prototype["catch"] = function (rejected) {
    return this.then(void 0, rejected);
};

/**
 * Attaches a listener that can respond to progress notifications from a
 * promise's originating deferred. This listener receives the exact arguments
 * passed to ``deferred.notify``.
 * @param {Any*} promise for something
 * @param {Function} callback to receive any progress notifications
 * @returns the given promise, unchanged
 */
Q.progress = progress;
function progress(object, progressed) {
    return Q(object).then(void 0, void 0, progressed);
}

Promise.prototype.progress = function (progressed) {
    return this.then(void 0, void 0, progressed);
};

/**
 * Provides an opportunity to observe the settling of a promise,
 * regardless of whether the promise is fulfilled or rejected.  Forwards
 * the resolution to the returned promise when the callback is done.
 * The callback can return a promise to defer completion.
 * @param {Any*} promise
 * @param {Function} callback to observe the resolution of the given
 * promise, takes no arguments.
 * @returns a promise for the resolution of the given promise when
 * ``fin`` is done.
 */
Q.fin = // XXX legacy
Q["finally"] = function (object, callback) {
    return Q(object)["finally"](callback);
};

Promise.prototype.fin = // XXX legacy
Promise.prototype["finally"] = function (callback) {
    callback = Q(callback);
    return this.then(function (value) {
        return callback.fcall().then(function () {
            return value;
        });
    }, function (reason) {
        // TODO attempt to recycle the rejection with "this".
        return callback.fcall().then(function () {
            throw reason;
        });
    });
};

/**
 * Terminates a chain of promises, forcing rejections to be
 * thrown as exceptions.
 * @param {Any*} promise at the end of a chain of promises
 * @returns nothing
 */
Q.done = function (object, fulfilled, rejected, progress) {
    return Q(object).done(fulfilled, rejected, progress);
};

Promise.prototype.done = function (fulfilled, rejected, progress) {
    var onUnhandledError = function (error) {
        // forward to a future turn so that ``when``
        // does not catch it and turn it into a rejection.
        nextTick(function () {
            makeStackTraceLong(error, promise);
            if (Q.onerror) {
                Q.onerror(error);
            } else {
                throw error;
            }
        });
    };

    // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
    var promise = fulfilled || rejected || progress ?
        this.then(fulfilled, rejected, progress) :
        this;

    if (typeof process === "object" && process && process.domain) {
        onUnhandledError = process.domain.bind(onUnhandledError);
    }

    promise.then(void 0, onUnhandledError);
};

/**
 * Causes a promise to be rejected if it does not get fulfilled before
 * some milliseconds time out.
 * @param {Any*} promise
 * @param {Number} milliseconds timeout
 * @param {String} custom error message (optional)
 * @returns a promise for the resolution of the given promise if it is
 * fulfilled before the timeout, otherwise rejected.
 */
Q.timeout = function (object, ms, message) {
    return Q(object).timeout(ms, message);
};

Promise.prototype.timeout = function (ms, message) {
    var deferred = defer();
    var timeoutId = setTimeout(function () {
        deferred.reject(new Error(message || "Timed out after " + ms + " ms"));
    }, ms);

    this.then(function (value) {
        clearTimeout(timeoutId);
        deferred.resolve(value);
    }, function (exception) {
        clearTimeout(timeoutId);
        deferred.reject(exception);
    }, deferred.notify);

    return deferred.promise;
};

/**
 * Returns a promise for the given value (or promised value), some
 * milliseconds after it resolved. Passes rejections immediately.
 * @param {Any*} promise
 * @param {Number} milliseconds
 * @returns a promise for the resolution of the given promise after milliseconds
 * time has elapsed since the resolution of the given promise.
 * If the given promise rejects, that is passed immediately.
 */
Q.delay = function (object, timeout) {
    if (timeout === void 0) {
        timeout = object;
        object = void 0;
    }
    return Q(object).delay(timeout);
};

Promise.prototype.delay = function (timeout) {
    return this.then(function (value) {
        var deferred = defer();
        setTimeout(function () {
            deferred.resolve(value);
        }, timeout);
        return deferred.promise;
    });
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided as an array, and returns a promise.
 *
 *      Q.nfapply(FS.readFile, [__filename])
 *      .then(function (content) {
 *      })
 *
 */
Q.nfapply = function (callback, args) {
    return Q(callback).nfapply(args);
};

Promise.prototype.nfapply = function (args) {
    var deferred = defer();
    var nodeArgs = array_slice(args);
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Passes a continuation to a Node function, which is called with the given
 * arguments provided individually, and returns a promise.
 * @example
 * Q.nfcall(FS.readFile, __filename)
 * .then(function (content) {
 * })
 *
 */
Q.nfcall = function (callback /*...args*/) {
    var args = array_slice(arguments, 1);
    return Q(callback).nfapply(args);
};

Promise.prototype.nfcall = function (/*...args*/) {
    var nodeArgs = array_slice(arguments);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.fapply(nodeArgs).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Wraps a NodeJS continuation passing function and returns an equivalent
 * version that returns a promise.
 * @example
 * Q.nfbind(FS.readFile, __filename)("utf-8")
 * .then(console.log)
 * .done()
 */
Q.nfbind =
Q.denodeify = function (callback /*...args*/) {
    var baseArgs = array_slice(arguments, 1);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        Q(callback).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nfbind =
Promise.prototype.denodeify = function (/*...args*/) {
    var args = array_slice(arguments);
    args.unshift(this);
    return Q.denodeify.apply(void 0, args);
};

Q.nbind = function (callback, thisp /*...args*/) {
    var baseArgs = array_slice(arguments, 2);
    return function () {
        var nodeArgs = baseArgs.concat(array_slice(arguments));
        var deferred = defer();
        nodeArgs.push(deferred.makeNodeResolver());
        function bound() {
            return callback.apply(thisp, arguments);
        }
        Q(bound).fapply(nodeArgs).fail(deferred.reject);
        return deferred.promise;
    };
};

Promise.prototype.nbind = function (/*thisp, ...args*/) {
    var args = array_slice(arguments, 0);
    args.unshift(this);
    return Q.nbind.apply(void 0, args);
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback with a given array of arguments, plus a provided callback.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param {Array} args arguments to pass to the method; the callback
 * will be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nmapply = // XXX As proposed by "Redsandro"
Q.npost = function (object, name, args) {
    return Q(object).npost(name, args);
};

Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
Promise.prototype.npost = function (name, args) {
    var nodeArgs = array_slice(args || []);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * Calls a method of a Node-style object that accepts a Node-style
 * callback, forwarding the given variadic arguments, plus a provided
 * callback argument.
 * @param object an object that has the named method
 * @param {String} name name of the method of object
 * @param ...args arguments to pass to the method; the callback will
 * be provided by Q and appended to these arguments.
 * @returns a promise for the value or error
 */
Q.nsend = // XXX Based on Mark Miller's proposed "send"
Q.nmcall = // XXX Based on "Redsandro's" proposal
Q.ninvoke = function (object, name /*...args*/) {
    var nodeArgs = array_slice(arguments, 2);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
Promise.prototype.ninvoke = function (name /*...args*/) {
    var nodeArgs = array_slice(arguments, 1);
    var deferred = defer();
    nodeArgs.push(deferred.makeNodeResolver());
    this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
    return deferred.promise;
};

/**
 * If a function would like to support both Node continuation-passing-style and
 * promise-returning-style, it can end its internal promise chain with
 * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
 * elects to use a nodeback, the result will be sent there.  If they do not
 * pass a nodeback, they will receive the result promise.
 * @param object a result (or a promise for a result)
 * @param {Function} nodeback a Node.js-style callback
 * @returns either the promise or nothing
 */
Q.nodeify = nodeify;
function nodeify(object, nodeback) {
    return Q(object).nodeify(nodeback);
}

Promise.prototype.nodeify = function (nodeback) {
    if (nodeback) {
        this.then(function (value) {
            nextTick(function () {
                nodeback(null, value);
            });
        }, function (error) {
            nextTick(function () {
                nodeback(error);
            });
        });
    } else {
        return this;
    }
};

// All code before this point will be filtered from stack traces.
var qEndingLine = captureLine();

return Q;

});

});
require.register("optimuslime-win-backbone/lib/win-backbone.js", function(exports, require, module){

//Control all the win module! Need emitter for basic usage. 
var Emitter = (typeof process != "undefined" ?  require('component-emitter') : require('emitter'));
var Q = require('q');
//

module.exports = winBB;

function winBB(homeDirectory)
{
	//
	var self = this;

	//we're an emitter! but we also mean extra business, so we override some calls later
	Emitter(self);

	//pull the inner versions, we'll overwrite self versions later
	var innerEmit = self.emit;
	var innerHasListeners = self.hasListeners;


	//cache the shift function
	var shift = [].shift;

	self.log = function()
	{
		throw new Error("Backbone doesn't use log directly anymore. Call backbone.getLogger(moduleObject) instead. ");
	}
	self.log.logLevel = function()
	{
		throw new Error("Backbone doesn't use log.loglevel anymore. Call backbone.logLevel directly instead. ");
	}

	var prependText = function(winFunction)
	{
		return !winFunction ? "" :  "    [" + winFunction + "]: ";
	}
	self.silenceBackbone = false;
	self.logLevel = 1;
	self.nologging = -1;
	self.warning = 0;
	self.normal = 1;
	self.verbose = 2;
	self.testing = 3;

	var muted = {};
	var modIDs = 0;
	var propID = "_backboneID";
	var propIDToName = {};
	var allLoggers = [];

	//we assign every module a log identification
	function nextModID() {return modIDs++;}

	//backbone handles the most basic logging for now, filtering by logLevel at the time
	//no stored history -- this will require a separate module
	//the practice of logging through the backbone should be standard though
	self.getLogger = function(moduleObject)
	{
		var winFunction = moduleObject.winFunction;
		var prepend = prependText(winFunction);

		var mid = addLogger(moduleObject);
		//otherwise ... 
		//already have an mid -- assigned by the loader

		if(typeof process != "undefined")//&& "".cyan != undefined)
		{
			prepend = '\x1B[36m' + prepend + '\x1B[39m';
		}

		var logFunction = function()
		{
			var logCategory;
			if(typeof arguments[0] == "number")
			{
				logCategory = [].shift.call(arguments);
			}
			else //otherwise, assume it's just a verbose message by default -- why would you log otherwise?
				logCategory = logFunction.verbose;

			if(!logCategory)
				throw new Error("Log category must be defined.");

			[].splice.call(arguments, 0,0, prepend)

			//needs to be lower than both our individual level, and our global level -- can't flood the log as any module
			if(logCategory <= logFunction.logLevel && logCategory <= self.logLevel && !muted[mid])
				console.log.apply(console, arguments);
		}

		//assign id to our logger!
		logFunction[propID] = mid;

		logFunction.log = logFunction;
		logFunction.logLevel = self.logLevel;
		logFunction.nologging = self.nologging;
		logFunction.warning = self.warning;
		logFunction.normal = self.normal;
		logFunction.verbose = self.verbose;
		logFunction.testing = self.testing;

		return logFunction;
	}
	//hold our logger propID
	var internalLog = self.getLogger({});

	//set the backbone logger to this internal object prop ID assigned by logger
	addNameToMID("backbone", internalLog[propID]);

	internalLog.logLevel = internalLog.testing;

	//none modules so far
	self.moduleCount = 0;

	//we need to have all calls on record
	var callerEvents = {};
	var requiredEvents = {};
	var optionalEvents = {};
	var moduleObjects = {};

	var mutingAll = false;

	function addLogger(moduleObject)
	{
		//tada
		var mid = moduleObject[propID];

		//if we haven't already gotten an mid assigned to this object
		if(mid == undefined)
		{
			//we need to assign an mid 
			mid = nextModID();

			//all we can do is assign it to this winfunction
			moduleObject[propID] = mid;
		}

		//grab the mid -- later we can do other things if necessary
		allLoggers.push(mid);

		//please respect the silence
		if(mutingAll)
			muted[mid] = true;

		return mid;
	}

	//can mute/unmute
	self.mute = function(name)
	{
		var mid = propIDToName[name];

		if(mid != undefined)
			muted[mid] = true;
	}
	self.unmute = function(name)
	{
		var mid = propIDToName[name];
		delete muted[mid];
	}
	self.muteAll = function()
	{
		mutingAll = true;
		for(var i=0; i < allLoggers.length; i++)
			muted[allLoggers[i]] = true;
	}
	self.unmuteAll = function(){
		muted = {};
		mutingAll = false;
	}
	self.muteLogger = function(logObject)
	{
		muted[logObject[propID]] = true;
	}
	
	self.unmuteLogger = function(logObject)
	{
		delete muted[logObject[propID]];
	}


	function addNameToMID(name, id)
	{
		//don't want duplicates
		if(propIDToName[name] != undefined)
			throw new Error("Duplicate prop ID being sent in, likely named another module 'backbone'");

			//for silencing by name
		propIDToName[name] = id;

		if(mutingAll)
			muted[id] = true;
	}

	//helpful getters for the module objects
	self.getModules = function(moduleNames){

		//empty? jsut send the whole module object back -- pretty dangerous -- ill advised
		if(!moduleNames)
			return moduleObjects;

		//otherwise, we build a map for the name
		var mReturn = {};

		//you can send an array of names, an object indexed by names, or a simple string
		var nameList = moduleNames;

		if(typeof moduleNames == "string")
			moduleNames = [moduleNames];
		else if(typeof moduleNames == "object")
			nameList = Object.keys(moduleNames);
		else if(!Array.isArray(moduleNames))
			throw new Error("Improper module names submitted: must be a string, an array, or a map of the module names");

		//loop through, grab the stuff
		for(var i=0; i < nameList.length; i++)
		{
			var name = nameList[i];
			mReturn[name] = moduleObjects[name];
		}

		//send it back, simple
		return mReturn;

	};
	self.getModuleCount = function(){return self.moduleCount;};
	self.getModuleNameList = function(){return Object.keys(moduleObjects);};


	var parseEventName = function(fullEvent)
	{
		var splitEvent = fullEvent.split(':');

		//if there is no ":", then this is improperly formatted
		if(splitEvent.length <= 1)
			throw new Error("Improper event name format, winFunction:eventName, instead looks like: " + fullEvent);

		return {winFunction: splitEvent[0], eventName: splitEvent[1]}
	}

	self.loadModules = function(inputNameOrObject, allConfiguration, localConfiguration)
	{
		var globalConfiguration;
		if(typeof localConfiguration == "undefined")
		{
			//we handle the case where potentially we have a global object and a bunch of local objects
			allConfiguration = allConfiguration || {};
			globalConfiguration = allConfiguration.global || {};
			localConfiguration = allConfiguration;
		}
		//both are defined -- one assumed to be global, other local
		else if(allConfiguration && localConfiguration)
		{
			globalConfiguration = allConfiguration;
			localConfiguration = localConfiguration;
		}
		else if(localConfiguration)
		{
			//allconfiguration is undefined-- this is weird -- maybe they made a mistake
			//try to pull global from local
			allConfiguration = localConfiguration;
			globalConfiguration = localConfiguration.global || {};
		}
		else
		{
			//just cover the basics, both undefined
			allConfiguration  = allConfiguration || {};
			globalConfiguration = allconfiguration.global || {};
			localConfiguration = localConfiguration || {};
		}
		
		//we have sent in a full object, or just a reference for a text file to load
		var jsonModules = inputNameOrObject;
		if(typeof inputNameOrObject == "string")
		{
			var fs = require('fs');
			var fBuffer = fs.readFileSync(inputNameOrObject);
			jsonModules = JSON.parse(fBuffer);
		}

		//otherwise, json modules is the json module information
		var mCount = 0;
		for(var key in jsonModules)
		{
			//perhaps there is some relative adjustments that need to be made for this to work?

			var locationNameOrObject = jsonModules[key];
			//if you're a function or object, we just leave you alone (the function will be instantiated at the end)
			//makes it easier to test things
			if(typeof locationNameOrObject == "object" || typeof locationNameOrObject == "function")
			{
				moduleObjects[key] = locationNameOrObject;
			}
			else if(locationNameOrObject.indexOf('/') != -1)
			{
				//locations relative to the home directory of the app
				moduleObjects[key] = require(homeDirectory + locationNameOrObject);
			}
			else
				moduleObjects[key] = require(locationNameOrObject);

			//if it's a function, we create a new object
			// if(typeof moduleObjects[key] != "function")
				// throw new Error("WIN Modules need to be functions for creating objects (that accept win backbone as first argument)")
			
			//create the object passing the backbone
			if(typeof moduleObjects[key] == "function") // then pass on teh configuration, both inputs are guaranteed to exist
				moduleObjects[key] = new moduleObjects[key](self, globalConfiguration, localConfiguration[key] || {});


			//if they were not assign an mid by a logger, then I don't need to worry -- yet
			var mid = moduleObjects[key][propID];
			if(mid == undefined)
			{
				mid = nextModID();
				moduleObjects[key][propID] = mid;
			}

			//go ahead and register this name for muting purposes
			addNameToMID(key, mid);

			mCount++;
		}

		self.moduleCount = mCount;

		//now we register our winFunctions for these modules
		for(var key in moduleObjects)
		{
			var wFun = moduleObjects[key].winFunction;
			if(!wFun || wFun == "" || typeof wFun != "string")
			{
				internalLog('Module does not implement winFunction properly-- must be non-empty string unlike: ' +  wFun);
				throw new Error("Improper win function");
			}

			//instead we do this later

			// if(!callerEvents[wFun])
			// {
			// 	//duplicate behaviors now allowed in backbone -- multiple objects claiming some events or functionality
			// 	callerEvents[wFun] = {};
			// 	requiredEvents[wFun] = {};
			// 	optionalEvents[wFun] = {};
			// }

		}

		//now we register our callback functions for all the events
		for(var key in moduleObjects)
		{
			var mod = moduleObjects[key];

			// if(!mod.eventCallbacks)
			// {
			// 	throw new Error("No callback function inside module: " +  mod.winFunction +  " full module: " +  mod);

			// }

			//event callbacks are option -- should cut down on module bloat for simple modules to do stuff
			if(!mod.eventCallbacks){
				internalLog("WARNING, loaded module doesn't provide any callback events inside: ", mod.winFunction, " - with key - ", key);

				//skip!
				continue;
			}

			//grab the event callbacks
			var mCallbacks = mod.eventCallbacks();

			for(var fullEventName in mCallbacks)
			{
				//
				if(typeof fullEventName != "string")
				{
					throw new Error("Event callback keys must be strings: " +  fullEventName);
				}

				var cb = mCallbacks[fullEventName];
				if(!cb || typeof cb != "function")
				{
					throw new Error("Event callback must be non-null function: " +  cb);
				}

				if(self.moduleHasListeners(fullEventName))
				{
					internalLog("Backbone doesn't allow duplicate callbacks for the same event: " + fullEventName);
					throw new Error("Same event answered more than once: " + fullEventName);
				}

				//now we register inside of the backbone
				//we override what was there before
				self.off(fullEventName);
				
				//sole callback for this event -- always overwriting
				self.on(fullEventName, cb);

				//throws error for improper formatting
				var parsed = parseEventName(fullEventName);

				var callObject = callerEvents[parsed.winFunction];
				
				if(!callObject){
					callObject = {};
					callerEvents[parsed.winFunction] = callObject;
				}

				callObject[parsed.eventName] = fullEventName;
			}
		}

		//now we grab all the required functionality for the mods
		for(var key in moduleObjects)
		{
			//call the mod for the events
			var mod = moduleObjects[key];

			//guaranteed to exist from callbacks above
			var fun = mod.winFunction;

			if(!mod.requiredEvents){
				internalLog("WARNING, loaded module doesn't require any events inside: ", fun, " - with key - ", key);

				//skip!
				continue;
			}

			// if(!mod.requiredEvents)
			// {
			// 	throw new Error("Required events function not written in module: " +  fun);
			// }

			var reqs = mod.requiredEvents();

			if(!reqs)
			{
				throw new Error("requiredEvents must return non-null array full of required events.");
			}

			//make sure we have all these events
			for(var i=0; i < reqs.length; i++)
			{
				if(!self.moduleHasListeners(reqs[i]))
					throw new Error("Missing a required listener: " +  reqs[i]);

				var parsed = parseEventName(reqs[i]);

				//lets keep track of who needs what. 
				var required = requiredEvents[fun];
				if(!required)
				{
					required = {};
					requiredEvents[fun] = required;
				}

				//then index into win function
				if(!required[parsed.winFunction])
				{
					required[parsed.winFunction] = {};
				}

				//and again to pared event name
				if(!required[parsed.winFunction][parsed.eventName])
				{
					required[parsed.winFunction][parsed.eventName] = reqs[i];
				}

			}

			//of course any mod can make optional events
			//these are events that you can optionally call, but aren't necessarily satisfied by any module
			//you should check the backbone for listeners before making an optional call -- use at your own risk!
			if(mod.optionalEvents)
			{
				var opts = mod.optionalEvents();

				for(var i=0; i < opts.length; i++)
				{
					var parsed = parseEventName(opts[i]);

					//lets keep track of who needs what. 
					var optional = optionalEvents[fun];

					//if we haven't seen this function requiring stuff before, create our object!
					if(!optional){
						optional = {};
						optionalEvents[fun] = optional;
					}

					//same for win function, have we seen before?
					if(!optional[parsed.winFunction])
					{
						optional[parsed.winFunction] = {};
					}

					//then the full on event name
					if(!optional[parsed.winFunction][parsed.eventName])
					{
						optional[parsed.winFunction][parsed.eventName] = opts[i];
					}
				}
			}

		}
	}



	//build a custom emitter for our module
	self.getEmitter = function(module)
	{
		if(!module.winFunction)
		{
			throw new Error("Can't generate module call function for module that doesn't have a winFunction!");
		}
		//emitter implicitly knows who is calling through closure
		var moduleFunction = module.winFunction;

		var emitter = function()
		{
			[].splice.call(arguments, 0, 0, moduleFunction);
			return self.moduleEmit.apply(self, arguments);
		}

		//pass the function through
		emitter.emit = emitter;

		//pass in the emitter to create a q calling function
		emitter.qCall = createQCallback(emitter);

		//use the qcalls to chain multiple calls together using Q.all and Q.allSettled
		emitter.qConcurrent = qAllCallback(emitter.qCall);

		//this makes it more convenient to check for listeners 
		//you don't need a backbone object AND an emitter. The emitter tells you both info 
		//-- while being aware of who is making requests
		emitter.hasListeners = function()
		{
			//has listeners is aware, so we can tap in and see who is checking for listeners 
			return self.moduleHasListeners.apply(self, arguments);
		}

		return emitter;
	}

		//this is for given a module a promise based callback method -- no need to define for every module
	//requires the Q library -- a worthy addition for cleaning up callback logic
	function createQCallback(bbEmit)
	{
		return function()
		{
			//defer -- resolve later
		    var defer = Q.defer();

		    //first add our own function type
		    var augmentArgs = arguments;

		    //make some assumptions about the returning call
		    var callback = function(err)
		    {
		        if(err)
		        {
		            defer.reject(err);
		        }
		        else
		        {
		            //remove the error object, send the info onwards
		            [].shift.call(arguments);

		            //now we have to do something funky here
		            //if you expect more than one argument, we have to send in the argument object 
		            //and you pick out the appropriate arguments
		            //if it's just one, we send the one argument like normal

		            //this is the behavior chosen
		            if(arguments.length > 1)
		                defer.resolve(arguments);
		            else
		                defer.resolve.apply(defer, arguments);
		        }
		    };

		    //then we add our callback to the end of our function -- which will get resolved here with whatever arguments are passed back
		    [].push.call(augmentArgs, callback);

		    //make the call, we'll catch it inside the callback!
		    bbEmit.apply(bbEmit, augmentArgs);

		    return defer.promise;
		}
	}

	function qAllCallback(qCall)
	{
		return function()
		{
			var defer = Q.defer();

			//send in all the events you want called by win-backbone
			var eventCalls = [].shift.call(arguments);

			var options = [].shift.call(arguments) || {};

			//these are all the things you want to call
			var allCalls = [];

			//either we call the all function (wish fails at the first error)
			var qfunc = Q.allSettled;

			//or optionally, we wait till they all fail or succeed
			if(options.endOnError)
				qfunc = Q.all;
			
			//create a bunch of promises that will be potentially resolved
			for(var i=0; i < eventCalls.length; i++)
				allCalls.push(qCall.apply(qCall, eventCalls[i]));

			//here we go!
			qfunc.call(qfunc, allCalls)
				.then(function(results)
				{
					//we got back stuff back
					//it's easy for Q.all
					//it would have caused an error, and been rejected inside fail
					if(options.endOnError){
						defer.resolve(results);
					}
					else
					{
						var finalValues = {length:0};
						var errors = [];
						var errored = false;

						for(var i=0; i < results.length; i++)
						{
							var result = results[i];

							//we know the outcome
					        if (result.state === "fulfilled") {
					            finalValues[i] = result.value;
					            finalValues.length++;
					            errors.push(undefined);
					        } else {
					            var reason = result.reason;
					            errors.push(reason);
					            errored = true;
					        }
						}

						//let the errors be known
						//we always reject with an array to be consistent
						if(errored)
							defer.reject(errors);
						else //otherwise, all good -- on we go
							defer.resolve(finalValues);
					}
				})
				.fail(function(err)
				{
					//end on error -- we only have one error to return
					//we always return arrays
					defer.reject([err]);
				});

			return defer.promise;
		}
	}

	//backwards compat, but more consistent with getters
	self.getModuleRequirements =
	self.moduleRequirements =  function()
	{
		return JSON.parse(JSON.stringify(requiredEvents));
	};
	//backwards compat, but more consistent with getters
	self.getRegisteredEvents =
	self.registeredEvents = function()
	{	
		//return a deep copy so it can't be messed with
		return JSON.parse(JSON.stringify(callerEvents));
	}

	self.initializeModules = function(done)
	{	
		//call each module for initialization

		var totalCallbacks = self.moduleCount;
		var errors;

		var finishCallback = function(err)
		{
			if(err)
			{
				//we encountered an error, we should send that back
				if(!errors)
					errors = [];
				errors.push(err);
			}

			//no matter what happens, we've finished a callback
			totalCallbacks--;

			if(totalCallbacks == 0)
			{
				//we've finished all the callbacks, we're done with initialization
				//send back errors if we have them
				done(errors);
			}
		}
		var wrapMod = function(mod)
		{
			return function()
			{
				mod.initialize(function(err)
				{
					finishCallback(err);
				});
			}
		}

		var hasInit = false;

		//order of initialization might matter -- perhaps this is part of how objects are arranged in the json file?
		for(var key in moduleObjects)
		{
			var mod = moduleObjects[key];
			//make sure not to accidentally forget this
			if(!mod.initialize)
				totalCallbacks--;
			else {
				hasInit = true;
				//seems goofy, but we dont want any poorly configured modules returning during this for loop -- awkward race condition!
				setTimeout(wrapMod(mod), 0)
			}
		}
		//nobody has an initialize function
		if(!hasInit)
		{
			//call done async
			setTimeout(done, 0);
		}
	}


	self.hasListeners = function()
	{
		throw new Error("Backbone doesn't pass listeners through itself any more, it uses the emitter.hasListeners. You must call backbone.getEmitter(moduleObject) to get an emitter.");
	}

	self.emit = function()
	{
		throw new Error("Backbone doesn't pass messages through emit any more. You must call backbone.getEmitter(moduleObject) -- passing the object.");
	}

	self.moduleHasListeners = function()
	{
		//pass request through module here!
		return innerHasListeners.apply(self, arguments);
	}

	self.moduleEmit = function()
	{
		//there are more than two 
		// internalLog('Emit: ', arguments);
		if(arguments.length < 2 || typeof arguments[0] != "string" || typeof arguments[1] != "string")
		{
			throw new Error("Cannot emit with less than two arguments, each of which must be strings: " + JSON.stringify(arguments));
		}
		//take the first argument from the array -- this is the caller
		var caller = shift.apply(arguments);
		//pull out the function and event name arguments to verify the callback
		var parsed = parseEventName(arguments[0]);
		var wFunction = parsed.winFunction;
		var eventName = parsed.eventName;

		internalLog("[" + caller + "]", "calling", "[" + parsed.winFunction + "]->" + eventName);

		//now we check if this caller declared intentions 
		if(!self.verifyEmit(caller, wFunction, eventName))
		{
			throw new Error("[" + caller + "] didn't require event [" + parsed.winFunction + "]->" + parsed.eventName);
		}

		//otherwise, normal emit will work! We've already peeled off the "caller", so it's just the event + arguments being passed
		innerEmit.apply(self, arguments);

	}

	self.verifyEmit = function(caller, winFunction, eventName)
	{
		//did this caller register for this event?
		if((!requiredEvents[caller] || !requiredEvents[caller][winFunction] || !requiredEvents[caller][winFunction][eventName])
			&& (!optionalEvents[caller] || !optionalEvents[caller][winFunction] || !optionalEvents[caller][winFunction][eventName]))
			return false;


		return true;
	}

	return self;
}




});
require.register("canvas-display/canvas-display.js", function(exports, require, module){

//export a helpful canvas frame display -- super clearer than before
module.exports = canvassetup;

//here we are ready to setup
function canvassetup(canvasID, framesToDisplay, canvasInfo, svg, startFrame)
{
	var self = this;

	//must be a creator first! -- make our static canvas objects
	//we create our canvas objects -- we can use this later
	var canvas = new fabric.StaticCanvas(canvasID, {});

    //don't render when we just add stuff you know?????
    canvas.renderOnAddRemove = false;

    //what canvas are we drawing on
    var canvasWidth = canvasInfo.canvasWidth;
	var canvasHeight = canvasInfo.canvasHeight;

	//keep this to ourselves
	var cwD2 = canvasWidth/2;
	var chD2 = 3*canvasHeight/4;

    //how long do we linger on each frame?
	var msPerFrame = canvasInfo.msPerFrame || 250;
	
	//how mnay frames do we have
	var frameCount = framesToDisplay.length;

	//which frame are we on now
	var currentFrame = (startFrame || 0) - 1;

	//zooming in initially -- could leave something to desire -- in the future, we want to track the center of mass and adjust accordingly
	var zoomIn = canvasInfo.initialZoom || 2.5;

	//convert frames to objects
	for(var i=0; i < framesToDisplay.length; i++){
		if(typeof framesToDisplay[i] == "string")
			framesToDisplay[i] = JSON.parse(framesToDisplay[i]);
	}

	//so convenient up here
    var radToDeg = 180.0/Math.PI;

    //all our fab objects are belong to us
    var _iFabObjects = {};
    var _iJointObjects = {};

	//do we want to pause/end animation?
	var shouldEndAnimation = false;

	//by default we center the camera where the indivudal in the frame is
	var centerCamera = true;

	//okay, just do it already
	if(framesToDisplay.length)
		switchFrames();

	self.endAnimation = function()
	{
		shouldEndAnimation = true;
	}
	self.startAnimation = function(){
		shouldEndAnimation = false;
		switchFrames();
	}
	self.restartAnimation = function()
	{
		currentFrame = -1;
		self.startAnimation();
	}

	self.getCurrentFrame = function(){return currentFrame;};


	self.frameToSVG = function(frame, camCentered, clear)
	{
		self.forceDisplayFrame(frame,camCentered, clear);
		//then we need to get the svg object from the canvas
		return canvas.toSVG();
	}

	self.forceDisplayFrame = function(frame, camCentered, clear)
	{	

		if(clear)
		{
			//get rid of all the fab objects
			_iFabObjects = {};
			_iJointObjects = {};

			//then clear the canvas
			canvas.clear();
		}
		//do we adjust camera for this frame?
		centerCamera = camCentered;


		if(typeof frame == "string")
			frame = JSON.parse(frame);

		//force the frame into the canvas
		displayFrame(frame);

		//now render the new canvas 
		canvas.renderAll();
	}

	//lets switch frames now
	function switchFrames()
	{
		//don't start 
		if(shouldEndAnimation)
			return;

		// console.log("switch frame");
		//bump the frame
		currentFrame++;
		currentFrame = currentFrame % frameCount;

		//send in an object for displaying -- oh boy oh boy
		displayFrame(framesToDisplay[currentFrame]);

		//now render the new canvas 
		canvas.renderAll();

		if(svg){
			var width = svg.getAttribute("width");	
			svg.setAttribute("width", parseFloat(width) + .0000000001);
		}
		//no more animating for you
		if(!shouldEndAnimation)
			//do it again soon please -- pretty please
			setTimeout(switchFrames, msPerFrame);
	}

	function displayFrame(frame)
	{
        var insertObjects = frame.shapes;

		var xCOM = 0;
		var x_count =0;

		var minInsertIndex = Number.MAX_VALUE;
		// var fabPolyLine =  new fabric.Polyline(info.points, {fill: this.lineColor, stroke:this.lineColor, strokeWidth:this.lineWidth, opacity: .7});
  //   	fabPolyLine.drawID = joint.drawID;
        
        //ids are consistent across frames so only create objects once
		for(var id in insertObjects) {

			var fabObj, props;
			var canvasObj = insertObjects[id];
			var polyPoints, tl, bodyOffset, color, wh;
			var radius, center;
			var props;

			var splitID = id.split("_")[0];
			fabObj = _iFabObjects[splitID];

			//caputre whether or not this existed after shapes are created -- we need to know if we're adding or updating
			var exists = (fabObj ? true : false); 


			switch (canvasObj.type) {
				case "Rect":
				    props = rectangleProps(canvasObj.rotation, canvasObj.topLeft, canvasObj.widthHeight, canvasObj.bodyOffset, canvasObj.color);

				    // console.log("R props: ",props);
				    if(!fabObj)
				    	fabObj = new fabric.Rect(props);

				    break;

				case "Polygon":

				    props = polygonProps(canvasObj.rotation, canvasObj.points, canvasObj.bodyOffset, canvasObj.color);
				    // console.log(":P props: ",props);
					
				    if(!fabObj)
						fabObj = new fabric.Polygon(canvasObj.points, props);

					break;

				case "Circle":
					props = circleProps(canvasObj.center, canvasObj.radius, canvasObj.bodyOffset, canvasObj.stroke, canvasObj.color);
				    // console.log("C props: ",props);

					if(!fabObj)
				    	fabObj = new fabric.Circle(props);

				    break;
			}

			if(splitID != "ground"){
				xCOM += props.left;
				x_count++;
			}
                //already existed -- update
            if(exists)
            	updateObject(fabObj, props);
            else
            {
        	  	_iFabObjects[splitID] = fabObj;
        	  	
        	  	if(splitID != "ground")
        	  		minInsertIndex = Math.min(minInsertIndex, canvas.getObjects().length);
        	  	fabObj.iesorID = splitID;
                canvas.add(fabObj);
            }
        }	

        //how much zooming do we zoom zoom now?
        var zoomX = zoomY = zoomIn;

        //set phasers to zoom moderately!
        //move center of mass if necessary
		setZoom(zoomX, zoomY, centerCamera ? xCOM/x_count : undefined);


		//we actually draw the joints AFTER the movement -- that way we are placed properly 
        var joints = frame.joints;

        // console.log(Object.keys(insertObjects));
        // console.log(joints);

        for(var id in joints)
        {
        	var jLink = joints[id];
        	// console.log(jLink);

        	var sourceObj = _iFabObjects[jLink.sourceID];
        	var targetObj = _iFabObjects[jLink.targetID];

        	var jointFab = _iJointObjects[id];

        	var props, jPoints;

        	// if(sourceObj && targetObj)
        	// {
    		//let's draw them together -- shall we?
    		//we need the center of the object as our point
    		var srcPt = {
    			x: sourceObj.left + sourceObj.radius, 
    			y: sourceObj.top - sourceObj.radius
    		};

    		var tgtPt = {
    			x: targetObj.left + targetObj.radius, 
    			y: targetObj.top - targetObj.radius
    		}

    		jPoints = [];
    		jPoints.push(srcPt, tgtPt);

    		props = {
    			// top : 0,
    			// left : 0,
    			// points:points,
    			fill : canvasInfo.lineColor || '#000',// '#B2B212';
    			strokeWidth : canvasInfo.strokeWidth || 3,// '#B2B212';
    			stroke : canvasInfo.lineColor || '#000',//FFC704// '#B2B212';
    			opacity : canvasInfo.jointOpacity || 1.0
    		};

        		//now add or update the props
        		// console.log("Points: ", points);

        	// }
        	// else
        	// 	continue;


        	if(jointFab)
        	{
        		jointFab.points = jPoints;
        		updateObject(jointFab, props);
        	}
        	else
        	{
        		var clonePoints = JSON.parse(JSON.stringify(jPoints));
        		jointFab = new fabric.Polyline(clonePoints, props);
        		jointFab.points = jPoints;
        		jointFab.skipZoom = true;
        		_iJointObjects[id] = jointFab;

        		//insert jPoints at appropriate index please
        		canvas.getObjects().splice(minInsertIndex, 0, jointFab);
        	}
        }


	}


	function clearOriginalTL(fabObj)
	{
		fabObj.original_left = undefined;
		fabObj.original_top = undefined;
	}

	function updateObject(fab, props) {

	    //clear out top/left info
	    clearOriginalTL(fab);
	    fab.set(props);
	    if(props.angle)
	        fab.setAngle(props.angle);
	}

	function rectangleProps(rotation, tl, wh, bodyOffset, color)
	{
		//
		// bodyOffset = canvasObj.bodyOffset;
		// wh = canvasObj.widthHeight;
		// tl = canvasObj.topLeft;
		// color = canvasObj.color || '#f55';
		// canvasObj.rotation

		props = { 
        	top: chD2 - tl.y - bodyOffset.y, 
        	left: tl.x + cwD2 + bodyOffset.x,
            width: parseFloat(wh.width), height:  parseFloat(wh.height), fill: color,
            angle: radToDeg*rotation
		};

		return props;
	}

	function polygonProps(rotation, points, bodyOffset, color)
	{
		 //polygon stuff -- just invert y?

		for(var p=0; p < points.length; p++)
		{
		    points[p].y *= -1.0;
		}

		color = color || "#43B";

		props = {
		    top: chD2 - bodyOffset.y,
		    left: cwD2 + bodyOffset.x,
		    fill: color, angle: radToDeg*rotation 
		};

		return props;
	}

	function circleProps(center, radius, bodyOffset, stroke, color)
	{
        color = color || 'green';	

        stroke = stroke || '#147';
        var sw = .5;

        props = { 
        	top: chD2 - center.y - bodyOffset.y - sw/2,
        	left: cwD2 + center.x + bodyOffset.x - sw/2,
        	radius: radius,
            fill: color,
            stroke: stroke,
            strokeWidth: sw
        };
            // console.log("Print it circle: ", props);
		return props;
	}

	function setZoom(zoomX, zoomY, xCOM)
	{
		//do this for all objects
		var objects = canvas.getObjects();

		for(var key in objects)
		{
			//grab obj properties
			var object = objects[key];
			var scaleX = object.scaleX,
			    scaleY = object.scaleY,
			    left = object.left,
			    top = object.top;

			    //don't zoom something you don't want to!
			    if(object.skipZoom)
			    	continue;

			// preserve the original dimensions.
			object.original_scaleX = (object.original_scaleX == undefined) ? scaleX : object.original_scaleX;
			object.original_scaleY = (object.original_scaleY == undefined) ? scaleY : object.original_scaleY;
			object.original_left = (object.original_left == undefined) ? left : object.original_left;
			object.original_top = (object.original_top == undefined) ? top : object.original_top;

			object.scaleX = object.original_scaleX * zoomX;
			object.scaleY = object.original_scaleY * zoomY;
			object.left = (object.original_left - cwD2) * zoomX + cwD2;
			object.top = (object.original_top - chD2)* zoomY + chD2;

			if(object.iesorID != "ground" && xCOM)
			{
				object.left -= (xCOM - cwD2)*zoomX;
				// object.top -= com.y;
			}

			//update accordingly
			object.setCoords();
		}
	}

	return self;
}

});
require.register("component-bind/index.js", function(exports, require, module){
/**
 * Slice reference.
 */

var slice = [].slice;

/**
 * Bind `obj` to `fn`.
 *
 * @param {Object} obj
 * @param {Function|String} fn or string
 * @return {Function}
 * @api public
 */

module.exports = function(obj, fn){
  if ('string' == typeof fn) fn = obj[fn];
  if ('function' != typeof fn) throw new Error('bind() requires a function');
  var args = slice.call(arguments, 2);
  return function(){
    return fn.apply(obj, args.concat(slice.call(arguments)));
  }
};

});
require.register("component-trim/index.js", function(exports, require, module){

exports = module.exports = trim;

function trim(str){
  if (str.trim) return str.trim();
  return str.replace(/^\s*|\s*$/g, '');
}

exports.left = function(str){
  if (str.trimLeft) return str.trimLeft();
  return str.replace(/^\s*/, '');
};

exports.right = function(str){
  if (str.trimRight) return str.trimRight();
  return str.replace(/\s*$/, '');
};

});
require.register("component-event/index.js", function(exports, require, module){
var bind = window.addEventListener ? 'addEventListener' : 'attachEvent',
    unbind = window.removeEventListener ? 'removeEventListener' : 'detachEvent',
    prefix = bind !== 'addEventListener' ? 'on' : '';

/**
 * Bind `el` event `type` to `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, type, fn, capture){
  el[bind](prefix + type, fn, capture || false);
  return fn;
};

/**
 * Unbind `el` event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  el[unbind](prefix + type, fn, capture || false);
  return fn;
};
});
require.register("component-query/index.js", function(exports, require, module){
function one(selector, el) {
  return el.querySelector(selector);
}

exports = module.exports = function(selector, el){
  el = el || document;
  return one(selector, el);
};

exports.all = function(selector, el){
  el = el || document;
  return el.querySelectorAll(selector);
};

exports.engine = function(obj){
  if (!obj.one) throw new Error('.one callback required');
  if (!obj.all) throw new Error('.all callback required');
  one = obj.one;
  exports.all = obj.all;
  return exports;
};

});
require.register("component-matches-selector/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var query = require('query');

/**
 * Element prototype.
 */

var proto = Element.prototype;

/**
 * Vendor function.
 */

var vendor = proto.matches
  || proto.webkitMatchesSelector
  || proto.mozMatchesSelector
  || proto.msMatchesSelector
  || proto.oMatchesSelector;

/**
 * Expose `match()`.
 */

module.exports = match;

/**
 * Match `el` to `selector`.
 *
 * @param {Element} el
 * @param {String} selector
 * @return {Boolean}
 * @api public
 */

function match(el, selector) {
  if (vendor) return vendor.call(el, selector);
  var nodes = query.all(selector, el.parentNode);
  for (var i = 0; i < nodes.length; ++i) {
    if (nodes[i] == el) return true;
  }
  return false;
}

});
require.register("discore-closest/index.js", function(exports, require, module){
var matches = require('matches-selector')

module.exports = function (element, selector, checkYoSelf, root) {
  element = checkYoSelf ? {parentNode: element} : element

  root = root || document

  // Make sure `element !== document` and `element != null`
  // otherwise we get an illegal invocation
  while ((element = element.parentNode) && element !== document) {
    if (matches(element, selector))
      return element
    // After `matches` on the edge case that
    // the selector matches the root
    // (when the root is not the document)
    if (element === root)
      return  
  }
}
});
require.register("component-delegate/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var closest = require('closest')
  , event = require('event');

/**
 * Delegate event `type` to `selector`
 * and invoke `fn(e)`. A callback function
 * is returned which may be passed to `.unbind()`.
 *
 * @param {Element} el
 * @param {String} selector
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @return {Function}
 * @api public
 */

exports.bind = function(el, selector, type, fn, capture){
  return event.bind(el, type, function(e){
    var target = e.target || e.srcElement;
    e.delegateTarget = closest(target, selector, true, el);
    if (e.delegateTarget) fn.call(el, e);
  }, capture);
};

/**
 * Unbind event `type`'s callback `fn`.
 *
 * @param {Element} el
 * @param {String} type
 * @param {Function} fn
 * @param {Boolean} capture
 * @api public
 */

exports.unbind = function(el, type, fn, capture){
  event.unbind(el, type, fn, capture);
};

});
require.register("component-events/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var events = require('event');
var delegate = require('delegate');

/**
 * Expose `Events`.
 */

module.exports = Events;

/**
 * Initialize an `Events` with the given
 * `el` object which events will be bound to,
 * and the `obj` which will receive method calls.
 *
 * @param {Object} el
 * @param {Object} obj
 * @api public
 */

function Events(el, obj) {
  if (!(this instanceof Events)) return new Events(el, obj);
  if (!el) throw new Error('element required');
  if (!obj) throw new Error('object required');
  this.el = el;
  this.obj = obj;
  this._events = {};
}

/**
 * Subscription helper.
 */

Events.prototype.sub = function(event, method, cb){
  this._events[event] = this._events[event] || {};
  this._events[event][method] = cb;
};

/**
 * Bind to `event` with optional `method` name.
 * When `method` is undefined it becomes `event`
 * with the "on" prefix.
 *
 * Examples:
 *
 *  Direct event handling:
 *
 *    events.bind('click') // implies "onclick"
 *    events.bind('click', 'remove')
 *    events.bind('click', 'sort', 'asc')
 *
 *  Delegated event handling:
 *
 *    events.bind('click li > a')
 *    events.bind('click li > a', 'remove')
 *    events.bind('click a.sort-ascending', 'sort', 'asc')
 *    events.bind('click a.sort-descending', 'sort', 'desc')
 *
 * @param {String} event
 * @param {String|function} [method]
 * @return {Function} callback
 * @api public
 */

Events.prototype.bind = function(event, method){
  var e = parse(event);
  var el = this.el;
  var obj = this.obj;
  var name = e.name;
  var method = method || 'on' + name;
  var args = [].slice.call(arguments, 2);

  // callback
  function cb(){
    var a = [].slice.call(arguments).concat(args);
    obj[method].apply(obj, a);
  }

  // bind
  if (e.selector) {
    cb = delegate.bind(el, e.selector, name, cb);
  } else {
    events.bind(el, name, cb);
  }

  // subscription for unbinding
  this.sub(name, method, cb);

  return cb;
};

/**
 * Unbind a single binding, all bindings for `event`,
 * or all bindings within the manager.
 *
 * Examples:
 *
 *  Unbind direct handlers:
 *
 *     events.unbind('click', 'remove')
 *     events.unbind('click')
 *     events.unbind()
 *
 * Unbind delegate handlers:
 *
 *     events.unbind('click', 'remove')
 *     events.unbind('click')
 *     events.unbind()
 *
 * @param {String|Function} [event]
 * @param {String|Function} [method]
 * @api public
 */

Events.prototype.unbind = function(event, method){
  if (0 == arguments.length) return this.unbindAll();
  if (1 == arguments.length) return this.unbindAllOf(event);

  // no bindings for this event
  var bindings = this._events[event];
  if (!bindings) return;

  // no bindings for this method
  var cb = bindings[method];
  if (!cb) return;

  events.unbind(this.el, event, cb);
};

/**
 * Unbind all events.
 *
 * @api private
 */

Events.prototype.unbindAll = function(){
  for (var event in this._events) {
    this.unbindAllOf(event);
  }
};

/**
 * Unbind all events for `event`.
 *
 * @param {String} event
 * @api private
 */

Events.prototype.unbindAllOf = function(event){
  var bindings = this._events[event];
  if (!bindings) return;

  for (var method in bindings) {
    this.unbind(event, method);
  }
};

/**
 * Parse `event`.
 *
 * @param {String} event
 * @return {Object}
 * @api private
 */

function parse(event) {
  var parts = event.split(/ +/);
  return {
    name: parts.shift(),
    selector: parts.join(' ')
  }
}

});
require.register("component-keyname/index.js", function(exports, require, module){

/**
 * Key name map.
 */

var map = {
  8: 'backspace',
  9: 'tab',
  13: 'enter',
  16: 'shift',
  17: 'ctrl',
  18: 'alt',
  20: 'capslock',
  27: 'esc',
  32: 'space',
  33: 'pageup',
  34: 'pagedown',
  35: 'end',
  36: 'home',
  37: 'left',
  38: 'up',
  39: 'right',
  40: 'down',
  45: 'ins',
  46: 'del',
  91: 'meta',
  93: 'meta',
  224: 'meta'
};

/**
 * Return key name for `n`.
 *
 * @param {Number} n
 * @return {String}
 * @api public
 */

module.exports = function(n){
  return map[n];
};
});
require.register("component-props/index.js", function(exports, require, module){
/**
 * Global Names
 */

var globals = /\b(this|Array|Date|Object|Math|JSON)\b/g;

/**
 * Return immediate identifiers parsed from `str`.
 *
 * @param {String} str
 * @param {String|Function} map function or prefix
 * @return {Array}
 * @api public
 */

module.exports = function(str, fn){
  var p = unique(props(str));
  if (fn && 'string' == typeof fn) fn = prefixed(fn);
  if (fn) return map(str, p, fn);
  return p;
};

/**
 * Return immediate identifiers in `str`.
 *
 * @param {String} str
 * @return {Array}
 * @api private
 */

function props(str) {
  return str
    .replace(/\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^/]+)\//g, '')
    .replace(globals, '')
    .match(/[$a-zA-Z_]\w*/g)
    || [];
}

/**
 * Return `str` with `props` mapped with `fn`.
 *
 * @param {String} str
 * @param {Array} props
 * @param {Function} fn
 * @return {String}
 * @api private
 */

function map(str, props, fn) {
  var re = /\.\w+|\w+ *\(|"[^"]*"|'[^']*'|\/([^/]+)\/|[a-zA-Z_]\w*/g;
  return str.replace(re, function(_){
    if ('(' == _[_.length - 1]) return fn(_);
    if (!~props.indexOf(_)) return _;
    return fn(_);
  });
}

/**
 * Return unique array.
 *
 * @param {Array} arr
 * @return {Array}
 * @api private
 */

function unique(arr) {
  var ret = [];

  for (var i = 0; i < arr.length; i++) {
    if (~ret.indexOf(arr[i])) continue;
    ret.push(arr[i]);
  }

  return ret;
}

/**
 * Map with prefix `str`.
 */

function prefixed(str) {
  return function(_){
    return str + _;
  };
}

});
require.register("component-to-function/index.js", function(exports, require, module){
/**
 * Module Dependencies
 */

var expr = require('props');

/**
 * Expose `toFunction()`.
 */

module.exports = toFunction;

/**
 * Convert `obj` to a `Function`.
 *
 * @param {Mixed} obj
 * @return {Function}
 * @api private
 */

function toFunction(obj) {
  switch ({}.toString.call(obj)) {
    case '[object Object]':
      return objectToFunction(obj);
    case '[object Function]':
      return obj;
    case '[object String]':
      return stringToFunction(obj);
    case '[object RegExp]':
      return regexpToFunction(obj);
    default:
      return defaultToFunction(obj);
  }
}

/**
 * Default to strict equality.
 *
 * @param {Mixed} val
 * @return {Function}
 * @api private
 */

function defaultToFunction(val) {
  return function(obj){
    return val === obj;
  }
}

/**
 * Convert `re` to a function.
 *
 * @param {RegExp} re
 * @return {Function}
 * @api private
 */

function regexpToFunction(re) {
  return function(obj){
    return re.test(obj);
  }
}

/**
 * Convert property `str` to a function.
 *
 * @param {String} str
 * @return {Function}
 * @api private
 */

function stringToFunction(str) {
  // immediate such as "> 20"
  if (/^ *\W+/.test(str)) return new Function('_', 'return _ ' + str);

  // properties such as "name.first" or "age > 18" or "age > 18 && age < 36"
  return new Function('_', 'return ' + get(str));
}

/**
 * Convert `object` to a function.
 *
 * @param {Object} object
 * @return {Function}
 * @api private
 */

function objectToFunction(obj) {
  var match = {}
  for (var key in obj) {
    match[key] = typeof obj[key] === 'string'
      ? defaultToFunction(obj[key])
      : toFunction(obj[key])
  }
  return function(val){
    if (typeof val !== 'object') return false;
    for (var key in match) {
      if (!(key in val)) return false;
      if (!match[key](val[key])) return false;
    }
    return true;
  }
}

/**
 * Built the getter function. Supports getter style functions
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function get(str) {
  var props = expr(str);
  if (!props.length) return '_.' + str;

  var val;
  for(var i = 0, prop; prop = props[i]; i++) {
    val = '_.' + prop;
    val = "('function' == typeof " + val + " ? " + val + "() : " + val + ")";
    str = str.replace(new RegExp(prop, 'g'), val);
  }

  return str;
}

});
require.register("component-type/index.js", function(exports, require, module){

/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Function]': return 'function';
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object String]': return 'string';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val && val.nodeType === 1) return 'element';
  if (val === Object(val)) return 'object';

  return typeof val;
};

});
require.register("component-each/index.js", function(exports, require, module){

/**
 * Module dependencies.
 */

var type = require('type');
var toFunction = require('to-function');

/**
 * HOP reference.
 */

var has = Object.prototype.hasOwnProperty;

/**
 * Iterate the given `obj` and invoke `fn(val, i)`
 * in optional context `ctx`.
 *
 * @param {String|Array|Object} obj
 * @param {Function} fn
 * @param {Object} [ctx]
 * @api public
 */

module.exports = function(obj, fn, ctx){
  fn = toFunction(fn);
  ctx = ctx || this;
  switch (type(obj)) {
    case 'array':
      return array(obj, fn, ctx);
    case 'object':
      if ('number' == typeof obj.length) return array(obj, fn, ctx);
      return object(obj, fn, ctx);
    case 'string':
      return string(obj, fn, ctx);
  }
};

/**
 * Iterate string chars.
 *
 * @param {String} obj
 * @param {Function} fn
 * @param {Object} ctx
 * @api private
 */

function string(obj, fn, ctx) {
  for (var i = 0; i < obj.length; ++i) {
    fn.call(ctx, obj.charAt(i), i);
  }
}

/**
 * Iterate object keys.
 *
 * @param {Object} obj
 * @param {Function} fn
 * @param {Object} ctx
 * @api private
 */

function object(obj, fn, ctx) {
  for (var key in obj) {
    if (has.call(obj, key)) {
      fn.call(ctx, key, obj[key]);
    }
  }
}

/**
 * Iterate array-ish.
 *
 * @param {Array|Object} obj
 * @param {Function} fn
 * @param {Object} ctx
 * @api private
 */

function array(obj, fn, ctx) {
  for (var i = 0; i < obj.length; ++i) {
    fn.call(ctx, obj[i], i);
  }
}

});
require.register("component-set/index.js", function(exports, require, module){

/**
 * Expose `Set`.
 */

module.exports = Set;

/**
 * Initialize a new `Set` with optional `vals`
 *
 * @param {Array} vals
 * @api public
 */

function Set(vals) {
  if (!(this instanceof Set)) return new Set(vals);
  this.vals = [];
  if (vals) {
    for (var i = 0; i < vals.length; ++i) {
      this.add(vals[i]);
    }
  }
}

/**
 * Add `val`.
 *
 * @param {Mixed} val
 * @api public
 */

Set.prototype.add = function(val){
  if (this.has(val)) return;
  this.vals.push(val);
};

/**
 * Check if this set has `val`.
 *
 * @param {Mixed} val
 * @return {Boolean}
 * @api public
 */

Set.prototype.has = function(val){
  return !! ~this.indexOf(val);
};

/**
 * Return the indexof `val`.
 *
 * @param {Mixed} val
 * @return {Number}
 * @api private
 */

Set.prototype.indexOf = function(val){
  for (var i = 0, len = this.vals.length; i < len; ++i) {
    var obj = this.vals[i];
    if (obj.equals && obj.equals(val)) return i;
    if (obj == val) return i;
  }
  return -1;
};

/**
 * Iterate each member and invoke `fn(val)`.
 *
 * @param {Function} fn
 * @return {Set}
 * @api public
 */

Set.prototype.each = function(fn){
  for (var i = 0; i < this.vals.length; ++i) {
    fn(this.vals[i]);
  }
  return this;
};

/**
 * Return the values as an array.
 *
 * @return {Array}
 * @api public
 */

Set.prototype.values =
Set.prototype.array =
Set.prototype.members =
Set.prototype.toJSON = function(){
  return this.vals;
};

/**
 * Return the set size.
 *
 * @return {Number}
 * @api public
 */

Set.prototype.size = function(){
  return this.vals.length;
};

/**
 * Empty the set and return old values.
 *
 * @return {Array}
 * @api public
 */

Set.prototype.clear = function(){
  var old = this.vals;
  this.vals = [];
  return old;
};

/**
 * Remove `val`, returning __true__ when present, otherwise __false__.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api public
 */

Set.prototype.remove = function(val){
  var i = this.indexOf(val);
  if (~i) this.vals.splice(i, 1);
  return !! ~i;
};

/**
 * Perform a union on `set`.
 *
 * @param {Set} set
 * @return {Set} new set
 * @api public
 */

Set.prototype.union = function(set){
  var ret = new Set;
  var a = this.vals;
  var b = set.vals;
  for (var i = 0; i < a.length; ++i) ret.add(a[i]);
  for (var i = 0; i < b.length; ++i) ret.add(b[i]);
  return ret;
};

/**
 * Perform an intersection on `set`.
 *
 * @param {Set} set
 * @return {Set} new set
 * @api public
 */

Set.prototype.intersect = function(set){
  var ret = new Set;
  var a = this.vals;
  var b = set.vals;

  for (var i = 0; i < a.length; ++i) {
    if (set.has(a[i])) {
      ret.add(a[i]);
    }
  }

  for (var i = 0; i < b.length; ++i) {
    if (this.has(b[i])) {
      ret.add(b[i]);
    }
  }

  return ret;
};

/**
 * Check if the set is empty.
 *
 * @return {Boolean}
 * @api public
 */

Set.prototype.isEmpty = function(){
  return 0 == this.vals.length;
};


});
require.register("stephenmathieson-normalize/index.js", function(exports, require, module){

/**
 * Normalize the events provided to `fn`
 *
 * @api public
 * @param {Function|Event} fn
 * @return {Function|Event}
 */

exports = module.exports = function (fn) {
  // handle functions which are passed an event
  if (typeof fn === 'function') {
    return function (event) {
      event = exports.normalize(event);
      fn.call(this, event);
    };
  }

  // just normalize the event
  return exports.normalize(fn);
};

/**
 * Normalize the given `event`
 *
 * @api private
 * @param {Event} event
 * @return {Event}
 */

exports.normalize = function (event) {
  event = event || window.event;

  event.target = event.target || event.srcElement;

  event.which = event.which ||  event.keyCode || event.charCode;

  event.preventDefault = event.preventDefault || function () {
    this.returnValue = false;
  };

  event.stopPropagation = event.stopPropagation || function () {
    this.cancelBubble = true;
  };

  return event;
};

});
require.register("component-pillbox/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var Emitter = require('emitter')
  , keyname = require('keyname')
  , events = require('events')
  , each = require('each')
  , Set = require('set')
  , bind = require('bind')
  , trim = require('trim')
  , normalize = require('normalize');

/**
 * Expose `Pillbox`.
 */

module.exports = Pillbox

/**
 * Initialize a `Pillbox` with the given
 * `input` element and `options`.
 *
 * @param {Element} input
 * @param {Object} options
 * @api public
 */

function Pillbox(input, options) {
  if (!(this instanceof Pillbox)) return new Pillbox(input, options);
  this.options = options || {}
  this.input = input;
  this.tags = new Set;
  this.el = document.createElement('div');
  this.el.className = 'pillbox';
  try {
    this.el.style = input.style;
  } catch (e) {
    // IE8 just can't handle this
  }
  input.parentNode.insertBefore(this.el, input);
  input.parentNode.removeChild(input);
  this.el.appendChild(input);
  this.events = events(this.el, this);
  this.bind();
}

/**
 * Mixin emitter.
 */

Emitter(Pillbox.prototype);

/**
 * Bind internal events.
 *
 * @return {Pillbox}
 * @api public
 */

Pillbox.prototype.bind = function(){
  this.events.bind('click');
  this.events.bind('keydown');
  return this;
};

/**
 * Unbind internal events.
 *
 * @return {Pillbox}
 * @api public
 */

Pillbox.prototype.unbind = function(){
  this.events.unbind();
  return this;
};

/**
 * Handle keyup.
 *
 * @api private
 */

Pillbox.prototype.onkeydown = normalize(function(e){
  switch (keyname(e.which)) {
    case 'enter':
      e.preventDefault();
      this.add(e.target.value);
      e.target.value = '';
      break;
    case 'space':
      if (this.options.space === false || this.options.allowSpace === true) 
        return;
      e.preventDefault();
      this.add(e.target.value);
      e.target.value = '';
      break;
    case 'backspace':
      if ('' == e.target.value) {
        this.remove(this.last());
      }
      break;
  }
});

/**
 * Handle click.
 *
 * @api private
 */

Pillbox.prototype.onclick = function(){
  this.input.focus();
};

/**
 * Set / Get all values.
 *
 * @param {Array} vals
 * @return {Array|Pillbox}
 * @api public
 */

Pillbox.prototype.values = function(vals){
  var self = this;

  if (0 == arguments.length) {
    return this.tags.values();
  }

  each(vals, function(value){
    self.add(value);
  });

  return this;
};

/**
 * Return the last member of the set.
 *
 * @return {String}
 * @api private
 */

Pillbox.prototype.last = function(){
  return this.tags.vals[this.tags.vals.length - 1];
};

/**
 * Add `tag`.
 *
 * @param {String} tag
 * @return {Pillbox} self
 * @api public
 */

Pillbox.prototype.add = function(tag) {
  var self = this
  tag = trim(tag);

  // blank
  if ('' == tag) return;

  // exists
  if (this.tags.has(tag)) return;

  // lowercase
  if (this.options.lowercase) tag = tag.toLowerCase();

  // add it
  this.tags.add(tag);

  // list item
  var span = document.createElement('span');
  span.setAttribute('data', tag);
  span.appendChild(document.createTextNode(tag));
  span.onclick = function(e) {
    e.preventDefault();
    self.input.focus();
  };

  // delete link
  var del = document.createElement('a');
  del.appendChild(document.createTextNode('✕'));
  del.href = '#';
  del.onclick = bind(this, this.remove, tag);
  span.appendChild(del);

  this.el.insertBefore(span, this.input);
  this.emit('add', tag);

  return this;
}

/**
 * Remove `tag`.
 *
 * @param {String} tag
 * @return {Pillbox} self
 * @api public
 */

Pillbox.prototype.remove = function(tag) {
  if (!this.tags.has(tag)) return this;
  this.tags.remove(tag);

  var span;
  for (var i = 0; i < this.el.childNodes.length; ++i) {
    span = this.el.childNodes[i];
    if (tag == span.getAttribute('data')) break;
  }

  this.el.removeChild(span);
  this.emit('remove', tag);

  return this;
}

});
require.register("optimuslime-el.js/el.js", function(exports, require, module){
/**
* el.js v0.3 - A JavaScript Node Creation Tool
*
* https://github.com/markgandolfo/el.js
*
* Copyright 2013 Mark Gandolfo and other contributors
* Released under the MIT license.
* http://en.wikipedia.org/wiki/MIT_License
*/

module.exports = el;

function el(tagName, attrs, child) {
  // Pattern to match id & class names
  var pattern = /([a-z]+|#[\w-\d]+|\.[\w\d-]+)/g

  if(arguments.length === 2) {
    if(attrs instanceof Array
    || typeof attrs === 'function'
    || typeof attrs === 'string'
    || attrs.constructor !== Object
    ) {
      child = attrs;
      attrs = undefined;
    }

  }
  // does the user pass attributes in, if not set an empty object up
  attrs = typeof attrs !== 'undefined' ? attrs : {};
  child = typeof child !== 'undefined' ? child : [];
  child = child instanceof Array ? child : [child];

  // run the pattern over the tagname an attempt to pull out class & id attributes
  // shift the first record out as it's the element name
  matched = tagName.match(pattern);
  tagName = matched[0];
  matched.shift();

  // Iterate over the matches and concat the attrs to either class or id keys in attrs json object
  for (var m in matched) {
    if(matched[m][0] == '.') {
      if(attrs['class'] == undefined) {
        attrs['class'] = matched[m].substring(1, matched[m].length);
      } else {
        attrs['class'] = attrs['class'] + ' ' + matched[m].substring(1, matched[m].length);
      }
    } else if(matched[m][0] == '#') {
      if(attrs['id'] == undefined) {
        attrs['id'] = matched[m].substring(1, matched[m].length)
      } else {
        // Feels dirty having multiple id's, but it's allowed: http://www.w3.org/TR/selectors/#id-selectors
        attrs['id'] = attrs['id'] + ' ' + matched[m].substring(1, matched[m].length);
      }
    }
  }

  // create the element
  var element = document.createElement(tagName);
  for(var i = 0; i < child.length; i += 1) {
    (function(child){
      switch(typeof child) {
        case 'object':
          element.appendChild(child);
          break;
        case 'function':
          var discardDoneCallbackResult = false;
          var doneCallback = function doneCallback(content) {
            if (!discardDoneCallbackResult) {
              element.appendChild(content);
            }
          }
          var result = child.apply(null, [doneCallback])
          if(typeof result != 'undefined') {
            discardDoneCallbackResult = true;
            element.appendChild(result);
          }
          break;
        case 'string':
          element.appendChild(document.createTextNode(child));
        default:
          //???
      }
    }(child[i]));

  }

  for (var key in attrs) {
    if (attrs.hasOwnProperty(key)) {
      element.setAttribute(key, attrs[key]);
    }
  }

  return element;
};

// alias
el.create = el.c = el;

// vanity methods
el.img = function(attrs) {
  return el.create('img', attrs);
};

el.a = function(attrs, child) {
  return el.create('a', attrs, child);
};

el.div = function(attrs, child) {
  return el.create('div', attrs, child);
};

el.p = function(attrs, child) {
  return el.create('p', attrs, child);
};

el.input = function(attrs, child) {
  return el.create('input', attrs);
};

});
require.register("component-indexof/index.js", function(exports, require, module){
module.exports = function(arr, obj){
  if (arr.indexOf) return arr.indexOf(obj);
  for (var i = 0; i < arr.length; ++i) {
    if (arr[i] === obj) return i;
  }
  return -1;
};
});
require.register("component-classes/index.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var index = require('indexof');

/**
 * Whitespace regexp.
 */

var re = /\s+/;

/**
 * toString reference.
 */

var toString = Object.prototype.toString;

/**
 * Wrap `el` in a `ClassList`.
 *
 * @param {Element} el
 * @return {ClassList}
 * @api public
 */

module.exports = function(el){
  return new ClassList(el);
};

/**
 * Initialize a new ClassList for `el`.
 *
 * @param {Element} el
 * @api private
 */

function ClassList(el) {
  if (!el) throw new Error('A DOM element reference is required');
  this.el = el;
  this.list = el.classList;
}

/**
 * Add class `name` if not already present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.add = function(name){
  // classList
  if (this.list) {
    this.list.add(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (!~i) arr.push(name);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove class `name` when present, or
 * pass a regular expression to remove
 * any which match.
 *
 * @param {String|RegExp} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.remove = function(name){
  if ('[object RegExp]' == toString.call(name)) {
    return this.removeMatching(name);
  }

  // classList
  if (this.list) {
    this.list.remove(name);
    return this;
  }

  // fallback
  var arr = this.array();
  var i = index(arr, name);
  if (~i) arr.splice(i, 1);
  this.el.className = arr.join(' ');
  return this;
};

/**
 * Remove all classes matching `re`.
 *
 * @param {RegExp} re
 * @return {ClassList}
 * @api private
 */

ClassList.prototype.removeMatching = function(re){
  var arr = this.array();
  for (var i = 0; i < arr.length; i++) {
    if (re.test(arr[i])) {
      this.remove(arr[i]);
    }
  }
  return this;
};

/**
 * Toggle class `name`, can force state via `force`.
 *
 * For browsers that support classList, but do not support `force` yet,
 * the mistake will be detected and corrected.
 *
 * @param {String} name
 * @param {Boolean} force
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.toggle = function(name, force){
  // classList
  if (this.list) {
    if ("undefined" !== typeof force) {
      if (force !== this.list.toggle(name, force)) {
        this.list.toggle(name); // toggle again to correct
      }
    } else {
      this.list.toggle(name);
    }
    return this;
  }

  // fallback
  if ("undefined" !== typeof force) {
    if (!force) {
      this.remove(name);
    } else {
      this.add(name);
    }
  } else {
    if (this.has(name)) {
      this.remove(name);
    } else {
      this.add(name);
    }
  }

  return this;
};

/**
 * Return an array of classes.
 *
 * @return {Array}
 * @api public
 */

ClassList.prototype.array = function(){
  var str = this.el.className.replace(/^\s+|\s+$/g, '');
  var arr = str.split(re);
  if ('' === arr[0]) arr.shift();
  return arr;
};

/**
 * Check if class `name` is present.
 *
 * @param {String} name
 * @return {ClassList}
 * @api public
 */

ClassList.prototype.has =
ClassList.prototype.contains = function(name){
  return this.list
    ? this.list.contains(name)
    : !! ~index(this.array(), name);
};

});
require.register("component-domify/index.js", function(exports, require, module){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  _default: [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */

function parse(html) {
  if ('string' != typeof html) throw new TypeError('String expected');
  
  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return document.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = document.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = document.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = document.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

});
require.register("segmentio-overlay/lib/index.js", function(exports, require, module){
var template = require('./index.html');
var domify = require('domify');
var emitter = require('emitter');
var showable = require('showable');
var classes = require('classes');

/**
 * Export `Overlay`
 */
module.exports = Overlay;


/**
 * Initialize a new `Overlay`.
 *
 * @param {Element} target The element to attach the overlay to
 * @api public
 */

function Overlay(target) {
  if(!(this instanceof Overlay)) return new Overlay(target);

  this.target = target || document.body;
  this.el = domify(template);
  this.el.addEventListener('click', this.handleClick.bind(this));

  var el = this.el;
  var parent = this.target;

  this.on('showing', function(){
    parent.appendChild(el);
  });

  this.on('hide', function(){
    parent.removeChild(el);
  });
}


/**
 * When the overlay is click, emit an event so that
 * the view that is using this overlay can choose
 * to close the overlay if they want
 *
 * @param {Event} e
 */
Overlay.prototype.handleClick = function(e){
  this.emit('click', e);
};


/**
 * Mixins
 */
emitter(Overlay.prototype);
showable(Overlay.prototype);
classes(Overlay.prototype);
});
require.register("timoxley-next-tick/index.js", function(exports, require, module){
"use strict"

if (typeof setImmediate == 'function') {
  module.exports = function(f){ setImmediate(f) }
}
// legacy node.js
else if (typeof process != 'undefined' && typeof process.nextTick == 'function') {
  module.exports = process.nextTick
}
// fallback for other environments / postMessage behaves badly on IE8
else if (typeof window == 'undefined' || window.ActiveXObject || !window.postMessage) {
  module.exports = function(f){ setTimeout(f) };
} else {
  var q = [];

  window.addEventListener('message', function(){
    var i = 0;
    while (i < q.length) {
      try { q[i++](); }
      catch (e) {
        q = q.slice(i);
        window.postMessage('tic!', '*');
        throw e;
      }
    }
    q.length = 0;
  }, true);

  module.exports = function(fn){
    if (!q.length) window.postMessage('tic!', '*');
    q.push(fn);
  }
}

});
require.register("yields-has-transitions/index.js", function(exports, require, module){
/**
 * Check if `el` or browser supports transitions.
 *
 * @param {Element} el
 * @return {Boolean}
 * @api public
 */

exports = module.exports = function(el){
  switch (arguments.length) {
    case 0: return bool;
    case 1: return bool
      ? transitions(el)
      : bool;
  }
};

/**
 * Check if the given `el` has transitions.
 *
 * @param {Element} el
 * @return {Boolean}
 * @api private
 */

function transitions(el, styl){
  if (el.transition) return true;
  styl = window.getComputedStyle(el);
  return !! parseFloat(styl.transitionDuration, 10);
}

/**
 * Style.
 */

var styl = document.body.style;

/**
 * Export support.
 */

var bool = 'transition' in styl
  || 'webkitTransition' in styl
  || 'MozTransition' in styl
  || 'msTransition' in styl;

});
require.register("ecarter-css-emitter/index.js", function(exports, require, module){
/**
 * Module Dependencies
 */

var events = require('event');

// CSS events

var watch = [
  'transitionend'
, 'webkitTransitionEnd'
, 'oTransitionEnd'
, 'MSTransitionEnd'
, 'animationend'
, 'webkitAnimationEnd'
, 'oAnimationEnd'
, 'MSAnimationEnd'
];

/**
 * Expose `CSSnext`
 */

module.exports = CssEmitter;

/**
 * Initialize a new `CssEmitter`
 *
 */

function CssEmitter(element){
  if (!(this instanceof CssEmitter)) return new CssEmitter(element);
  this.el = element;
}

/**
 * Bind CSS events.
 *
 * @api public
 */

CssEmitter.prototype.bind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.bind(this.el, watch[i], fn);
  }
  return this;
};

/**
 * Unbind CSS events
 * 
 * @api public
 */

CssEmitter.prototype.unbind = function(fn){
  for (var i=0; i < watch.length; i++) {
    events.unbind(this.el, watch[i], fn);
  }
  return this;
};

/**
 * Fire callback only once
 * 
 * @api public
 */

CssEmitter.prototype.once = function(fn){
  var self = this;
  function on(){
    self.unbind(on);
    fn.apply(self.el, arguments);
  }
  self.bind(on);
  return this;
};


});
require.register("component-once/index.js", function(exports, require, module){

/**
 * Identifier.
 */

var n = 0;

/**
 * Global.
 */

var global = (function(){ return this })();

/**
 * Make `fn` callable only once.
 *
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

module.exports = function(fn) {
  var id = n++;
  var called;

  function once(){
    // no receiver
    if (this == global) {
      if (called) return;
      called = true;
      return fn.apply(this, arguments);
    }

    // receiver
    var key = '__called_' + id + '__';
    if (this[key]) return;
    this[key] = true;
    return fn.apply(this, arguments);
  }

  return once;
};

});
require.register("yields-after-transition/index.js", function(exports, require, module){

/**
 * dependencies
 */

var has = require('has-transitions')
  , emitter = require('css-emitter')
  , once = require('once');

/**
 * Transition support.
 */

var supported = has();

/**
 * Export `after`
 */

module.exports = after;

/**
 * Invoke the given `fn` after transitions
 *
 * It will be invoked only if the browser
 * supports transitions __and__
 * the element has transitions
 * set in `.style` or css.
 *
 * @param {Element} el
 * @param {Function} fn
 * @return {Function} fn
 * @api public
 */

function after(el, fn){
  if (!supported || !has(el)) return fn();
  emitter(el).bind(fn);
  return fn;
};

/**
 * Same as `after()` only the function is invoked once.
 *
 * @param {Element} el
 * @param {Function} fn
 * @return {Function}
 * @api public
 */

after.once = function(el, fn){
  var callback = once(fn);
  after(el, fn = function(){
    emitter(el).unbind(fn);
    callback();
  });
};

});
require.register("segmentio-showable/index.js", function(exports, require, module){
var after = require('after-transition').once;
var nextTick = require('next-tick');

/**
 * Hide the view
 */
function hide(fn){
  var self = this;

  if(this.hidden == null) {
    this.hidden = this.el.classList.contains('hidden');
  }

  if(this.hidden || this.animating) return;

  this.hidden = true;
  this.animating = true;

  after(self.el, function(){
    self.animating = false;
    self.emit('hide');
    if(fn) fn();
  });

  self.el.classList.add('hidden');
  this.emit('hiding');
  return this;
}

/**
 * Show the view. This waits until after any transitions
 * are finished. It also removed the hide class on the next
 * tick so that the transition actually paints.
 */
function show(fn){
  var self = this;

  if(this.hidden == null) {
    this.hidden = this.el.classList.contains('hidden');
  }

  if(this.hidden === false || this.animating) return;

  this.hidden = false;
  this.animating = true;

  this.emit('showing');

  after(self.el, function(){
    self.animating = false;
    self.emit('show');
    if(fn) fn();
  });

  this.el.offsetHeight;

  nextTick(function(){
    self.el.classList.remove('hidden');
  });

  return this;
}

/**
 * Mixin methods into the view
 *
 * @param {Emitter} obj
 */
module.exports = function(obj) {
  obj.hide = hide;
  obj.show = show;
  return obj;
};
});
require.register("segmentio-on-escape/index.js", function(exports, require, module){

var bind = require('event').bind
  , indexOf = require('indexof');


/**
 * Expose `onEscape`.
 */

module.exports = exports = onEscape;


/**
 * Handlers.
 */

var fns = [];


/**
 * Escape binder.
 *
 * @param {Function} fn
 */

function onEscape (fn) {
  fns.push(fn);
}


/**
 * Bind a handler, for symmetry.
 */

exports.bind = onEscape;


/**
 * Unbind a handler.
 *
 * @param {Function} fn
 */

exports.unbind = function (fn) {
  var index = indexOf(fns, fn);
  if (index !== -1) fns.splice(index, 1);
};


/**
 * Bind to `document` once.
 */

bind(document, 'keydown', function (e) {
  if (27 !== e.keyCode) return;
  for (var i = 0, fn; fn = fns[i]; i++) fn(e);
});
});
require.register("jkroso-classes/index.js", function(exports, require, module){

module.exports = document.createElement('div').classList
  ? require('./modern')
  : require('./fallback')
});
require.register("jkroso-classes/fallback.js", function(exports, require, module){

var index = require('indexof')

exports.add = function(name, el){
	var arr = exports.array(el)
	if (index(arr, name) < 0) {
		arr.push(name)
		el.className = arr.join(' ')
	}
}

exports.remove = function(name, el){
	if (name instanceof RegExp) {
		return exports.removeMatching(name, el)
	}
	var arr = exports.array(el)
	var i = index(arr, name)
	if (i >= 0) {
		arr.splice(i, 1)
		el.className = arr.join(' ')
	}
}

exports.removeMatching = function(re, el){
	var arr = exports.array(el)
	for (var i = 0; i < arr.length;) {
		if (re.test(arr[i])) arr.splice(i, 1)
		else i++
	}
	el.className = arr.join(' ')
}

exports.toggle = function(name, el){
	if (exports.has(name, el)) {
		exports.remove(name, el)
	} else {
		exports.add(name, el)
	}
}

exports.array = function(el){
	return el.className.match(/([^\s]+)/g) || []
}

exports.has =
exports.contains = function(name, el){
	return index(exports.array(el), name) >= 0
}
});
require.register("jkroso-classes/modern.js", function(exports, require, module){

/**
 * Add class `name` if not already present.
 *
 * @param {String} name
 * @param {Element} el
 * @api public
 */

exports.add = function(name, el){
	el.classList.add(name)
}

/**
 * Remove `name` if present
 *
 * @param {String|RegExp} name
 * @param {Element} el
 * @api public
 */

exports.remove = function(name, el){
	if (name instanceof RegExp) {
		return exports.removeMatching(name, el)
	}
	el.classList.remove(name)
}

/**
 * Remove all classes matching `re`.
 *
 * @param {RegExp} re
 * @param {Element} el
 * @api public
 */

exports.removeMatching = function(re, el){
	var arr = exports.array(el)
	for (var i = 0; i < arr.length; i++) {
		if (re.test(arr[i])) el.classList.remove(arr[i])
	}
}

/**
 * Toggle class `name`.
 *
 * @param {String} name
 * @param {Element} el
 * @api public
 */

exports.toggle = function(name, el){
	el.classList.toggle(name)
}

/**
 * Return an array of classes.
 *
 * @param {Element} el
 * @return {Array}
 * @api public
 */

exports.array = function(el){
	return el.className.match(/([^\s]+)/g) || []
}

/**
 * Check if class `name` is present.
 *
 * @param {String} name
 * @param {Element} el
 * @api public
 */

exports.has =
exports.contains = function(name, el){
	return el.classList.contains(name)
}
});
require.register("ianstormtaylor-classes/index.js", function(exports, require, module){

var classes = require('classes');


/**
 * Expose `mixin`.
 */

module.exports = exports = mixin;


/**
 * Mixin the classes methods.
 *
 * @param {Object} object
 * @return {Object}
 */

function mixin (obj) {
  for (var method in exports) obj[method] = exports[method];
  return obj;
}


/**
 * Add a class.
 *
 * @param {String} name
 * @return {Object}
 */

exports.addClass = function (name) {
  classes.add(name, this.el);
  return this;
};


/**
 * Remove a class.
 *
 * @param {String} name
 * @return {Object}
 */

exports.removeClass = function (name) {
  classes.remove(name, this.el);
  return this;
};


/**
 * Has a class?
 *
 * @param {String} name
 * @return {Boolean}
 */

exports.hasClass = function (name) {
  return classes.has(name, this.el);
};


/**
 * Toggle a class.
 *
 * @param {String} name
 * @return {Object}
 */

exports.toggleClass = function (name) {
  classes.toggle(name, this.el);
  return this;
};

});
require.register("segmentio-modal/lib/index.js", function(exports, require, module){
var domify = require('domify');
var Emitter = require('emitter');
var overlay = require('overlay');
var onEscape = require('on-escape');
var template = require('./index.html');
var Showable = require('showable');
var Classes = require('classes');

/**
 * Expose `Modal`.
 */

module.exports = Modal;


/**
 * Initialize a new `Modal`.
 *
 * @param {Element} el The element to put into a modal
 */

function Modal (el) {
  if (!(this instanceof Modal)) return new Modal(el);
 this.el = domify(template);
 this.el.appendChild(el);
 this._overlay = overlay();

 var el = this.el;

 this.on('showing', function(){
   document.body.appendChild(el);
  });

  this.on('hide', function(){
   document.body.removeChild(el);
  });
}


/**
 * Mixin emitter.
 */

Emitter(Modal.prototype);
Showable(Modal.prototype);
Classes(Modal.prototype);


/**
 * Set the transition in/out effect
 *
 * @param {String} type
 *
 * @return {Modal}
 */

Modal.prototype.effect = function(type) {
  this.el.setAttribute('effect', type);
  return this;
};


/**
 * Add an overlay
 *
 * @param {Object} opts
 *
 * @return {Modal}
 */

Modal.prototype.overlay = function(){
  var self = this;
  this.on('showing', function(){
    self._overlay.show();
  });
  this.on('hiding', function(){
    self._overlay.hide();
  });
  return this;
};


/**
 * Make the modal closeable.
 *
 * @return {Modal}
 */

Modal.prototype.closeable =
Modal.prototype.closable = function () {
  var self = this;

  function hide(){
    self.hide();
  }

  this._overlay.on('click', hide);
  onEscape(hide);
  return this;
};

});
require.register("publishui/modal.js", function(exports, require, module){

var modal = require('modal');
var emitter = require('emitter');
var element = require('el.js');
var pillbox = require('pillbox');
var classes = require('classes');

      
module.exports = function(options)
{	
	//must create new object here
	var self = this;

	//don't be the window. you'll mess up events globally
	if(typeof window != "undefined" && self == window)
		self = {};

	//have emit capabilities -- let other know when certain events are triggered
	emitter(self);

	//given a div, we need to make our publishing adjustments
	if(!options.objectSize)
		throw new Error("Need object size for publish view!");

	var modalNames = {
		bPublish: "modal-publish",
		bCancel: "modal-cancel",
		iTitle: "modal-title",
		iTags : "modal-tags",
		dArtifact : "modal-artifact-object",
		dTop : "modal-top",
		dBottom: "modal-bottom",
		dParent : "modal-parent"
	}


	//now, we setup our div objects
	self.createModalWindow = function()
	{
		//we need to make a full blown UI and hook it up to events that will be emitted

		var div = element('div', {id: modalNames.dParent, class: "container fullSize flexContainerColumn"});

		var row = element('div', {id: modalNames.dTop, class: "noPadding flexRow flexSeparate"});

		var titleObject = element('div', {class: "title fullWidth flexContainerRow noPadding"}, 
			[ 
				element('div', {class: "col-xs-3 noPadding"}, 'Title: '),
				element('input', {id: modalNames.iTitle, type : "text", class: "col-auto noPadding titleText"})
			]);

		var tagObject = element('div', {id: "tag-holder", class: "fullSize flexContainerRow noPadding"}, 
			[
				element('div', {class: "col-xs-3 noPadding"}, 'Tags: '),
				element('input', {id: modalNames.iTags, type: "text", class: "col-auto noPadding"})
			]);

		var rightColumn = element('div', {id: "text-col"}, [titleObject, tagObject]);


		var widthAndHeight = "width: " + options.objectSize.width + "px; height: " + options.objectSize.height + "px;"; 
		var leftColumn = element('div', {id: "art-col", class: "col-xs-5"}, element('div', {id: modalNames.dArtifact, style: widthAndHeight, class: "border"}, "artifact here"));

		row.appendChild(leftColumn);
		row.appendChild(rightColumn);


		var pubButton = element('div', {id: modalNames.bPublish, class: "col-auto modalButton publish centerRow"}, "Publish");
		var cancelButton = element('div', {id: modalNames.bCancel, class: "col-auto modalButton cancel centerRow"}, "Cancel");

		var bottom = element('div', {id: modalNames.dBottom, class: "noPadding fullWidth flexContainerRow flexSeparate"}, [pubButton, cancelButton]);

		//now add the top row
		div.appendChild(row);
		div.appendChild(bottom);

		return div;
	}

	var div = self.createModalWindow();

	//do we need this piece?
	document.body.appendChild(div);

	var artifactDiv = document.getElementById(modalNames.dArtifact);

	var title = document.getElementById(modalNames.iTitle);
	//add tags to artifact-tag object
	var tags = document.getElementById(modalNames.iTags);

	var input = pillbox(tags, { lowercase : true, space: true });
	classes(tags.parentNode)
		.add("col-auto")
		.add("noPadding");

	//now we add listeners for publish/cancel
	var pub = document.getElementById(modalNames.bPublish);

	pub.addEventListener('click', function()
	{
		//for right now, we just close the modal
		self.publishArtifact();
	})

	var cancel = document.getElementById(modalNames.bCancel);
	cancel.addEventListener('click', function()
	{
		//for right now, we just close the modal
		self.cancelArtifact();
	})

	var view = modal(div)
		.overlay()
	    .effect('fade-and-scale')
	    .closeable();


    var currentID;

    self.launchPublishModal = function(eID)
    {
    	if(currentID != eID)
    	{
    		//clear tag and titles
    		tags.value = "";
    		title.value = "";
    	}
    	currentID = eID;
    	view.show();

    	var fc;
    	while((fc = artifactDiv.firstChild) != undefined)
    	{
    		artifactDiv.removeChild(fc);
    	}

    	//showing an object with a given id -- removed the innards for replacement
    	self.emit("publishShown", eID, artifactDiv, function()
		{
			//this doesn't have to be called, but it's good to be in the habbit -- since we may also want to display a loading gif
		});
    }

    self.cancelArtifact = function()
    {
    	view.hide();
    	self.emit("publishHidden", currentID);
    }

    self.publishArtifact = function()
    {
    	if(!self.hasListeners("publishArtifact"))
    	{
    		console.log("Warning: No listeners for publishing");
    		view.hide();
    	}
    	else{
    		var meta = {title: title.value, tags: input.values()};
	    	self.emit("publishArtifact", currentID, meta, function()
	    	{
	    		//when finished -- hide the mofo!p
	    		view.hide();
	    	});
	    }
    }


     return self;
}

});
require.register("win-home-ui/main.js", function(exports, require, module){

var emitter = require('emitter');
var element = require('el.js');
// var dimensions = require('dimensions');

module.exports = winhome; 

var uFlexID = 0;

function winhome(backbone, globalConfig, localConfig)
{
	// console.log(divValue); 
	var self = this;

	self.winFunction = "ui";

	self.backEmit = backbone.getEmitter(self);
	self.log = backbone.getLogger(self);

	//add appropriate classes to our given div

	self.uid = "home" + uFlexID++;

	var emitterIDs = 0;
	self.uiEmitters = {};
	self.homeElements = {};


	self.requiredEvents = function(){return ["query:getHomeQuery"];};

	self.eventCallbacks = function()
	{
		return {
			"ui:home-initializeDisplay" : self.initializeDisplay,
			"ui:home-ready" : self.ready
		}

	}

	self.initializeDisplay = function(div, options, finished)
	{
		if(typeof options == "function")
		{
			finished = options;
			options = {};
		}
		else //make sure it exists
			options = options || {};

		var homeHolder = element('div.winhome');

		var title = options.title || "WIN Domain (customize with title option)"; 

		var th2 = document.createElement('h1');
		th2.innerHTML = title;

		var tEl = element('div', {style: "font-size: 2em;"}, th2);

		homeHolder.appendChild(tEl);
		
		var uID = emitterIDs++;
		var uie = {uID: uID};
		emitter(uie);

		self.uiEmitters[uID] = uie;
		self.homeElements[uID] = homeHolder;

		div.appendChild(homeHolder);


		//all done making the display -- added a title and some stuff dooooooop
		finished(undefined, {ui: homeHolder, emitter: uie, uID: uID});
		
	}

	self.createElement = function(wid, category, options)
	{

		var size = options.objectSize || {width: 150, height: 150};

		var addWidth = options.additionalElementWidth || 0;
		var addHeight = options.additionalElementHeight || 50;

		var trueElementSize = "width: " + (size.width) + "px; height: " + (size.height) + "px;"; 
		var fullWidthAndHeight = "width: " + (size.width + addWidth) + "px; height: " + (size.height + addHeight) + "px;"; 
		var id = category + "-" + wid;

		//for now, everything has a border! 

		//now we add some buttons
		var aImg = element('div', {style: trueElementSize, class: "border"});
		var evoBut = element('div', {style: "", class: "homeElementButton border"}, "Branch");
		var history = element('div', {style: "", class: "homeElementButton border"}, "Ancestors");

		//this is where the artifact stuff goes
		var aElement = element('div', {style: fullWidthAndHeight, class: "border"}, [aImg, evoBut, history]); 

		var simpleElement = element('div', {id:id, class: "home"}, [aElement]);



		//we also need to add on some extra space for buttons buttons buttons ! need to branch and stuff

		return {full: simpleElement, artifactElement: aImg, branch: evoBut, ancestors: history};
	}

	self.emitElementCreation = function(emit, wid, artifact, eDiv)
	{
		//let 
		emit.emit("elementCreated", wid, artifact, eDiv, function()
		{
			//maybe we do somehitng her in the future -- nuffin' for now gov'nor
		});
	}

	self.clickBranchButton  = function(emit, wid, artifact, eDiv)
	{
		eDiv.addEventListener('click', function()
		{
			emit.emit("artifactBranch", wid, artifact, eDiv);
		});
	}

	self.clickAncestorsButton  = function(emit, wid, artifact, eDiv)
	{
		eDiv.addEventListener('click', function()
		{
			emit.emit("artifactAncestors", wid, artifact, eDiv);
		});
	}


	self.ready = function(uID, options, finished)
	{
		if(typeof options == "function")
		{
			finished = options;
			options = {};
		}
		else //make sure it exists
			options = options || {};


		//pull the emitter for letting know about new objects
		var emit = self.uiEmitters[uID];
		var home = self.homeElements[uID];

		//okay let's setup up everything for real
		var itemStart = options.itemStart || 0;
		var itemsToDisplay = options.itemsToDisplay || 10;

		self.log("Item query - start: ", itemStart, " end: ", (itemStart + itemsToDisplay));


		//then we make a query request
		self.backEmit("query:getHomeQuery", itemStart, (itemStart + itemsToDisplay), function(err, categories)
		{
			//all the categories returned from the home query, and associated objects
			if(err)
			{
				finished(err);
				return;
			}

			console.log("Ready home query ret: ", categories);


			for(var cat in categories)
			{
				//set up the category title section
				var elWrapper = element('ul#' + cat + "-" + uID, {class: "thumbwrap"});

				var catTitle = document.createElement('h2');
					catTitle.innerHTML = cat;
				var catTitle = element('div', {}, [catTitle, elWrapper]);

				home.appendChild(catTitle);

				//now we let it be known we're creeating elelemtns
				var arts = categories[cat].artifacts;

				for(var i=0; i < arts.length; i++)
				{
					var artifact = arts[i];
					var wid = artifact.wid;

					var elObj = self.createElement(wid, cat, options);

					//add this object to our other elements in the category list
					elWrapper.appendChild(elObj.full);

					self.clickBranchButton(emit, wid, artifact, elObj.branch);
					self.clickAncestorsButton(emit, wid, artifact, elObj.ancestors);

					self.emitElementCreation(emit, wid, artifact, elObj.artifactElement);
				}
			}
			if(finished)
				finished();

		});
	}

	return self;
}




});
require.register("win-setup/win-setup.js", function(exports, require, module){
//here we test the insert functions
//making sure the database is filled with objects of the schema type
// var wMath = require('win-utils').math;

module.exports = winsetup;

function winsetup(requiredEvents, moduleJSON, moduleConfigs, finished)
{ 
    var winback = require('win-backbone');

    var Q = require('q');

    var backbone, generator, backEmit, backLog;

    var emptyModule = 
    {
        winFunction : "experiment",
        eventCallbacks : function(){ return {}; },
        requiredEvents : function() {
            return requiredEvents;
        }
    };

    //add our own empty module onto this object
    moduleJSON["setupExperiment"] = emptyModule;
    
    var qBackboneResponse = function()
    {
        var defer = Q.defer();
        // self.log('qBBRes: Original: ', arguments);

        //first add our own function type
        var augmentArgs = arguments;
        // [].splice.call(augmentArgs, 0, 0, self.winFunction);
        //make some assumptions about the returning call
        var callback = function(err)
        {
            if(err)
            {
              backLog("QCall fail: ", err);
                defer.reject(err);
            }
            else
            {
                //remove the error object, send the info onwards
                [].shift.call(arguments);
                if(arguments.length > 1)
                    defer.resolve(arguments);
                else
                    defer.resolve.apply(defer, arguments);
            }
        };

        //then we add our callback to the end of our function -- which will get resolved here with whatever arguments are passed back
        [].push.call(augmentArgs, callback);

        // self.log('qBBRes: Augmented: ', augmentArgs);
        //make the call, we'll catch it inside the callback!
        backEmit.apply(backEmit, augmentArgs);

        return defer.promise;
    }

    //do this up front yo
    backbone = new winback();

    backbone.logLevel = backbone.testing;

    backEmit = backbone.getEmitter(emptyModule);
    backLog = backbone.getLogger({winFunction:"experiment"});
    backLog.logLevel = backbone.testing;

    //loading modules is synchronous
    backbone.loadModules(moduleJSON, moduleConfigs);

    var registeredEvents = backbone.registeredEvents();
    var requiredEvents = backbone.moduleRequirements();
      
    backLog('Backbone Events registered: ', registeredEvents);
    backLog('Required: ', requiredEvents);

    backbone.initializeModules(function(err)
    {
      backLog("Finished Module Init");
      finished(err, {logger: backLog, emitter: backEmit, backbone: backbone, qCall: qBackboneResponse});
    });
}
});
require.register("iesorUI/js/iesorUI.js", function(exports, require, module){
var cd = require('canvas-display');


});















































require.register("segmentio-overlay/lib/index.html", function(exports, require, module){
module.exports = '<div class="Overlay hidden"></div>';
});






require.register("segmentio-modal/lib/index.html", function(exports, require, module){
module.exports = '<div class="Modal hidden" effect="toggle"></div>';
});


require.alias("optimuslime-win-query/lib/win-query.js", "iesorUI/deps/win-query/lib/win-query.js");
require.alias("optimuslime-win-query/lib/win-query.js", "iesorUI/deps/win-query/index.js");
require.alias("optimuslime-win-query/lib/win-query.js", "win-query/index.js");
require.alias("visionmedia-superagent/lib/client.js", "optimuslime-win-query/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "optimuslime-win-query/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("optimuslime-win-query/lib/win-query.js", "optimuslime-win-query/index.js");
require.alias("optimuslime-win-data/lib/win-data.js", "iesorUI/deps/win-data/lib/win-data.js");
require.alias("optimuslime-win-data/lib/win-data.js", "iesorUI/deps/win-data/index.js");
require.alias("optimuslime-win-data/lib/win-data.js", "win-data/index.js");
require.alias("visionmedia-superagent/lib/client.js", "optimuslime-win-data/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "optimuslime-win-data/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("optimuslime-win-data/lib/win-data.js", "optimuslime-win-data/index.js");
require.alias("optimuslime-win-utils/winutils.js", "iesorUI/deps/win-utils/winutils.js");
require.alias("optimuslime-win-utils/uuid/cuid.js", "iesorUI/deps/win-utils/uuid/cuid.js");
require.alias("optimuslime-win-utils/math/winmath.js", "iesorUI/deps/win-utils/math/winmath.js");
require.alias("optimuslime-win-utils/winutils.js", "iesorUI/deps/win-utils/index.js");
require.alias("optimuslime-win-utils/winutils.js", "win-utils/index.js");
require.alias("optimuslime-win-utils/winutils.js", "optimuslime-win-utils/index.js");
require.alias("optimuslime-win-phylogeny/lib/win-phylogeny.js", "iesorUI/deps/win-phylogeny/lib/win-phylogeny.js");
require.alias("optimuslime-win-phylogeny/lib/win-phylogeny.js", "iesorUI/deps/win-phylogeny/index.js");
require.alias("optimuslime-win-phylogeny/lib/win-phylogeny.js", "win-phylogeny/index.js");
require.alias("optimuslime-traverse/index.js", "optimuslime-win-phylogeny/deps/optimuslime-traverse/index.js");
require.alias("optimuslime-traverse/index.js", "optimuslime-win-phylogeny/deps/optimuslime-traverse/index.js");
require.alias("optimuslime-traverse/index.js", "optimuslime-traverse/index.js");
require.alias("optimuslime-win-phylogeny/lib/win-phylogeny.js", "optimuslime-win-phylogeny/index.js");
require.alias("optimuslime-win-backbone/lib/win-backbone.js", "iesorUI/deps/win-backbone/lib/win-backbone.js");
require.alias("optimuslime-win-backbone/lib/win-backbone.js", "iesorUI/deps/win-backbone/index.js");
require.alias("optimuslime-win-backbone/lib/win-backbone.js", "win-backbone/index.js");
require.alias("techjacker-q/q.js", "optimuslime-win-backbone/deps/q/q.js");
require.alias("techjacker-q/q.js", "optimuslime-win-backbone/deps/q/index.js");
require.alias("techjacker-q/q.js", "techjacker-q/index.js");
require.alias("component-emitter/index.js", "optimuslime-win-backbone/deps/emitter/index.js");

require.alias("optimuslime-win-backbone/lib/win-backbone.js", "optimuslime-win-backbone/index.js");
require.alias("canvas-display/canvas-display.js", "iesorUI/deps/canvas-display/canvas-display.js");
require.alias("canvas-display/canvas-display.js", "iesorUI/deps/canvas-display/index.js");
require.alias("canvas-display/canvas-display.js", "canvas-display/index.js");
require.alias("canvas-display/canvas-display.js", "canvas-display/index.js");
require.alias("publishui/modal.js", "iesorUI/deps/publishUI/modal.js");
require.alias("publishui/modal.js", "iesorUI/deps/publishUI/index.js");
require.alias("publishui/modal.js", "publishUI/index.js");
require.alias("component-pillbox/index.js", "publishui/deps/pillbox/index.js");
require.alias("component-bind/index.js", "component-pillbox/deps/bind/index.js");

require.alias("component-trim/index.js", "component-pillbox/deps/trim/index.js");

require.alias("component-events/index.js", "component-pillbox/deps/events/index.js");
require.alias("component-event/index.js", "component-events/deps/event/index.js");

require.alias("component-delegate/index.js", "component-events/deps/delegate/index.js");
require.alias("discore-closest/index.js", "component-delegate/deps/closest/index.js");
require.alias("discore-closest/index.js", "component-delegate/deps/closest/index.js");
require.alias("component-matches-selector/index.js", "discore-closest/deps/matches-selector/index.js");
require.alias("component-query/index.js", "component-matches-selector/deps/query/index.js");

require.alias("discore-closest/index.js", "discore-closest/index.js");
require.alias("component-event/index.js", "component-delegate/deps/event/index.js");

require.alias("component-keyname/index.js", "component-pillbox/deps/keyname/index.js");

require.alias("component-emitter/index.js", "component-pillbox/deps/emitter/index.js");

require.alias("component-each/index.js", "component-pillbox/deps/each/index.js");
require.alias("component-to-function/index.js", "component-each/deps/to-function/index.js");
require.alias("component-props/index.js", "component-to-function/deps/props/index.js");

require.alias("component-type/index.js", "component-each/deps/type/index.js");

require.alias("component-set/index.js", "component-pillbox/deps/set/index.js");

require.alias("stephenmathieson-normalize/index.js", "component-pillbox/deps/normalize/index.js");
require.alias("stephenmathieson-normalize/index.js", "component-pillbox/deps/normalize/index.js");
require.alias("stephenmathieson-normalize/index.js", "stephenmathieson-normalize/index.js");
require.alias("optimuslime-el.js/el.js", "publishui/deps/el.js/el.js");
require.alias("optimuslime-el.js/el.js", "publishui/deps/el.js/index.js");
require.alias("optimuslime-el.js/el.js", "optimuslime-el.js/index.js");
require.alias("component-classes/index.js", "publishui/deps/classes/index.js");
require.alias("component-indexof/index.js", "component-classes/deps/indexof/index.js");

require.alias("component-emitter/index.js", "publishui/deps/emitter/index.js");

require.alias("segmentio-modal/lib/index.js", "publishui/deps/modal/lib/index.js");
require.alias("segmentio-modal/lib/index.js", "publishui/deps/modal/index.js");
require.alias("component-domify/index.js", "segmentio-modal/deps/domify/index.js");

require.alias("component-emitter/index.js", "segmentio-modal/deps/emitter/index.js");

require.alias("segmentio-overlay/lib/index.js", "segmentio-modal/deps/overlay/lib/index.js");
require.alias("segmentio-overlay/lib/index.js", "segmentio-modal/deps/overlay/index.js");
require.alias("component-emitter/index.js", "segmentio-overlay/deps/emitter/index.js");

require.alias("component-domify/index.js", "segmentio-overlay/deps/domify/index.js");

require.alias("segmentio-showable/index.js", "segmentio-overlay/deps/showable/index.js");
require.alias("timoxley-next-tick/index.js", "segmentio-showable/deps/next-tick/index.js");

require.alias("yields-after-transition/index.js", "segmentio-showable/deps/after-transition/index.js");
require.alias("yields-after-transition/index.js", "segmentio-showable/deps/after-transition/index.js");
require.alias("yields-has-transitions/index.js", "yields-after-transition/deps/has-transitions/index.js");
require.alias("yields-has-transitions/index.js", "yields-after-transition/deps/has-transitions/index.js");
require.alias("yields-has-transitions/index.js", "yields-has-transitions/index.js");
require.alias("ecarter-css-emitter/index.js", "yields-after-transition/deps/css-emitter/index.js");
require.alias("component-event/index.js", "ecarter-css-emitter/deps/event/index.js");

require.alias("component-once/index.js", "yields-after-transition/deps/once/index.js");

require.alias("yields-after-transition/index.js", "yields-after-transition/index.js");
require.alias("segmentio-on-escape/index.js", "segmentio-showable/deps/on-escape/index.js");
require.alias("component-event/index.js", "segmentio-on-escape/deps/event/index.js");

require.alias("component-indexof/index.js", "segmentio-on-escape/deps/indexof/index.js");

require.alias("ianstormtaylor-classes/index.js", "segmentio-overlay/deps/classes/index.js");
require.alias("jkroso-classes/index.js", "ianstormtaylor-classes/deps/classes/index.js");
require.alias("jkroso-classes/fallback.js", "ianstormtaylor-classes/deps/classes/fallback.js");
require.alias("jkroso-classes/modern.js", "ianstormtaylor-classes/deps/classes/modern.js");
require.alias("component-indexof/index.js", "jkroso-classes/deps/indexof/index.js");

require.alias("segmentio-overlay/lib/index.js", "segmentio-overlay/index.js");
require.alias("segmentio-showable/index.js", "segmentio-modal/deps/showable/index.js");
require.alias("timoxley-next-tick/index.js", "segmentio-showable/deps/next-tick/index.js");

require.alias("yields-after-transition/index.js", "segmentio-showable/deps/after-transition/index.js");
require.alias("yields-after-transition/index.js", "segmentio-showable/deps/after-transition/index.js");
require.alias("yields-has-transitions/index.js", "yields-after-transition/deps/has-transitions/index.js");
require.alias("yields-has-transitions/index.js", "yields-after-transition/deps/has-transitions/index.js");
require.alias("yields-has-transitions/index.js", "yields-has-transitions/index.js");
require.alias("ecarter-css-emitter/index.js", "yields-after-transition/deps/css-emitter/index.js");
require.alias("component-event/index.js", "ecarter-css-emitter/deps/event/index.js");

require.alias("component-once/index.js", "yields-after-transition/deps/once/index.js");

require.alias("yields-after-transition/index.js", "yields-after-transition/index.js");
require.alias("segmentio-on-escape/index.js", "segmentio-showable/deps/on-escape/index.js");
require.alias("component-event/index.js", "segmentio-on-escape/deps/event/index.js");

require.alias("component-indexof/index.js", "segmentio-on-escape/deps/indexof/index.js");

require.alias("segmentio-on-escape/index.js", "segmentio-modal/deps/on-escape/index.js");
require.alias("component-event/index.js", "segmentio-on-escape/deps/event/index.js");

require.alias("component-indexof/index.js", "segmentio-on-escape/deps/indexof/index.js");

require.alias("ianstormtaylor-classes/index.js", "segmentio-modal/deps/classes/index.js");
require.alias("jkroso-classes/index.js", "ianstormtaylor-classes/deps/classes/index.js");
require.alias("jkroso-classes/fallback.js", "ianstormtaylor-classes/deps/classes/fallback.js");
require.alias("jkroso-classes/modern.js", "ianstormtaylor-classes/deps/classes/modern.js");
require.alias("component-indexof/index.js", "jkroso-classes/deps/indexof/index.js");

require.alias("segmentio-modal/lib/index.js", "segmentio-modal/index.js");
require.alias("publishui/modal.js", "publishui/index.js");
require.alias("win-home-ui/main.js", "iesorUI/deps/win-home-ui/main.js");
require.alias("win-home-ui/main.js", "iesorUI/deps/win-home-ui/index.js");
require.alias("win-home-ui/main.js", "win-home-ui/index.js");
require.alias("optimuslime-el.js/el.js", "win-home-ui/deps/el.js/el.js");
require.alias("optimuslime-el.js/el.js", "win-home-ui/deps/el.js/index.js");
require.alias("optimuslime-el.js/el.js", "optimuslime-el.js/index.js");
require.alias("optimuslime-win-query/lib/win-query.js", "win-home-ui/deps/win-query/lib/win-query.js");
require.alias("optimuslime-win-query/lib/win-query.js", "win-home-ui/deps/win-query/index.js");
require.alias("visionmedia-superagent/lib/client.js", "optimuslime-win-query/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "optimuslime-win-query/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("optimuslime-win-query/lib/win-query.js", "optimuslime-win-query/index.js");
require.alias("component-emitter/index.js", "win-home-ui/deps/emitter/index.js");

require.alias("win-home-ui/main.js", "win-home-ui/index.js");
require.alias("win-setup/win-setup.js", "iesorUI/deps/win-setup/win-setup.js");
require.alias("win-setup/win-setup.js", "iesorUI/deps/win-setup/index.js");
require.alias("win-setup/win-setup.js", "win-setup/index.js");
require.alias("optimuslime-win-backbone/lib/win-backbone.js", "win-setup/deps/win-backbone/lib/win-backbone.js");
require.alias("optimuslime-win-backbone/lib/win-backbone.js", "win-setup/deps/win-backbone/index.js");
require.alias("techjacker-q/q.js", "optimuslime-win-backbone/deps/q/q.js");
require.alias("techjacker-q/q.js", "optimuslime-win-backbone/deps/q/index.js");
require.alias("techjacker-q/q.js", "techjacker-q/index.js");
require.alias("component-emitter/index.js", "optimuslime-win-backbone/deps/emitter/index.js");

require.alias("optimuslime-win-backbone/lib/win-backbone.js", "optimuslime-win-backbone/index.js");
require.alias("techjacker-q/q.js", "win-setup/deps/q/q.js");
require.alias("techjacker-q/q.js", "win-setup/deps/q/index.js");
require.alias("techjacker-q/q.js", "techjacker-q/index.js");
require.alias("win-setup/win-setup.js", "win-setup/index.js");
require.alias("iesorUI/js/iesorUI.js", "iesorUI/index.js");