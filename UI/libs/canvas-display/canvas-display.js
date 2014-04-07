
//export a helpful canvas frame display -- super clearer than before
module.exports = canvassetup;

//here we are ready to setup
function canvassetup(svg, canvasID, framesToDisplay, canvasInfo, startFrame)
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
	var currentFrame = startFrame - 1 || -1;

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

	//do we want to pause/end animation?
	var shouldEndAnimation = false;

	//okay, just do it already
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

		var width = svg.getAttribute("width");
		svg.setAttribute("width", parseFloat(width) + .0000000001);

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


        //ids are consistent across frames so only create objects once
		for(var id in insertObjects) {

			var fabObj, props;
			var canvasObj = insertObjects[id];
			var polyPoints, tl, bodyOffset, color, wh;
			var radius, center;
			var props;

			fabObj = _iFabObjects[id];

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

			if(id != "ground"){
				xCOM += props.left;
				x_count++;
			}
                //already existed -- update
            if(exists)
            	updateObject(fabObj, props);
            else
            {
        	  	_iFabObjects[id] = fabObj;
                canvas.add(fabObj);
            }
        }	

        //how much zooming do we zoom zoom now?
        var zoomX = zoomY = zoomIn;

        //set phasers to zoom moderately!
        //move center of mass if necessary
		setZoom(zoomX, zoomY, x_count ? xCOM/x_count : undefined);

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

			// preserve the original dimensions.
			object.original_scaleX = (object.original_scaleX == undefined) ? scaleX : object.original_scaleX;
			object.original_scaleY = (object.original_scaleY == undefined) ? scaleY : object.original_scaleY;
			object.original_left = (object.original_left == undefined) ? left : object.original_left;
			object.original_top = (object.original_top == undefined) ? top : object.original_top;

			object.scaleX = object.original_scaleX * zoomX;
			object.scaleY = object.original_scaleY * zoomY;
			object.left = (object.original_left - cwD2) * zoomX + cwD2;
			object.top = (object.original_top - chD2)* zoomY + chD2;

			if(key != "ground" && xCOM)
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
