//contains the neat schema setup -- default for neatjs stuff.

//Need a way to override schema inside WIN -- for now, neat comes with its own schema. Will be able to add variations later
//(for things looking to add extra neat features while still having all the custom code). 

//Alternatively, they could just copy this module, and add their own stuff. Module is small. 
 
module.exports = {
	//this is temporary till we load from the network
	// "seedID" : "string",
    "genome": { 
        "$ref" : "NEATGenotype"
    }
    //don't know how to do environment yet
    ,"environment": {
        "type" : "String"
    }
};


