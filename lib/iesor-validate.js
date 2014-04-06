//here we test the insert functions
//making sure the database is filled with objects of the schema type
var assert = require('assert');
var should = require('should');
var colors = require('colors');
var traverse = require('optimuslime-traverse');
var Q = require('q');



var sylvester = require('sylvester');

//this is the cpp module that's doing the simulation -- we call out for artifacts simulation
var iesorcpp = require('iesor-cpp');

var neatParams = require('neatjs').neatParameters;

var util = require('util');

var wMath = require('win-utils').math;
var winback = require('win-backbone');

//load in our novelty wrapping object -- it wraps novelty fo' sho
var winnovelty = require('win-novelty');

var backbone, generator, backEmit, backLog;
var evoTestEnd;
var count = 0;

var controlModule = 
{
	winFunction : "control",
	requiredEvents : function() {
		return [
			"evolution:nsga-startEvolution",
            //cleaning this shit up in the near future -- so sloppy
            "socketUI:sendDataWithUniqueArtifacts"
			];
	}
};

var cIx = 0;

//handle the evaluation!
var iesorEvaluate = require('./evaluation');
var iesorEncoding = require('./encoding');
var iesorSeed = require('./iesorSeed.js');

var maxGens = 10;

var evalsInMemory = {};
var allArtifacts = {};

var controlEvolution = {
	winFunction : "evolution",
	eventCallbacks : function()
	{
		return {
			"evolution:shouldEndEvolution" : function(gens, activePop, activeEval)
			{
				backLog("Gen Count: " + gens, arguments);
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
                    }
                }

                //lets get the best of the best -- top 25%
                var top = filterTop(evalsInMemory, .25);


                if(!top.length){
                    
                    //don't end on my account -- nothing to send though
                     done(undefined, false);
                    return;
                }

                var topEvals = {};
                for(var i=0; i < top.length; i++)
                {
                    var wid  = top[i].wid;
                    topEvals[wid] = evalsInMemory[wid].evaluation;
                }

                //let our socket know about the new information
                backEmit.qCall("socketUI:sendDataWithUniqueArtifacts", topEvals, allArtifacts)
                    .then(function()
                    {
                        if(gens < maxGens)
                            done(undefined, false);
                        else
                            done(undefined, true);
                    })
                    .fail(function(err)
                    {
                        done(err);
                    })


                //let's get an active pca of the object
                // var evalPCA = evaluatePCA(evalsInMemory);

                //take the pca objects and blast them out -- mwahaha



                //socket decides what to send and what not to send -- don't worry about sending everything
                //as long as it's mapped by wid
                // backEmit.qCall("socket:sendArtifactsAndData", allArtifacts, evalsInMemory, );


				

			},
			"evolution:finishedEvolution" : function(pop, eval)
			{
				var done = arguments[arguments.length-1];

                //here is what we do
                //when we are done, we take all generated individuals (and their evaluation behaviors)
                //and run through PCA


                // var matrix = $M([[1, 2], [5, 7]]);

                // var pca = matrix.pcaProject(1);

                // backLog("Sample PCA: ", pca);
                // backLog("Sample PCA Z: ", pca.Z);


                 // $M([[1, 2], [5, 7]])
                 // var pca = evalMatrix.pcaProject(2);



				done();

				//end callback if it exists
				if(evoTestEnd)
					evoTestEnd.apply(this, arguments);
			}
		};
	},
	// requiredEvents : function() {
	// 	return ["socketUI:sendDataWithUniqueArtifacts"];
	// }
};


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

    backLog("non-empty IESORs in memory: ", allEvals.length);
    backLog("Top racers: ", topPerformers.length);

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

var np = new neatParams();

//set up the defaults here
np.pMutateAddConnection = .05;
np.pMutateAddNode = .01;
np.pMutateDeleteSimpleNeuron = .00;
np.pMutateDeleteConnection = .00;
np.pMutateConnectionWeights = .80;
np.pMutateChangeActivations = .1;
np.pNodeMutateActivationRate = 0.2;
np.connectionWeightRange = 3.0;
np.disallowRecurrence = true;


