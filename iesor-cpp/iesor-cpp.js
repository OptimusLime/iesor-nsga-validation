//here we test the insert functions
//making sure the database is filled with objects of the schema type

var iesor = require('node-iesor');
var winneat = require('win-neat');
var cppnjs = require('cppnjs');
	
//this adds some new additions
var cppnAdditions = require('./cppnAdditions.js');

module.exports = iesorcpp;

//we do validation here
function iesorcpp(backbone, globalConfig, localConfig)
{
	var self = this;

	//boom, let's get right into the business of encoding
	self.winFunction = "iesor";

	//our way to communicate with the backbone
	self.backEmit = backbone.getEmitter(self);

	self.log = backbone.getLogger(self);
	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	self.iesorPoolSize = localConfig.iesorPoolSize || 10;

	self.initialize = function(finished)
	{
		//let's build a small pool of iesor objects
		for(var i=0; i < self.iesorPoolSize; i++)
			iesorPool.push(new iesor.iesorWorld());

		//not so bad? 
		finished();
	}

	var nextObject = 0;
	var iesorPool = [];

	function getNextWorld()
	{
		nextObject++;
		nextObject = nextObject % iesorPool.length;
		var ip = iesorPool[nextObject];

		//flash the iesor object
		ip.clearWorld();

		return ip;
	}
	function defaultBehavior()
	{
		//we have 5 objects from original
		//widht/height, startx, starty, mass
		return [0,0,0,0,0].slice(0);
	}

	function setMorphologyBehavior(morphJSON, eval)
	{
		var behaviors = eval.behaviors;

		//width/height are the max distances between top and bottom
		behaviors[0] = parseFloat(morphJSON.width);
		behaviors[1] = parseFloat(morphJSON.height);

		//mass is the sum of the nodes + sum of the lenght of the connections
		behaviors[2] = parseFloat(morphJSON.mass);

		//included -- not sure how much it helps
		behaviors[3] = parseFloat(morphJSON.startX);
		behaviors[4] = parseFloat(morphJSON.startY);
	}

	self.neatGenomeToByteCode = function(ngJSON)
	{
		//grab the json object
	    var ng = ngJSON;

	    //if we aren't the actual genome object (with functions like compat, or mutate) -- then we need to be one
		if(ng.compat == undefined)
		{
			//temporary fix for now -- in the future -- all objects coming out of gen offspring will be properly converted
			ng = winneat.genotypeFromJSON(ng);
		}

		//decode that mofo -- make sure cppnjs is present
	    var cppn = ng.networkDecode();
	    // self.log("CPPN: ", cppn.constructor.prototype);

	    //special code for getting "byte" code -- no funny recursive stuff 
	    var byteCPPN = cppn.cppnToByteCode.call(cppn);

	    var weights = [];
	    for(var i=0; i < cppn.connections.length; i++)
	    {
	        weights.push(cppn.connections[i].weight);
	    }

	    return {
	        biasCount: cppn.biasNeuronCount,
	        inputCount: cppn.inputNeuronCount,
	        outputCount: cppn.outputNeuronCount,
	        nodeCount: cppn.totalNeuronCount,
	        connectionCount: cppn.connections.length,
	        weights: weights,
	        nodeOrder: byteCPPN.nodeOrder,
	        nodeArrays: byteCPPN.nodeArrays};
	};

	self.eventCallbacks = function()
	{ 
		return {
		//now we actually have to do this -- send our evals to node-iesor for evaluation inside a world
			"iesor:simulateArtifacts" : function(indexArtifacts, options, finished){

				//options aren't necessary, but they are certainly nice
				if(typeof options == "function")
				{
					finished = options;
					options = {};
				}
				else  //default
					options = options || {};

				//3.5 second simulation
				var simTimeMS = options.simulationTimeMS || 3500;

				var efficiency = !(options.searchRawDistance || false);

				//evals we will return by indexed artifacts
				var evals = {};

				//we load the body into the world after already constructing this -- keep in mind, this is double hyperneat-ing
				self.log("Warning, iesor-cpp now constructs the body, checks it, then constructs and loads the body into the world again!");

				try
				{
					//let's do an eval -- write now this is synchronous
					for(var index in indexArtifacts)
					{
						var tArtifact = indexArtifacts[index];

						//this is the true object -- we need to convert into the world 
						var genome = tArtifact.genome;

						//default eval
						var baseEval = {realFitness: 0.0000001, behaviors : defaultBehavior(), complexity: genome.connections.length + genome.nodes.length};

						//evaluation for the index
						evals[index] = baseEval;

						//now we're ready
						var byteNetwork = self.neatGenomeToByteCode(genome);

						//for now, we transfer knowledge via string to the C++ code 
						//some performance penalty for this -- probably not as bad as simulating the whole thing in javascript
						var byteString = JSON.stringify(byteNetwork);

						//now what yo?
						var iWorld = getNextWorld(); // this will clean everything up for us!

						//now we load the body first
						var bodyJSON = iWorld.convertNetworkToBody(byteString);

						//if we don't get anything back -- errors all over the place
						bodyJSON = JSON.parse(bodyJSON);

						//now we check if the body even exists -- if it doesn't don't bother simulation
						if(!bodyJSON.nodes.length)
						{
							//this eval was a bust -- it's empty
							self.log("Empty body: ", tArtifact.wid, " bjson: ", bodyJSON);
							continue;
						}

						//string with our morph info inside
						var morphString = iWorld.loadBodyFromNetwork(byteString);

						//get our morphology info						
						var morphology = JSON.parse(morphString);

						//we can optionally include mass as part of our fitness metric
						//distance/mass == efficiency of muscles
						var mass = parseFloat(morphology.mass);

						//set morphology behavior
						setMorphologyBehavior(morphology, baseEval);

						// self.log("Generated morphology: ", morphology);

						var com = {x: parseFloat(morphology.comX), y: parseFloat(morphology.comY)};

						//now we need to pull out distance traveled for the object

						//simulate for 3.5 seconds by default
						//tell the wrold to simulate
						var simInfo = iWorld.simulateWorldMS(simTimeMS);

						// self.log('Sim info: ', JSON.parse(simInfo));

						//now we reach into the world and get some other info
						var postCom = iWorld.bodyCenterOfMass();

						//now grab the com after the simulation
						postCom = JSON.parse(postCom);


						//calculate distance
						var totalDist = Math.abs(postCom.x - com.x);

						// self.log("Xeffic: ", totalDist/mass ," -- Pre com: ", com, " post com: ", postCom);

						//then finally set distance/mass -- for efficiency
						baseEval.realFitness = efficiency ? totalDist/mass : totalDist;
						baseEval.fitness = efficiency ? totalDist/mass : totalDist; 

					}

					finished(undefined, evals);

				}
				catch(e)
				{
					//ooops -- error, we caught it don't worry
					//send it back -- we pooped up
					finished(e);
				}				

					//nothing more for eval -- not too bad
			}
		};
	};
	//i dont require anything -- just answer this call
	return self;
};

