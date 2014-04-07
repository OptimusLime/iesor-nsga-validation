//here we test the insert functions
//making sure the database is filled with objects of the schema type


var Q = require('q');
var iesor = require('node-iesor');
var winneat = require('win-neat');
var cppnjs = require('cppnjs');
	
//this adds some new additions
var cppnAdditions = require('./cppnAdditions.js');

module.exports = iesorcpp;

function getIESoRWorlds(reserved)
{
	var rWorlds = [];
	//let's build a small pool of iesor objects
	for(var i=0; i < reserved; i++)
		rWorlds.push(new iesor.iesorWorld());

	return rWorlds;
}

function neatGenomeToByteCode(ngJSON)
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

	//make sure to have enough world for async simulation
	self.iesorPoolSize = Math.max(self.iesorPoolSize, 2*globalConfig.searchParameters.populationSize || 10);
	// self.iesorReserveSize = localConfig.iesorReserveSize || 4;


	var nextObject = 0;
	var iesorPool = [];


	self.initialize = function(finished)
	{
		

	 	iesorPool =	getIESoRWorlds(self.iesorPoolSize);


		// for(var i=0; i < self.iesorReserveSize; i++)
		// { 
		// 	reservePool[i] = new iesor.iesorWorld();
		// 	reservePool[i].rID = i;
		// }

		//not so bad? 
		finished();
	}
	
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

		//normalize the morph behavior -- don't need super large numbers for now reason
		var maxWidthD2 = parseFloat(morphJSON.maxWidth)/2.0;
		var maxHeigthD2 = parseFloat(morphJSON.maxHeight)/2.0;

		//just a reasonable guess at max mass
		var massAdjust = 300.0;

		//width/height are the max distances between top and bottom
		behaviors[0] = parseFloat(morphJSON.width)/maxWidthD2;
		behaviors[1] = parseFloat(morphJSON.height)/maxHeigthD2;

		//mass is the sum of the nodes + sum of the lenght of the connections
		behaviors[2] = parseFloat(morphJSON.mass)/massAdjust;

		//included -- not sure how much it helps
		behaviors[3] = parseFloat(morphJSON.startX)/maxWidthD2;;
		behaviors[4] = parseFloat(morphJSON.startY)/maxHeigthD2;

		// self.log("\n\n Adjusted morph width: ", behaviors[0], " adjusted height: ", behaviors[1]);
		// self.log("Adjusted mass: ", behaviors[2]);
		// self.log("Adjusted morph startX: ", behaviors[3], " adjusted startY: ", behaviors[4]);

	}

	self.promiseSimulation = function(tArtifact, baseEval, iWorld, options)
	{
		var defer = Q.defer();

		//3.5 second simulation
		var simTimeMS = options.simulationTimeMS || 3500;
		var efficiency = !(options.searchRawDistance || false);

		//how many frames of animation to preview
		var frameCount = options.framesToSave || 7;

		//fill in with eveyrthing else -- process.nexttick is too powerful
		setTimeout(function()
		// process.nextTick(function()
		{
			//this is the true object -- we need to convert into the world 
			var genome = tArtifact.genome;

			//now we're ready
			var byteNetwork = neatGenomeToByteCode(genome);

			//for now, we transfer knowledge via string to the C++ code 
			//some performance penalty for this -- probably not as bad as simulating the whole thing in javascript
			var byteString = JSON.stringify(byteNetwork);

			//now we load the body first
			var bodyString = iWorld.convertNetworkToBody(byteString);

			//if we don't get anything back -- errors all over the place
			bodyJSON = JSON.parse(bodyString);

			//now we check if the body even exists -- if it doesn't don't bother simulation
			if(!bodyJSON.nodes.length)
			{
				//this eval was a bust -- it's empty
				// emptyBodyCount++;

				//all done!
				defer.resolve(true);
				return;
			}

			//pass the body into the eval for future use -- this gun by fun
			// baseEval.iesorBody = bodyString;
			baseEval.iesorFrames = [];


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

			//grab initial drawing
			//pull the drawing info -- just a single frame worth
			baseEval.iesorFrames.push(iWorld.getWorldDrawList());

			//now the remainder of the frames are captured after the initial
			if(frameCount -1 > 0)
			{
				var simtime = simTimeMS/(frameCount-1);
				for(var f=0; f < frameCount-1; f++)
				{
					//simulate for the simtime/frame count
					iWorld.simulateWorldMS(simtime);

					//pull the drawing info -- just a single frame worth -- as many frames as requested -- in string form
					baseEval.iesorFrames.push(iWorld.getWorldDrawList());
				}
			}
		
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
			baseEval.iesorDistance = totalDist;


			//all done
			defer.resolve(false);

		// });
		},Math.floor(Math.random()*150));


		return defer.promise;
	}

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
				var framesToSave = options.framesToSave || 7;

				//evals we will return by indexed artifacts
				var evals = {};

				//we load the body into the world after already constructing this -- keep in mind, this is double hyperneat-ing
				self.log("Warning, iesor-cpp now constructs the body, checks it, then constructs and loads the body into the world again!");

				var emptyBodyCount = 0;
				var allCount = 0;

				try
				{

					var allPromises = [];

					//let's do an eval -- write now this is synchronous
					for(var index in indexArtifacts)
					{
						//clone options for the single simulation objects
						var optionsClone = JSON.parse(JSON.stringify(options));

						//inc our count
						allCount++;

						var tArtifact = indexArtifacts[index];

						//default eval
						var baseEval = {
							realFitness: 0.0000001, 
							behaviors : defaultBehavior(), 
							complexity: tArtifact.genome.connections.length + tArtifact.genome.nodes.length, 
							iesorDistance: 0};

						//evaluation for the index
						evals[index] = baseEval;

						//now what yo?
						var iWorld = getNextWorld(); // this will clean everything up for us!

						allPromises.push(self.promiseSimulation(tArtifact, baseEval, iWorld, optionsClone));
					}
					
					// self.log("Empty bodies ", emptyBodyCount, " out of ", allCount, "-- %: ", emptyBodyCount/allCount);

					Q.all(allPromises)
						.then(function(promises)
						{
							var emptyBodyCount = 0;

							//wa wa weee waaa we got some promises -- that tell us if we were empty or not
							for(var i=0; i < promises.length; i++)
							{
								if(promises[i])
									emptyBodyCount++;

							}

							//how many were empty?
							self.log("Empty bodies ", emptyBodyCount, " out of ", allCount, "-- %: ", emptyBodyCount/allCount);

							//all setup -- finished!
							finished(undefined, evals);
						})
						.fail(function(err)
						{
							//somethign failed -- let it be known
							finished(err);
						})
					// finished(undefined, evals);

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
//be able to call externally
iesorcpp.getIESoRWorlds = getIESoRWorlds;
iesorcpp.neatGenomeToByteCode = neatGenomeToByteCode;


