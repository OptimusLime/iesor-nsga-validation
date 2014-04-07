//all the UI control we could ever dream of!
module.exports = uiControl;

var iesorSeed = require('../iesorSeed.js');
var traverse = require('optimuslime-traverse');

//we do validation here
function uiControl(backbone, globalConfig, localConfig)
{
	var self = this;

	//boom, let's get right into the business of encoding
	self.winFunction = "uiControl";

	//our way to communicate with the backbone
	self.backEmit = backbone.getEmitter(self);

	self.log = backbone.getLogger(self);
	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	if(!globalConfig.searchParameters)
		throw new Error("Starting evolution requires global config for now");

	var searchParams = globalConfig.searchParameters;
	var maxSeeds = searchParams.maxSeeds || 1;
	var artifactType = globalConfig.artifactType;

	//need to be able to add our schema
	self.requiredEvents = function() {
		return [
			//need to be able to start evolution
			"evolution:nsga-startEvolution",
			"evolution:nsga-pauseEvolution",
			"evolution:nsga-deleteEvolution",
			"evolution:publishArtifact",
			//for now, we need this -- it's a win-backbone hack
			//we need uiControl to have special privileges for calling ANY event
			//that's a later module -- just need this done 
			"uiControl:startUIEvolution",
			"evolution:loadSeeds",
			"query:getSeeds",
			"query:getArtifacts"
		];
	};

	var sockets = {};
	function socketSend(ws, json, cb)
	{
		if(!cb)
			cb = function(error){if(error)self.log("Socket error: ", error.message)};

		ws.send(JSON.stringify(json), cb);
	}

	self.evolutionID = "";

	var artifactsSent = {};

	self.eventCallbacks = function()
    {
        return {
        	"uiControl:startUIEvolution" : self.startRunningEvolution,
        	"uiControl:simulateUI" : self.startUISimulation,
            "uiControl:sendDataWithUniqueArtifacts" : function(){


                var done = arguments[arguments.length-1];
                var allArtifacts = arguments[arguments.length-2];

                //poop on your face -- pull the args
                var topEvals = arguments[0];
                var c2p = arguments[1];

                var newArtifacts = {};

                var objCount = 0;

                for(var wid in topEvals)
                {
                	//grab the evals -- we're sending everything, just maybe some artifacts to go along with them
                	if(!artifactsSent[wid])
                	{
                		//unique sent
                		objCount++;

                		//prepare to send this artifact
                		newArtifacts[wid] = allArtifacts[wid];

                		//we should also note that we've sent it
                		artifactsSent[wid] = true;
                	}
                }

                //wakakakaka
                // self.log("Sending unique, but nothign being done about it");

                //pull the socket we're going to send to
                var socket = sockets[self.evolutionID];

                //objects sockets stuff
                var sObject = {event: "evolutionData", data: {artifacts: newArtifacts, evaluations: topEvals, childrenToParents: c2p}};

                //let's send our objects -- blast it off, we don't care about replies
                socketSend(socket, sObject);

                //nuffin to do yet
                done(undefined, objCount);
            },
            "uiControl:uiSocketCreated" : function(ws)
            {
            	sockets[ws.socketID] = ws;

            	ws.on('close', function()
            	{
            		self.log("Socket closed: ", ws.socketID);

            		if(ws.socketID == self.evolutionID){
            			//disconnect our evolution (if it's happeneing)
            			evoInProgress  = false;
            			//refersh!
            			artifactsSent = {};
            			self.log("Pausing evolution on disconnect: " + ws.socketID);
            			self.backEmit.qCall("evolution:nsga-deleteEvolution");
            		}
            	});
            	ws.on('error', function()
            	{
            		self.log("Scoekt error: ", ws.socketID);
            		if(ws.socketID == self.evolutionID){

            			self.log("Pausing evolution on disconnect: " + ws.socketID);
            			evoInProgress  = false;
            			artifactsSent = {};
            			//disconnect our evolution (if it's happeneing)
            			self.backEmit.qCall("evolution:nsga-deleteEvolution");
            		}
            	});

                ws.on('message', function(message)
                {
                	//messae can be json already -- woot woot
                	self.log("Whaahwhahwa: ", message);
                	try
                	{
                		message = JSON.parse(message);
                	}
                	catch(e)
                	{
                		self.log("UI Sockets doesn't handle string messages, only JSON with event and replyID");
						socketSend(ws, {error: "UI Sockets doesn't handle string messages, only JSON with event", replyID:id});
                		return;
                	}

                	if(typeof message == "string")
                	{
                		self.log("UI Sockets doesn't handle string messages, only JSON with event");

						socketSend(ws, {error: "UI Sockets doesn't handle string messages, only JSON with event", replyID:id});
                		
                		return;
                	}

                	//now lets handle this shit
                	var eventName = message.event;
                	var id = message.replyID;

                	if(!eventName || id == undefined){

                		self.log("UI Sockets doesn't handle string messages, only JSON with event and replyIDs");

						socketSend(ws, {error: "UI Sockets doesn't handle string messages, only JSON with event and replyIDs", replyID:id});

                		return;
					}

					if(!self.backEmit.hasListeners(eventName))
					{
						socketSend(ws, {error: "IESoR doesn't respond to event: " + eventName, replyID:id});
						return;
					}

					var args = message.arguments || [];

					//add in the event name for calling
					[].splice.call(args, 0, 0, eventName);

					// self.log(args);

					self.backEmit.qCall.apply(self.backEmit.qCall, args)
						.then(function(response)
						{
							//success!
							socketSend(ws, {replyID: id, success:true, response: response}, function(err)
							{
								//socket error
								if(err){
									self.log("Unknown socket send error: ", err);
									// throw err;
								}
							});

							//that is all!
						})
						.fail(function(err)
						{
							//this may be a socket fail
							self.log("Error in callback: ", (err.stack ? err.stack : err));
							//wrong number of errors in the callback
							socketSend(ws, {replyID: id, error: err}, function(socketError)
							{
								//socket error
								if(socketError){
									self.log("Unknown socket send error: ", socketError);
									// throw err;
								}
								//otherwise -- do nothing -- just a normal day in the thankless life of a socket
							});
						})

					//we have the listener, we have teh args, let's do this thing

					//now what? Oh YEAH MOFO LETS START SOME SHIT
                    // self.log("Message from socket: ", message);






                });
            }
        };
    }

    var evoInProgress = false;
    self.startRunningEvolution = function(socketID, wids, done)
    {
    	if(arguments.length == 1)
    	{
    		done("Wrong number of evolution starting arguments, need socketID, and callback");
    		return;
    	}

    	var eventQuery;
		var p1, p2;

		var isBranch = false;

		//we were not provided a wid
		if(typeof wids == "function")
		{
			//therefore we need to get some seeds
			done = wids;
			wids = undefined;

			eventQuery = "query:getSeeds";
			p1 = artifactType;
			p2 = maxSeeds;
		}
		else
		{	
			isBranch = true;
			//we know what wid we're looking for
			eventQuery = "query:getArtifacts";
			p1 = artifactType;
			p2 = wids;
		}

		self.backEmit(eventQuery, p1, p2, function(err, res)
		{
			if(err)
			{
				done(err);
				return;
			}

			//back emit -- then when we get the appropriate reply -- we have our seeds
			var seeds = [];
			var seedMap = {};
			for(var key in res){

				var s = res[key];
				traverse(s).forEach(function(node)
				{
					//if we have a key = "_id" get rid of it
					if(this.key == "_id" || this.key == "__v" || this.key == "creation")
						this.remove();
				})
				seedMap[key] = s;
				seeds.push(s);
			}

			self.log("Sseeds", seeds);

			self.backEmit.qCall("evolution:loadSeeds", seedMap)
				.then(function()
				{
					//got our seeds and loaded them into evolution -- ready to go!
					self.internalRunEvolution(socketID, seeds, done);
				})
				.fail(function(err)
				{
					done(err);
				});

		});


    }

    //we started running this thing, let's get our seed object?
    self.internalRunEvolution = function(socketID, seeds, done)
    {

    	var done = arguments[arguments.length-1];

    	if(arguments.length == 1)
    	{
    		done("Wrong number of evolution starting arguments, need socketID and callback");
    		return;
    	}
    	if(evoInProgress)
    	{
    		done("Not allowed to run two evolutionary runs simultaneously.");
    		return;
    	}

    	//evo identifier!
    	self.evolutionID = socketID;

    	//we're in progress - oh yes oh yes
    	evoInProgress = true;

    	//seeded from the server now!
        var popSize = searchParams.populationSize || 35;

        var evoProps = {genomeType : artifactType, populationSize : popSize};

        //throw errors while running evolution
        var evoError = function(err)
        {
        	self.log("Evo error");

            if(typeof err == "string")
                done(new Error(err));
            else
                done(err);
        };

        //now we call asking for 
        self.backEmit.qCall("evolution:nsga-startEvolution", evoProps, seeds, evoError)
	        .then(function(artifacts)
	        {
	            //evolution started!
	            self.log('\tFinished starting evolution.'.cyan);//, util.inspect(artifacts, false,10));
	            // done();   
	        })
	        .fail(function(err)
	        {
	        	//all done here -- we aren't in progress -these errors "probably" came from deleting evolution --
	        	//hack hack hack hack hack
	        	if(!evoInProgress){
	        		done();
	        		return;
	        	}

	            if(err.errors)
	            {
	                self.log('All errors: '.cyan, util.inspect(err.errors, false,10));
	            }
	            
	            if(err.stack)
	                self.log("Error stack: ".red, err.stack);

	            if(err.errno)
	                done(err);
	            else if(typeof err == "string")
	            	done(new Error(err))
	            else
	                done(new Error(err.message));
	        });
    };


    self.startUISimulation = function()
    {
    	//we must create a world, then simulate from that world
    	//perhaps it's best to contact someone else for this


    }


	return self;
};

