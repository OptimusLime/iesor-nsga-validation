//all the UI control we could ever dream of!
module.exports = iesorEvolution;

var sylvester = require('sylvester');

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

	//cache this stuff for now
	var evalsInMemory = {};
	var allArtifacts = {};
	var childrenToParents = {};

	var totalGenomesSent = 0;

	//all the req events for you!
	self.requiredEvents = function()
	{
		return ["uiControl:sendDataWithUniqueArtifacts"];
	}

	self.eventCallbacks = function()
    {
        return {
        	//sent out when evolution is deleted
        	"evolution:clearEvolution" : function()
        	{
        		//all gone!
        		evalsInMemory = {};
        		allArtifacts = {};
        		childrenToParents = {};
        		totalGenomesSent = 0;

        		//byeeeeee
        	},
           "evolution:shouldEndEvolution" : function(gens, activePop, activeEval)
			{
				self.log("Gen Count: " + gens);
                var done = arguments[arguments.length-1];

                //store in memory for now
                for(var i=0; i < activePop.length; i++)
                {
                    var ap = activePop[i];

                    var wid = ap.wid;

                    var eval = activeEval[wid];

                    if(!evalsInMemory[wid])
                    {
                        allArtifacts[wid] = ap;
                        evalsInMemory[wid] = {wid: wid, evaluation: eval};

                        //track the parents -- for future use! Or for ui chain display
                        childrenToParents[wid] = ap.parents;
                    }
                }

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


	return self;
};

