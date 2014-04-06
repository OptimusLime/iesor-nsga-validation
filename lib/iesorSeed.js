//since it's just a test seed - we add wid, dbtype, and parents
module.exports = {
    // "seedID" : "1",
    "environment" : "standard",
    "wid" : "0",
    "dbType" : "iesor",
    "parents" : [],
    "genome": {
        //need to include wid/dbtype/parent for seed manually FOR NOW...
        "wid" : "0",
        "dbType" : "NEATGenotype",
        "parents" : [],
        "nodes" : [{
            "gid" : "0",
            "activationFunction" : "NullFn",
            "nodeType" : "Bias",
            "bias" : 0,
            "layer" : 0,
            "step" : 0
        }, {
            "gid" : "1", //x1
            "activationFunction" : "NullFn",
            "nodeType" : "Input",
            "layer" : 0,
            "step" : 0,
            "bias" : 0
        }, {
            "gid" : "2", //y1
            "activationFunction" : "NullFn",
            "nodeType" : "Input",
            "layer" : 0,
            "step" : 0,
            "bias" : 0
        }, {
            "gid" : "3", //x2
            "activationFunction" : "NullFn",
            "nodeType" : "Input",
            "layer" : 0,
            "step" : 0,
            "bias" : 0
        }, {
            "gid" : "4", //y2
            "activationFunction" : "NullFn",
            "nodeType" : "Input",
            "layer" : 0,
            "step" : 0,
            "bias" : 0
        }, {
            //weight
            "gid" : "6", 
            "activationFunction" : "BipolarSigmoid",
            "nodeType" : "Output",
            "layer" : 10,
            "step" : 0,
            "bias" : 0
        }, {
            //LEO
            "gid" : "7",
            "activationFunction" : "StepFunction",
            "nodeType" : "Output",
            "layer" : 10,
            "step" : 0,
            "bias" : 0
        }, {
            //amplitude
            "gid" : "8",
            "activationFunction" : "BipolarSigmoid",
            "nodeType" : "Output",
            "layer" : 10,
            "step" : 0,
            "bias" : 0
        }, {
            //phase
            "gid" : "9",
            "activationFunction" : "BipolarSigmoid",
            "nodeType" : "Output",
            "layer" : 10,
            "step" : 0,
            "bias" : 0
         }, {
            //symmetric leo seed node
            "gid" : "100",
            "activationFunction" : "BipolarSigmoid",
            "nodeType" : "Hidden",
            "layer" : 5,
            "step" : 0,
            "bias" : 0
         }, {
            //symmetric leo seed node
            "gid" : "101",
            "activationFunction" : "Gaussian",
            "nodeType" : "Hidden",
            "layer" : 2.5,
            "step" : 0,
            "bias" : 0
         }, {
            //symmetric leo seed node
            "gid" : "102",
            "activationFunction" : "Gaussian",
            "nodeType" : "Hidden",
            "layer" : 2.5,
            "step" : 0,
            "bias" : 0
         }, {
            //symmetric leo seed node
            "gid" : "110",
            "activationFunction" : "BipolarSigmoid",
            "nodeType" : "Hidden",
            "layer" : 5,
            "step" : 0,
            "bias" : 0
        }],
        "connections" : [
            //wire bias to outputs -- except for step function (handled lower down)
            {"gid" : "9", "sourceID": "0", "targetID" : "6", "weight" : 1},
            {"gid" : "10", "sourceID": "0", "targetID" : "8", "weight" : 0},
            {"gid" : "11", "sourceID": "0", "targetID" : "9", "weight" : 0},


            //wire first input to all non-leo outputs
             //for phase/amplitude -- we want x to have undue influence in the seed
             //i.e. the ability to cause constrictions based on x location
             //it's wired and ready, but not set
            {"gid" : "13", "sourceID": "1", "targetID" : "8", "weight" : 0},
            {"gid" : "14", "sourceID": "1", "targetID" : "9", "weight" : 0},

            {"gid" : "15", "sourceID": "3", "targetID" : "8", "weight" : 0},
            {"gid" : "16", "sourceID": "3", "targetID" : "9", "weight" : 0},

            //wire the rest to the weight as well
             {"gid" : "17", "sourceID": "1", "targetID" : "6", "weight" : 1},
             {"gid" : "18", "sourceID": "2", "targetID" : "6", "weight" : 1},
             {"gid" : "20", "sourceID": "3", "targetID" : "6", "weight" : 1},
             {"gid" : "21", "sourceID": "4", "targetID" : "6", "weight" : 1},

            {"gid" : "31", "sourceID": "1", "targetID" : "100", "weight" : 0},
            {"gid" : "32", "sourceID": "2", "targetID" : "100", "weight" : 0},
            {"gid" : "33", "sourceID": "3", "targetID" : "100", "weight" : 0},
            {"gid" : "34", "sourceID": "4", "targetID" : "100", "weight" : 0},

            //wire x1 and x2 to a gaussian with oppostie weights (closer == higher output)
            //x locality bias
            {"gid" : "35", "sourceID": "1", "targetID" : "101", "weight" : 1},
            {"gid" : "36", "sourceID": "3", "targetID" : "101", "weight" : -1},
            
             // Patch the gaussian to the StepFunction output (leo)
            {"gid" : "38", "sourceID": "101", "targetID" : "110", "weight" : 1},

             {"gid" : "40", "sourceID": "2", "targetID" : "102", "weight" : 1},
            {"gid" : "42", "sourceID": "4", "targetID" : "102", "weight" : -1},
             // Patch the gaussian to the StepFunction output (leo)
            {"gid" : "48", "sourceID": "102", "targetID" : "110", "weight" : 1},

            {"gid" : "49", "sourceID": "0", "targetID" : "110", "weight" : -1.7},


            {"gid" : "50", "sourceID": "100", "targetID" : "7", "weight" : -1},
            {"gid" : "51", "sourceID": "110", "targetID" : "7", "weight" : 1}
        ]
    }
}