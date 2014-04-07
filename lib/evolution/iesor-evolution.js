//all the UI control we could ever dream of!
module.exports = iesorEvolution;

var sylvester = require('sylvester');
var uuid = require('win-utils').cuid;

//we do validation here
function iesorEvolution(backbone, globalConfig, localConfig)
{
	var self = this;

	//boom, let's get right into the business of encoding
	self.winFunction = "evolution";

	//our way to communicate with the backbone
	self.backEmit = backbone.getEmitter(self);

	self.log = backbone.getLogger(self);
	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	//if not provided -- which it should!
	if(!globalConfig.searchParameters)
		throw new Error("NSGA requires a global configuration: searchParameters to be set");

	//this is the top of what we're willing to run
	self.maxGenomesInUI = globalConfig.searchParameters.maxGenomesInUI || 50;
	self.maxAllowedGenerations = globalConfig.searchParameters.maxAllowedGenerations || 1000;
	self.bestPercentage = globalConfig.searchParameters.bestPercentage || .25;

	self.artifactType = globalConfig.artifactType || "iesor";

	//cache this stuff for now
	var evalsInMemory = {};
	var allArtifacts = {};
	var childrenToParents = {};
	
	var seeds = {};
	var seedParents = {};
	var totalGenomesSent = 0;
	var evolutionSessionID = uuid();

	//all the req events for you!
	self.requiredEvents = function()
	{
		return [
		"uiControl:sendDataWithUniqueArtifacts",
		"schema:getReferencesAndParents",
		"schema:replaceParentReferences",
		"publish:publishArtifacts"
		];
	}

	self.eventCallbacks = function()
    {
        return {
        	"evolution:publishArtifact" : self.publishArtifact,
        	"evolution:loadSeeds" : self.loadSeeds,
        	//sent out when evolution is deleted
        	"evolution:clearEvolution" : function()
        	{
        		//all gone!
        		evalsInMemory = {};
        		allArtifacts = {};
        		childrenToParents = {};
        		totalGenomesSent = 0;

        		//brand new sessionID
				evolutionSessionID = uuid();

        		//get rid of everything but the seeds themselves -- no need to clear seeds on reset
        		var spList = Object.keys(seedParents);
        		for(var i=0; i < spList.length; i++)
        		{
        			var wid = spList[i];
        			if(!seeds[wid])
        				delete seedParents[wid];
        		}

        		//do we clear seeds on reset???
        		//byeeeeee
        	},
           "evolution:shouldEndEvolution" : function(gens, activePop, activeEval)
			{
				self.log("Gen Count: " + gens);
                var done = arguments[arguments.length-1];

                //store in memory for now
                var widPop = {};
                var widCount = 0;

                for(var i=0; i < activePop.length; i++)
                {
                    var ap = activePop[i];

                    var wid = ap.wid;
                    widPop[wid] = ap;

                    var eval = activeEval[wid];

                    if(!evalsInMemory[wid])
                    {
                        allArtifacts[wid] = ap;
                        evalsInMemory[wid] = {wid: wid, evaluation: eval};

                        //track the parents -- for future use! Or for ui chain display
                        childrenToParents[wid] = ap.parents;
                        widPop[wid] = ap;
                        widCount++;
                    }

                }

                self.handleSeedTracking(widCount, widPop, function(err)
                {
                	if(err)
                	{
                		done(err);
                		return;
                	}
                	//all done tracking, let's deal with the best

                	//lets get the best of the best -- top 25%
	                var top = filterTop(evalsInMemory, self.bestPercentage);


	                if(!top.length){
	                    
	                    //don't end on my account -- nothing to send though
	                   if(gens < self.maxAllowedGenerations)
	                        done(undefined, false);
	                    else
	                        done(undefined, true);

	                    return;
	                }

	                var topEvals = {};
	                for(var i=0; i < top.length; i++)
	                {
	                    var wid  = top[i].wid;
	                    topEvals[wid] = evalsInMemory[wid].evaluation;
	                }

	                //let our socket know about the new information
	                self.backEmit.qCall("uiControl:sendDataWithUniqueArtifacts", topEvals, childrenToParents, allArtifacts)
	                    .then(function(sentCount)
	                    {
	                    	totalGenomesSent += sentCount;

	                    	//going to end if max genomes sent greater than defined amount the UI can hold
	                    	if(totalGenomesSent > self.maxGenomesInUI) 
	                            done(undefined, true);
	                        else if(gens < self.maxAllowedGenerations)
	                            done(undefined, false);
	                        else
	                            done(undefined, true);
	                    })
	                    .fail(function(err)
	                    {
	                        done(err);
	                    })
                })
			},
			"evolution:finishedEvolution" : function(pop, eval)
			{
				var done = arguments[arguments.length-1];

				self.log("Ready to finish evolution, limits reached. Probably should tell UI");
                //here is what we do
                //when we are done, we take all generated individuals (and their evaluation behaviors)
                //and run through PCA

                //time to run a PCA? Nah, not unless requested
				done();
			}
        };
    }

	function filterTop(evaluations, cutLevel)
	{
	     var allEvals = [];

	    //how many?
	    //loop through -- we're going to filter out any empties -- and sift the top
	    for(var wid in evaluations)
	    {
	        //no empties please
	        if(evaluations[wid].evaluation.iesorDistance != 0)
	            allEvals.push(evaluations[wid]);
	    }

	    allEvals.sort(function(a,b){

	        return b.evaluation.iesorDistance - a.evaluation.iesorDistance;
	    });

	    // var allTogehter = "";
	    // for(var i=0; i < allEvals.length; i++)
	    // 	allTogehter += allEvals[i].evaluation.iesorDistance + "-- > ";

	    // self.log("Top: ", allTogehter);


	    //cut out the bottom performers
	    var cutoff = Math.floor(cutLevel*allEvals.length);

	    //grab top please
	    //send it back, all sliced up mwahahaha
	    return allEvals.slice(0, cutoff);
	}

	function evaluatePCA(evaluations, topPercent)
	{
	    //cut out the bottom 75%
	    var topPerformers = filterTop(evaluations, topPercent);

	    //now build behavior matrix
	    var behaviorMatrix = [];

	    //map the ids to the wid -- this is useful after doing pca 
	    var performerIndexToWID = {};
	    for(var i=0; i < topPerformers.length; i++)
	    {
	        //grab one of the top performers
	        var tp = topPerformers[i];

	        //this is why we added the wid to the inside of the saved eval object
	        performerIndexToWID[i] = tp.wid;

	        //send in the behaviors
	        behaviorMatrix.push(tp.evaluation.behaviors);
	    }

	    self.log("non-empty IESORs in memory: ", allEvals.length);
	    self.log("Top racers: ", topPerformers.length);

	    var pca = $M(behaviorMatrix).pcaProject(2);

	    var pcaResults = pca.Z;
	    var mapping = {};
	    for(var i=0; i < behaviorMatrix.length; i++)
	    {   
	        //wid from the index
	        var wid = performerIndexToWID[i];
	        //grab the resulting object
	        var pcaCoordinate = pcaResults[i];

	        //map your face please!
	        //seriously, mapp the wid to the new pca coordinate
	        mapping[wid] = pcaCoordinate;
	    }

	    //return the mapping for now
	    //maybe this should be on another thread...
	    return {pca: mapping, top: topPerformers};
	}

	self.handleSeedTracking = function(count, widOffspring, finished)
	{
		if(count == 0){
			finished();
			return;
		}

		self.backEmit("schema:getReferencesAndParents", self.artifactType, widOffspring, function(err, refsAndParents)
		{
			if(err)
			{
				finished(err);
				return;
			}

			//check the refs for each object
			for(var wid in widOffspring)
			{
				//here we are with refs and parents
				var rAndP = refsAndParents[wid];

				var widSeedParents = self.noDuplicatSeedParents(rAndP);

				//for each key, we set our seed parents appropriately	
				for(var key in widSeedParents)
				{
					seedParents[key] = widSeedParents[key];
				}
			}

			//mark the offspring as the list objects
			finished()

		});
	}

	self.noDuplicatSeedParents = function(refsAndParents)
	{
		var allSeedNoDup = {};

		//this is a map from the wid to the associated parent wids
		for(var refWID in refsAndParents)
		{
			var parents = refsAndParents[refWID];

			var mergeParents = [];

			for(var i=0; i < parents.length; i++)
			{
				var seedsForEachParent = seedParents[parents[i]];

				//now we just merge all these together
				mergeParents = mergeParents.concat(seedsForEachParent);
			}

			//then we get rid of any duplicates
			var nodups = {};
			for(var i=0; i < mergeParents.length; i++)
				nodups[mergeParents[i]] = true;

			//by induction, each wid generated knows it's seed parents (where each seed reference wid references itself in array form)
			//therefore, you just look at your reference's parents to see who they believe is their seed 
			//and concat those results together -- pretty simple, just remove duplicates
			allSeedNoDup[refWID] = Object.keys(nodups);
		}

		return allSeedNoDup;	
	}

    self.publishArtifact = function(id, meta, finished)
	{
		//don't always have to send meta info -- since we don't know what to do with it anyways
		if(typeof meta == "function")
		{
			finished = meta;
			meta = {};
		}
		//we fetch the object from the id

		var evoObject = allArtifacts[id];

		if(!evoObject)
		{
			finished("Evolutionary artifactID to publish is invalid: " + id);
			return;
		}
		//we also want to store some meta info -- don't do anything about that for now 

		//here is what needs to happen, the incoming evo object has the "wrong" parents
		//the right parents are the published parents -- the other parents are hidden

		//this will need to be fixed in the future -- we need to know private vs public parents
		//but for now, we simply send in the public parents -- good enough for iesor na-iec applications protoype
		//other types of applications might need more info.
		var widObject = {};
		widObject[evoObject.wid] = evoObject;

		self.backEmit("schema:getReferencesAndParents", self.artifactType, widObject, function(err, refsAndParents){

			//now we know our references
			var refParents = refsAndParents[evoObject.wid];

			//so we simply fetch our appropraite seed parents 
			var evoSeedParents = self.noDuplicatSeedParents(refParents);

			//now we have all the info we need to replace all our parent refs
			self.backEmit("schema:replaceParentReferences", self.artifactType, evoObject, evoSeedParents, function(err, cloned)
			{
				//now we have a cloned version for publishing, where it has public seeds

				 //just publish everything public for now!
		        var session = {sessionID: evolutionSessionID, publish: true};

		        //we can also save private info
		        //this is where we would grab all the parents of the individual
		        var privateObjects = [];

				self.backEmit("publish:publishArtifacts", self.artifactType, session, [cloned], [], function(err)
				{
					if(err)
					{
						finished(err);
					}
					else //no error publishing, hooray!
						finished(undefined, cloned);

				})

			})

		});
	}



	//no need for a callback here -- nuffin to do but load
	self.loadSeeds = function(idAndSeeds, finished)
	{
		var newSeeds = {};
		var areNewSeeds = false;
		//we have all the seeds and their ids, we just absorb them immediately
		for(var eID in idAndSeeds)
		{
			var seed = idAndSeeds[eID];
			var wid = seed.wid;

			if(allArtifacts[wid])
				continue;

			//grab the objects and save them
			allArtifacts[wid] = seed;

			if(!seeds[wid]){
				newSeeds[wid] = seed;
				areNewSeeds = true;
			}

			//save our seeds
			seeds[wid] = seed;
		}

		self.log("seed objects: ", newSeeds);

		//no new seeds 
		if(!areNewSeeds)
		{
			finished();
			return;
		}

		self.backEmit("schema:getReferencesAndParents", self.artifactType, newSeeds, function(err, refsAndParents)
		{
			if(err)
			{
				//pass on the error if it happened
				if(finished)
					finished(err);
				else
					throw err;
				return;
			}
			//there are no parent refs for seeds, just the refs themselves which are important
			for(var wid in newSeeds)
			{
				var refs = Object.keys(refsAndParents[wid]);
				for(var i=0; i < refs.length; i++)
				{
					//who is the parent seed of a particular wid? why itself duh!
					seedParents[refs[i]] = [refs[i]];
				}
			}

			// self.log("Seed parents: ", seedParents);

			//note, there is no default behavior with seeds -- as usual, you must still tell iec to select parents
			//there is no subsitute for parent selection
			if(finished)
				finished();

		});


	}




	return self;
};

