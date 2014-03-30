//here we test the insert functions
//making sure the database is filled with objects of the schema type
var assert = require('assert');
var should = require('should');
var colors = require('colors');
var traverse = require('optimuslime-traverse');
var Q = require('q');

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
	eventCallbacks : function(){ return {}; },
	requiredEvents : function() {
		return [
			"evolution:nsga-startEvolution"
			];
	},
	initialize : function(done)
    {
        process.nextTick(function()
        {
            done();
        })
    }
};
var cIx = 0;

//handle the evaluation!
var iesorEvaluate = require('./evaluation');
var iesorEncoding = require('./encoding');
var iesorSeed = require('./iesorSeed.js');

var maxGens = 2;

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

 var qBackboneResponse = function()
{
    var defer = Q.defer();
    // self.log('qBBRes: Original: ', arguments);

    //first add our own function type
    var augmentArgs = arguments;
    // [].splice.call(augmentArgs, 0, 0, self.winFunction);
    //make some assumptions about the returning call
    var callback = function(err)
    {
        if(err)
        {
            defer.reject(err);
        }
        else
        {
            //remove the error object, send the info onwards
            [].shift.call(arguments);
            if(arguments.length > 1)
                defer.resolve(arguments);
            else
                defer.resolve.apply(defer, arguments);
        }
    };

    //then we add our callback to the end of our function -- which will get resolved here with whatever arguments are passed back
    [].push.call(augmentArgs, callback);

    // self.log('qBBRes: Augmented: ', augmentArgs);
    //make the call, we'll catch it inside the callback!
    backEmit.apply(backEmit, augmentArgs);

    return defer.promise;
}

describe('Testing win-NSGA running -',function(){

    //we need to start up the WIN backend
    before(function(done){

    	//do this up front yo
    	backbone = new winback();

    	var moduleJSON = 
		{
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
			},
			"win-neat" : {
				options : {
					initialMutationCount : 0, 
					postMutationCount : 0
				}
				,logLevel : backbone.testing
			},
			"win-nsga" : {
				genomeType : "iesor"
				,logLevel : backbone.testing
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

			for(var i=0; i < pop.length; i++)
			{
				var singleEval = eval[pop[i].wid];

				backLog("Final Eval: ".magenta,  singleEval);
			}

    		// backLog("Objs: ", util.inspect(arguments[0].population, false, 10));
    		// backLog("Evals: ", util.inspect(arguments[0].evaluations, false, 10));
    		// backLog("Evals: ", util.inspect(arguments[1], false, 10));
    		//finished evolution 
    		done();
    	}

    	//now we call asking for 
    	qBackboneResponse("evolution:nsga-startEvolution", evoProps, seeds, evoError)
    		.then(function(artifacts)
    		{
    			//evolution started!
    			backLog('\tFinished starting evolution, '.cyan, util.inspect(artifacts, false,10));
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










