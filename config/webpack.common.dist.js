'use strict';


module.exports = {
    entry: './lib/index',
    resolve: {
        extensions: ['', '.js', '.jsx'],
    },
    externals: {
        "react": {
            root: "React",
            commonjs2: "react",
            commonjs: "react",
            amd: "react"
        },
        'react/addons': 'React'
    },
    module: {
        loaders: [{
            test: /\.jsx?$/,
            loaders: ['jsx-loader?harmony'],
            exclude: /node_modules/,
        }]
    }
};
