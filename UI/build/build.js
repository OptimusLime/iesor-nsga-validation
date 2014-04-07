
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
require.register("iesorUI/js/iesorUI.js", function(exports, require, module){
var cd = require('canvas-display');


});



































require.register("segmentio-overlay/lib/index.html", function(exports, require, module){
module.exports = '<div class="Overlay hidden"></div>';
});






require.register("segmentio-modal/lib/index.html", function(exports, require, module){
module.exports = '<div class="Modal hidden" effect="toggle"></div>';
});
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
require.alias("iesorUI/js/iesorUI.js", "iesorUI/index.js");