const path = require('path');
const {ClientDirectivePlugin} = require("./clientDirectivePlugin");

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
    context: __dirname,
    mode: 'development',
    entry: "./src/index.js",
    // externals: [webpackNodeExternals()],
    output: {
        path: path.resolve(__dirname, 'dist', 'static'),
        filename:"[name].js",
        publicPath: "/static/",
        library: "[name]",
        clean:true
    },
    // devtool:"inline-cheap-module-source-map",
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist', 'static'),
        },
        devMiddleware:{
            publicPath: "/static/",
            writeToDisk:true
          },
        historyApiFallback: true,
     },
    optimization: {
        splitChunks: {
            chunks: 'all',
        },
    },
    plugins: [
        new ClientDirectivePlugin({
            entrypointOutput: path.resolve(__dirname,"dist","static", 'entrypoints.json'), // Output path for the all the entrypoints files
            templateDir: path.resolve(__dirname,"dist","templates"),
            appDir:path.resolve(__dirname,"src","pages"),
            publicPath: "/statics/",
        }),
    ],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
            },
        ],
    },
};
