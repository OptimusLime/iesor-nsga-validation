//here we test the insert functions
//making sure the database is filled with objects of the schema type
var wMath = require('win-utils').math;

var Q = require('q');

module.exports = iesorevaluation;

//we do validation here
function iesorevaluation(backbone, globalConfig, localConfig)
{
	var self = this;

	//boom, let's get right into the business of encoding
	self.winFunction = "evaluate";

	//our way to communicate with the backbone
	self.backEmit = backbone.getEmitter(self);

	self.log = backbone.getLogger(self);
	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	//if not provided -- which it should!
	if(!globalConfig.searchParameters)
		throw new Error("NSGA requires a global configuration: searchParameters to be set");

	//grab the search param object
	var searchParams = globalConfig.searchParameters;

	//lets make it explicit what we pull from the configuration
	//grab from global -- not allowed to be 0
	self.nsgaObjectiveLength = searchParams.nsgaObjectiveLength || 3;

	//use genomic novelty
	self.nsgaGlobalGenomeDiversity = searchParams.nsgaGlobalGenomeDiversity || false;

	//how many neighbors to sum up for genome dist? defaults to 10
	self.genomeNeighborCount = searchParams.genomeNeighborCount || 10;

	//we don't do this by default
	// self.clearEvaluationsAutomatically = localConfig.clearEvaluationsAutomatically || false;


	var debugGlobalCount = 1;

	self.allEvaluations = {};

	//now we actually have to do this -- send our evals to node-iesor for evaluation inside a world
	self.evaluateObjects = function(arts)
	{
		var defer = Q.defer();

		setTimeout(function()
		{
			//map index to evals
			var evals = {};

			for(var index in arts)
			{
				evals[index] = {realFitness: debugGlobalCount++, behaviors : [Math.random()], complexity: 0};
			}

			defer.resolve(evals);
		}, 0);

		return defer.promise;
	}

	self.eventCallbacks = function()
	{ 
		return {
			"evaluate:evaluateArtifacts" : function(population, finished){

				self.log("Evaluating pop, size: ", population.length);

				//we could clear evaluations automatically when we evaluate?
				// if(self.clearEvaluationsAutomatically)
					// self.evaluations = {};

				// throw new Error("evaluateArtifacts: Not implemented");
				var done = arguments[arguments.length-1];
				
				//we will create popevaluations
				var evals = [];

				//maybe we cached, maybe we didn't -- these are the ones that were not cached locally
				var pending = {};

				//we do stuff with the population, or with the objects 
				//this is where we would use novelty or genomic novelty or whatever
				for(var i=0; i < population.length; i++)
				{
					var iPop = population[i];

					if(!self.allEvaluations[iPop.wid])
					{
						//need to do evals
						pending[i] = (iPop);
					}
					else
					{
						evals[i] = self.allEvaluations[iPop.wid];
					// evals.push({realFitness: i, behaviors : [], complexity: 0});//[Math.random(), Math.random(), Math.random()]});
					}
				}

				//now we need to send out these pending
				//this is a flow control call
				self.evaluateObjects(pending)
					.then(function(pendinEvals)
					{
						//once we get everything back it's easy

						//match the index with the evals						
						for(var index in pendinEvals)
						{
							//grab pop object
							var iPop = population[index];
							
							//then grab the eval
							var ev = pendinEvals[index];

							//save that bugger
							evals[index] = ev;

							//save this for our evals --- caching
							self.allEvaluations[iPop.wid] = ev;
						}

						self.log("Eval pending done.");//, evals);

						//got the evals!
						done(undefined, {evaluations: evals});	
					})
					.fail(function(err)
					{
						self.log("Fail Eval pop; ", err, " --poop: ", population);

						//all done with our error!
						done(err);
					});

					//nothing more for eval -- not too bad
			}
			,"evaluate:measureObjectives" : function(population, popEvaluations, finished)
			{
				//check stuff
				var popObjects = {};

				//objectives addressable by wid
				var objectives = {};

				//everything going back -- ordered by population
				var finalObjectiveList = [];

				//going through population
				for(var i=0; i < population.length; i++)
				{
					var iPop = population[i];

					//grab the inner genome -- this name may change according to the iesor schema
					popObjects[iPop.wid] = iPop.genome;

					//we don't have a set length for our object since we can just index in, 
					//and it will create it dynamically
					var oPopList = [];

					//zero out the initial objectives
					for(var c=0; c < self.nsgaObjectiveLength; c++)
						oPopList.push(0);

					//save in our final object
					finalObjectiveList.push(oPopList);

					//but we need to be able to address the array individually
					objectives[iPop.wid] = oPopList;
				}

				//multiple emit calls must be made -- we wait on all of them to complete measuring objectives
				var measureCalls = [
					["encoding:NEATGenotype-measureGenomeDistances", popObjects, self.genomeNeighborCount],
					//pop evals have everything novelty needs -- i.e. the behaviors
					["novelty:measureNovelty", popEvaluations]
				];

				//just convenience for if we need to make other calls later in the future
				var gDistIx = 0, mNovIx = 1;

				//here we go, multiple hard calls -- allcomplete at the same time
				self.backEmit.qConcurrent(measureCalls)
					.then(function(allResults)
					{

						// self.log("Novel and genom dist ended: ", allResults[0].genomeDistances)

						var gdObject = allResults[gDistIx];
						var novMeasure = allResults[mNovIx].novelty;

						//now we have all our measurements, hoo ray
						var widToDistances = gdObject.genomeDistances;

						//we have both genomic distance and measured novelty -- both can be indexed by wid
						for(var wid in widToDistances)
						{
							//check our stuff stuff
							var eval = popEvaluations[wid];

							var genomeDist = widToDistances[wid].distance;

							//store our distance inside the eval for historical purposes
							eval.genomeDistance = genomeDist;

							//we have all our info for the population
							var gObjectives = objectives[wid];

							//get the measured novelty info
							var nMeasured = novMeasure[wid];
							var nCount = nMeasured.neighborCount;

							//our first objective is about local competition
							var beatLocal = 0.0;

							var localGenomeDiversity = 0.0;

							//luckily, novelty measures our nearest neighbors and send us back their wid (as well as our distance to them)
							var nearest = nMeasured.nearestNeighbors;
						 	for(var nWID in nearest)
						 	{
						 		//genome distance
						 		var neighborGenomeDistance;
					 			//this is one of our neighbors
						 		var neighborEval = popEvaluations[nWID];

						 		//neighbors may be achive point, therefore, we check the historical container for evaluations
						 		if(!neighborEval)
						 		{
						 			//our neighbor must be an archive point, we look up the historic eval of distance
						 			neighborEval = self.allEvaluations[nWID];
						 			neighborGenomeDistance = neighborEval.genomeDistance;
						 		}
						 		else //if our neighbor is in the current population, just get the distacnce from the eval 
						 			neighborGenomeDistance = widToDistances[nWID].distance;


						 		//let's get their evals and compare
						 		if(eval.realFitness > neighborEval.realFitness)
						 			beatLocal += 1.0;

						 		//if your genome novelty is greater, you are better locally
						 		if(genomeDist > neighborGenomeDistance)
						 			localGenomeDiversity += 1.0;

						 		//we schooled you, possibly
						 	}
						 	
						 	// self.log("neighbor diversity: ".yellow, neighborGenomeDistance);


						 	if(nCount == 0)
						 		throw new Error("Cannot have 0 nearest neighbors, novelty fail: " + JSON.stringify(popEvaluations));

						 	//that's enough to get our local competition score
						 	gObjectives[0] = beatLocal/nCount;

						 	//now what for the cookie center?
						 	//nuffin in iesor!

							//novelty is second to last
						 	gObjectives[gObjectives.length-2] = nMeasured.novelty;

							//genome distance is the last objective
						 	gObjectives[gObjectives.length-1] = self.nsgaGlobalGenomeDiversity ? genomeDist : localGenomeDiversity/nCount; //local genome diversity? or not;
						 	//if local, your score is how many individuals in the neighborhood you beat (as a percentage)
						}

						// var pClone = population.slice(0);
						//  pClone.sort(function(a,b)
			   //          {
			   //              return popEvaluations[b.wid].realFitness - popEvaluations[a.wid].realFitness;
			   //          });

			            // backLog("Sorted pop: ", pop);

						// for(var i=0; i < pClone.length; i++)
						// {
						// 	var singleEval = popEvaluations[pClone[i].wid];
						// 	// self.log("Measure start: ", population, " pop evals: ", popEvaluations);
			   //              self.log("St pop - ".magenta, pClone[i].wid, " ev: ", singleEval);
						// } 




						finished(undefined, finalObjectiveList);

					})
					.fail(function(err)
					{
						//oops we failed!
						finished(err);
					});

			}
		};
	};

	//need to be able to add our schema
	self.requiredEvents = function() {
		return [
			"encoding:NEATGenotype-measureGenomeDistances",
			"novelty:measureNovelty"
		];
	};

	return self;
};

