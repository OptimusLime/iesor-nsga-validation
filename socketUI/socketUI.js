//We pass info to and from the UI using the win backbone
module.exports = socketUI;

function socketUI(backbone, globalConfig, localConfig)
{
	var self = this;

	//boom, let's get right into the business of ui socketing
	self.winFunction = "socketUI";

	//our way to communicate with the backbone
	self.backEmit = backbone.getEmitter(self);

	self.log = backbone.getLogger(self);
	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	if(!localConfig.uiPort || !localConfig.socketServerType)
		throw new Error("Missing socketUI configuration: [uiPort or socketServerType] -- need both");

	self.uiPort = localConfig.uiPort;

	//are we connecting via websocket or regular sockets
	self.socketServerType = localConfig.socketServerType;

	//we don't send more than one object out
	var alreadySent = {};
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

				// self.log("Pinging - ", ws.socketID, " - next call: - ", pingtiming);
				if(!err)
				{
					setTimeout(pingWS, pingtiming);
				}
				// else
					// self.log("Pinging - ", ws.socketID, " - failed: ", err);

			});
		}

		return pingWS;
	}


	//there is some issue with how the UI can request things -- don't know how to handle that quite yet
	self.initialize = function(done)
	{
		//load a websocket or socket server
		if(self.socketServerType == "socket")
		{
			//start a socket server on uiPort
			throw new Error("Not yet implemented!");
		}
		else if(self.socketServerType == "websocket")
		{
			var wsServer = require('ws').Server;

			self.server = new wsServer({port: self.uiPort}, function(err)
			{
				if(err)
				{
					done(err);
					throw new Error("SocketUI server failed to start");
				}
				//otherwise we started our server!
				self.server.on('connection', function(ws) {
					
					//we got a new connection! Let's be kind, and please rewind
					nextSocket(ws);

					//ping every 250ms till the connection dies
					var ping = createPingFunction(125, ws);

					//start pinging
					ping();

					//send it the sockt id info
					ws.send(JSON.stringify({event: "socketID", socketID: ws.socketID}))

					//it's got an id and everything, you deal with -- whoever you are
					self.backEmit("uiControl:uiSocketCreated", ws);

				});

				//okey dokey -- all done
				done();

			});

		}
		else
		{
			throw new Error("UI Socket Server Type options are [socket, websocket], configuration provided: " + self.socketServerType);
		}
	}

	//i dont require much -- just answer the calls of my people
	self.requiredEvents = function()
	{
		return ["uiControl:uiSocketCreated"];
	}

	return self;
};

