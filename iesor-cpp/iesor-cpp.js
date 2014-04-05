//here we test the insert functions
//making sure the database is filled with objects of the schema type

var iesor = require('node-iesor');

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

	//now we actually have to do this -- send our evals to node-iesor for evaluation inside a world
	self.evaluateObjects = function(arts)
	{
		
	}

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

		return ip;
	}


	self.eventCallbacks = function()
	{ 
		return {
			"iesor:simulateArtifacts" : function(indexArtifacts, finished){

				//let's do an eval
				for(var index in indexArtifacts)
				{
					var tArtifact = indexArtifacts[index];

					//this is the true object -- we need to convert into the world 





				}
				

					//nothing more for eval -- not too bad
			}
		};
	};
	//i dont require anything -- just answer this call
	return self;
};

