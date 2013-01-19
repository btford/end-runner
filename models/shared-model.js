// compile proxy for shared model
var sjs = require('sweet.js');
var fs = require('fs');

console.log('compiling');

fs.writeFileSync(__dirname + '/shared-model.compiled.js',
  sjs.compile(
    fs.readFileSync(__dirname + '/shared-model.sjs')));

console.log('done');

module.exports = require('./shared-model.compiled.js');
