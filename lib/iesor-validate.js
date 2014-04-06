//here we test the insert functions
//making sure the database is filled with objects of the schema type
var assert = require('assert');
var should = require('should');
var colors = require('colors');
var traverse = require('optimuslime-traverse');
var Q = require('q');

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
			"evolution:nsga-startEvolution"
			];
	}
};

var cIx = 0;

//handle the evaluation!
var iesorEvaluate = require('./evaluation');
var iesorEncoding = require('./encoding');
var iesorSeed = require('./iesorSeed.js');

var maxGens = 10;

var controlEvolution = {
	winFunction : "evolution",
	eventCallbacks : function()
	{
		return {
			"evolution:shouldEndEvolution" : function(gens)
			{
				backLog("Gen Count: " + gens);

				var done = arguments[arguments.length-1];

				if(gens < maxGens)
					done(undefined, false);
				else
					done(undefined, true);

			},
			"evolution:finishedEvolution" : function(pop, eval)
			{
				var done = arguments[arguments.length-1];

			
				done();

				//end callback if it exists
				if(evoTestEnd)
					evoTestEnd.apply(this, arguments);
			}
		};
	},
	requiredEvents : function() {
		return [];
	}
};

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

    	var moduleJSON = 
		{
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
                    nsgaObjectiveLength : 3, //local competition, novelty, and genomic novelty
                    nsgaGlobalGenomeDiversity : false,
                    simulationTimeMS : 3500,
                    searchRawDistance : false
                }
			},
            "iesor-cpp" : {
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










