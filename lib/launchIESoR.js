//here we test the insert functions
//making sure the database is filled with objects of the schema type
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

//handle the evaluation!
var iesorEvaluate = require('./evaluation');
var iesorEncoding = require('./encoding');
var uiControl = require('./uiControl');
var iesorEvolution = require('./evolution');

//what's the initial seed (in the future fetch from server)
var iesorSeed = require('./iesorSeed.js');

//supa dupa
var maxGens = 10;

var evalsInMemory = {};
var allArtifacts = {};

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

//do this up front yo
backbone = new winback();

var moduleJSON = 
{
    "iesorEvolution" : iesorEvolution,
    "uiControl" : uiControl,
    "socketUI" : "socketUI",
    "iesor-cpp" : iesorcpp,
    "win-novelty" : winnovelty,
	"win-nsga" : "win-nsga",
	"win-neat" : "win-neat",
	"win-gen" : "win-gen",
	"win-schema" : "win-schema",
	"iesor-encoding" : iesorEncoding,
	"evaluate" : iesorEvaluate
};

var configurations = 
{
	"global" : {
        searchParameters : {
        	populationSize: 60,
        	bestPercentage : .1,
            nsgaObjectiveLength : 2, //local competition, novelty, and genomic novelty
            nsgaGlobalGenomeDiversity : false,
            simulationTimeMS : 3500,
            searchRawDistance : true
        }
	},
    "socketUI" : {
        socketServerType: "websocket",
        uiPort : 9000,
       logLevel : backbone.testing
    },
    "iesorEvolution" : {
       logLevel : backbone.testing
    },
    "iesor-cpp" : {
        logLevel : backbone.testing
      },
    "uiControl" : {
        logLevel : backbone.testing
      },
    "win-novelty" : {
        logLevel : backbone.testing
      },
       "evaluate" : {
        logLevel : backbone.testing
      },
	"win-neat" : {
        //default neat params for the search?
        neatParameters : np,
		options : {
			//can't have more than two parents -- ever
			moreThanTwoParents : 0,
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

backLog = backbone.getLogger({winFunction:"iesor-app"});
backLog.logLevel = backbone.testing;

//loading modules is synchronous
backbone.loadModules(moduleJSON, configurations);

// backbone.muteAll();
// backbone.unmute("uiControl");
// backbone.unmute("iesorEvolution");
// backbone.unmute("socketUI");
// backbone.unmute("evaluate");
// backbone.mute("backbone");
// backbone.unmuteLogger(backLog);
// backbone.mute("evaluate");
// backbone.mute("iesor-encoding");
// backbone.mute("win-neat");
// backbone.unmute("win-novelty");
// backbone.unmute("win-nsga");

backLog('Starting iesor-app in nodejs ');


//pretty uneventful the start here

//really it's all on the UI -- look at uiControl package/folder
backbone.initializeModules(function()
{
	backLog("Finished IESoR Application start, it's up to the UI now");

});

   


