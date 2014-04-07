var winjs = require('win-save');

var path =require('path');
var express = require('express');

var port = 4000;

winjs.launchWIN({artifactType: "iesor", directory: __dirname, seedDirectory: './seeds', schemaDirectory: './schemas'},
    {port: port, modifier: 'testiesor'},
    function(err, app)
{
    if(err)
        throw new Error('Messed up starting WIN- make sure mongo is running.');

    //now we're launched
    console.log('Winsave waiting on port ' + port + '!');

});
