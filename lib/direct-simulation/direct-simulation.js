//run a websocket server for direct simulations

var wsServer, allWorlds;

var reserveIx = 0;
var reservePool = {};
var currentlyReserved = {};

var socketToWorld = {};
var iesorReserveSize;

//we don't send more than one object out
var sockets = {};
var _socketIDs = 0;

var socketHandler = [];

function nextSocket(ws)
{
	var sid = _socketIDs++;
	ws.socketID = sid;
	sockets[sid] = ws;
}
//just keep pinging
var createPingFunction = function(pingtiming, ws)
{
	var pingWS = function()
	{
		ws.send({event: "ping"}, function(err){
			if(!err)
			{
				setTimeout(pingWS, pingtiming);
			}
		});
	}

	return pingWS;
}

//get a resreve world
function getReserveByID(rID)
{
	return reservePool[rID];
}

//in theory we shouldn't allow more than we have
function reserveWorld(socketID)
{
	if(reserveIx == iesorReserveSize)
		throw new Error("Over the reserve pool limit -- update config param: iesorReserveSize for more reserved simulations");

	reserveIx++;

	var rWorld;
	for(var i in reservePool)
	{
		if(!currentlyReserved[i])
		{
			rWorld = reservePool[i];
			break;
		}
	}

	//if no world -- we f'ed up 
	if(!rWorld)
		throw new Error("Reserve pool world empty, no reserve simulation worlds left. Did you clear?");

	currentlyReserved[rWorld.rID] = true;
	socketToWorld[socketID] = rWorld.rID;

	//flash the iesor object
	rWorld.clearWorld();

	return rWorld;
}

function releaseWorld(worldID)
{
	if(currentlyReserved[worldID])
	{
		reserveIx--;
		delete currentlyReserved[worldID];
	}
}

var wss = require('ws').Server;
var iesorcpp = require('iesor-cpp');
var iesorReserveSize = 5;

var simulationServer = 9001;

var wsServer = new wss({port: simulationServer}, function(err)
{
	if(err)
	{
		backLog("Failed websocket server load.");
		throw new Error("Sim socket fail!")
	}

	//get our worlds
	allWorlds = iesorcpp.getIESoRWorlds(iesorReserveSize);

	//loop through, build our pool map
	for(var i=0; i < allWorlds.length; i++){
		reservePool[i] = allWorlds[i];
		//make sure to set an id
		reservePool[i].rID = i;
	}

	//started yo
	console.log("Sim socket server started");

    wsServer.on('connection', function (ws) {

    	//we got a new connection! Let's be kind, and please rewind
		nextSocket(ws);

		//ping every 250ms till the connection dies
		var ping = createPingFunction(500, ws);

		//start pinging
		ping();

		//send it the sockt id info
		ws.send(JSON.stringify({event: "socketID", socketID: ws.socketID}))


		//now we have a socketID -- let's wait and watch
		ws.on('close', function()
    	{
    		console.log("Socket closed: ", ws.socketID);
    		socketSimEnded(ws.socketID);
    		
    	});

    	ws.on('error', function()
    	{
    		console.log("Scoekt error: ", ws.socketID);
    		socketSimEnded(ws.socketID);
    		
    	});

        ws.on('message', function(message)
        {
        	try
        	{
        		message = JSON.parse(message);
        		console.log(message);

        		switch(message.event)
        		{
        			case "startSimulation":
        				startSimulation(ws.socketID, message.artifact, function(err, data)
        					{
        						data.replyID = message.replyID;
        						//send it back
        						ws.send(JSON.stringify(data), function(err)
        						{
        							if(err)
        								console.log("Socket start sim error: ", err);
        						});

        					});
        				break;
    				case "simulate":

    					simulateWorld(ws.socketID, message.simTimeMS, function(err, data)
    					{
    						data.event = "simulate";
    						data.replyID = message.replyID;

    						//send it back
    						ws.send(JSON.stringify(data), function(err)
    						{
    							if(err)
    								console.log("Socket sim error: ", err);
    						});
    					})
    					break;
					case "endSimulation":

						//no more need for the world
			    		socketSimEnded(ws.socketID);

    					break;
        		}

        	}
        	catch(e)
        	{
        		console.log("Caught socket err: ", e.message);
        		console.log("stack: ", e.stack);
        		// console.log("UI Sockets doesn't handle string messages, only JSON with event and replyID");
        	}
        });
    });
});

function socketSimEnded(socketID)
{
	//no more need for the world
	releaseWorld(socketToWorld[socketID]);
	delete socketToWorld[socketID];
}

function startSimulation(socketID, artifact, finished)
{
	//release our current world if we start a new simulation
	if(socketToWorld[socketID])
		socketSimEnded(socketID);

	//we create a world from our reserved object
	var iWorld = reserveWorld(socketID);

	var rID = iWorld.rID;

	//this is the true object -- we need to convert into the world 
	var genome = artifact.genome;

	//now we're ready
	var byteNetwork = iesorcpp.neatGenomeToByteCode(genome);

	//for now, we transfer knowledge via string to the C++ code 
	//some performance penalty for this -- probably not as bad as simulating the whole thing in javascript
	var byteString = JSON.stringify(byteNetwork);

	//string with our morph info inside
	var morphString = iWorld.loadBodyFromNetwork(byteString);

	//get the initial frmae of animation
	var frame = iWorld.getWorldDrawList();

	//send it back
	finished(undefined, {morphology: morphString, frame: frame, worldID: rID});

}

function simulateWorld(socketID, simTimeMS, finished){
	//get world id
	var rID = socketToWorld[socketID];

	//send it back
	var world = getReserveByID(rID);

	//simulate world in MS
	world.simulateWorldMS(simTimeMS);

	//get a frame of animation
	var frame = world.getWorldDrawList();

	finished(undefined, {frame: frame, worldID: rID});
}	