describe('Testing win-NSGA running -',function(){

    //we need to start up the WIN backend
    before(function(done){

    	//do this up front yo
    	backbone = new winback();
        backbone.mute("backbone");

    	var moduleJSON = 
		{
            "socketUI" : "socketUI",
            "iesor-cpp" : iesorcpp,
            "win-novelty" : winnovelty,
			"win-nsga" : "win-nsga",
			"win-neat" : "win-neat",
			"win-gen" : "win-gen",
			"win-schema" : "win-schema",
			"iesor-encoding" : iesorEncoding,
			"evaluate" : iesorEvaluate,
			"evolution" : controlEvolution,
			"control" : controlModule
		};
		var configurations = 
		{
			"global" : {
                searchParameters : {
                    nsgaObjectiveLength : 2, //local competition, novelty, and genomic novelty
                    nsgaGlobalGenomeDiversity : false,
                    simulationTimeMS : 3500,
                    searchRawDistance : false
                }
			},
            "socketUI" : {
                socketServerType: "websocket",
                uiPort : 9000
            },
            "iesor-cpp" : {
                logLevel : backbone.testing
              },
            "win-novelty" : {
                logLevel : backbone.testing
              },
			"win-neat" : {
                //default neat params for the search?
                neatParameters : np,
				options : {
					initialMutationCount : 4, 
					postMutationCount : 4
				}
				,logLevel : backbone.testing
			},
            "iesor-encoding" : {
                logLevel : backbone.testing
            },
            "evaluate" : {
                logLevel : backbone.testing
            },
			"win-nsga" : {
				genomeType : "iesor"
				// ,logLevel : backbone.testing
			},
			"win-gen" : {
				//we have two encoding, iesor and its internal ref to neatgenotype 
				"encodings" : [
					"iesor",
					"NEATGenotype"
				]
				,validateParents : true
				,validateOffspring : true
				// ,logLevel : backbone.testing
			},
			"win-schema" : {
				multipleErrors : true
				// ,logLevel : backbone.testing

			}
		};

    	backbone.logLevel = backbone.testing;
        // backbone.logLevel = backbone.normal;

    	backEmit = backbone.getEmitter(controlModule);
    	backLog = backbone.getLogger({winFunction:"mocha"});
    	backLog.logLevel = backbone.testing;

    	//loading modules is synchronous
    	backbone.loadModules(moduleJSON, configurations);

        backbone.muteAll();
        backbone.unmuteLogger(backLog);
        // backbone.mute("evaluate");
        // backbone.mute("iesor-encoding");
        // backbone.mute("win-neat");
        // backbone.unmute("win-novelty");
        // backbone.unmute("win-nsga");

    	var registeredEvents = backbone.registeredEvents();
    	var requiredEvents = backbone.moduleRequirements();
    		
    	backLog('Backbone Events registered: ', registeredEvents);
    	backLog('Required: ', requiredEvents);

    	backbone.initializeModules(function()
    	{
    		backLog("Finished Module Init");
 			done();
    	});

    });

    it('Should run evolution for 10 generations',function(done){

    	//seed it with a single object
    	var seeds = [iesorSeed];

        // var evoProps = {genomeType : "iesor", populationSize : 100};
    	var evoProps = {genomeType : "iesor", populationSize : 10};

    	//throw errors while running evolution
    	var evoError = function(err)
    	{
    		if(typeof err == "string")
    			done(new Error(err));
    		else
    			done(err);
    	};

    	evoTestEnd = function(popObject)
    	{
    		var pop = popObject.population;
    		var eval = popObject.evaluations;

            pop.sort(function(a,b)
            {
                return eval[b.wid].realFitness - eval[a.wid].realFitness;
            });

            // backLog("Sorted pop: ", pop);

			// for(var i=0; i < pop.length; i++)
			// {
			// 	var singleEval = eval[pop[i].wid];
   //              backLog("St pop - ".magenta, pop[i].wid, " ev: ", singleEval);
			// } 




    		// backLog("Objs: ", util.inspect(arguments[0].population, false, 10));
    		// backLog("Evals: ", util.inspect(arguments[0].evaluations, false, 10));
    		// backLog("Evals: ", util.inspect(arguments[1], false, 10));
    		//finished evolution 
    		done();
    	}

    	//now we call asking for 
    	backEmit.qCall("evolution:nsga-startEvolution", evoProps, seeds, evoError)
    		.then(function(artifacts)
    		{
    			//evolution started!
    			backLog('\tFinished starting evolution, '.cyan);//, util.inspect(artifacts, false,10));
		    	// done();   
    		})
    		.fail(function(err)
    		{
    			if(err.errors)
    			{
    				backLog('All errors: '.cyan, util.inspect(err.errors, false,10));
    			}
    			
    			if(err.stack)
    				backLog("Error stack: ".red, err.stack);

    			if(err.errno)
    				done(err);
    			else
    				done(new Error(err.message));
    		});
    
    });
});










