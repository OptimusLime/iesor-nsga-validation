//here we test the insert functions
//making sure the database is filled with objects of the schema type
var wMath = require('win-utils').math;

module.exports = iesorevaluation;

//we do validation here
function iesorevaluation(backbone, globalConfig, localConfig)
{
	var self = this;

	//boom, let's get right into the business of encoding
	self.winFunction = "evaluate";

	self.log = backbone.getLogger(self);
	//only vital stuff goes out for normal logs
	self.log.logLevel = localConfig.logLevel || self.log.normal;

	self.eventCallbacks = function()
	{ 
		return {
			"evaluate:evaluateArtifacts" : function(population){
				// throw new Error("evaluateArtifacts: Not implemented");
				var done = arguments[arguments.length-1];
				var popEvals = {};

				var evals = [];
				//we do stuff with the population, or with the objects 
				//this is where we would use novelty or genomic novelty or whatever
				for(var i=0; i < population.length; i++)
				{
					evals.push({realFitness: i, behaviors : [], complexity: 0});//[Math.random(), Math.random(), Math.random()]});
				}

				done(undefined, {evaluations: evals});
			}
			,"evaluate:measureObjectives":function(population, popEvaluations)
			{
				var done = arguments[arguments.length-1];

				//for measuring the objectives of all the pop objects
				var measured = [];

				//we do stuff with the population, or with the objects 
				//this is where we would use novelty or genomic novelty or whatever
				for(var i=0; i < population.length; i++)
				{
					measured.push([Math.random(), Math.random()]);
				}

				done(undefined, measured);
			}
		};
	};

	//need to be able to add our schema
	self.requiredEvents = function() {
		return [
		];
	};

	return self;
};

