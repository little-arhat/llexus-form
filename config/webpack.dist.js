'use strict';
var extend = require('xtend');

var common = require('./webpack.common.dist');


module.exports = extend(common, {
    output: {
        path: './dist',
        filename: 'llexus-form.js',
        libraryTarget: 'umd',
        library: 'LlexusForm',
    },
});
