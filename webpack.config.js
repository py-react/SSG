const path = require('path');
const fs = require('fs');
const {exec} = require("child_process")

class ClientDirectivePlugin {
    constructor(options) {
        this.outputPath = options.outputPath || '/dist/clientManifest.json';
        this.entrypointOutput = options.entrypointOutput || '/dist/clientManifest.json';
    }

    apply(compiler) {
        // Generate manifest file
        console.log(Object.keys(compiler.hooks))
        compiler.hooks.done.tap("ClientDirectiveGenerateSite",(stats)=>{
            exec("npm run build-generate-file",(err, stdout, stderr) => {
                if(err){
                    console.log(stdout);
                    console.log(stderr);
                    return
                }
                console.log(stdout);
                exec("npm run build",(err, stdout, stderr) => {
                    if(err || stderr ){
                        console.log(stdout);
                        console.log(stderr);
                        return
                    }
                    console.log(stdout);
                    const compilation = stats.compilation;
                    const entrypoints = compilation.entrypoints;
                    console.log(Object.keys(compilation))

                    const EntryPoints = []
                    entrypoints.forEach((entrypoint, name) => {
                        entrypoint.getFiles().forEach((file) => {
                            EntryPoints.push(file);
                            
                        });
                    });
                    console.log('Entry points built:',JSON.stringify(EntryPoints, null, 2));
                    fs.writeFileSync(this.entrypointOutput, JSON.stringify(EntryPoints, null, 2));
                    exec("npm run generate",(err, stdout, stderr) => {
                        if(err || stderr ){
                            console.log(stdout);
                            console.log(stderr);
                            return
                        }
                        console.log(stdout);
                    })
                    

                })
            })
        })
        compiler.hooks.done.tap('ClientDirectiveClientManifest ', (stats) => {
            const manifest = {};
            stats.toJson().modules.forEach((module) => {
                if (module.reasons) {
                    const modulePath = path.relative(compiler.context, module.name);
                    if (modulePath.trim().startsWith(path.join('', 'src', '')) && modulePath.endsWith('.js') && !modulePath.endsWith('fileUtils.js')) {
                        const content = fs.readFileSync(path.resolve(compiler.context, modulePath), 'utf8');
                        if (content.includes("'use client'") || content.includes('"use client"')) {
                            manifest[modulePath] = {
                                outputPath: `/${path.basename(modulePath)}`,
                                parents: module.reasons.map(reason => {
                                    return path.relative(compiler.context, reason.moduleName).replace("src/","/static/").split(".")[0]+"."+"html"
                                })
                            };
                        }
                    }
                }
            });
            console.log("Client manifest generated")
            fs.writeFileSync(this.outputPath, JSON.stringify(manifest, null, 2));
             // This function runs after the build process is complete
             console.log(`Build completed successfully!\n\n${stats.toJson().assets.map(asset => `Asset: ${asset.name} | Size: ${asset.size}`).join('\n')}`);
        });
       


    }
    
}

/**
 * @type {import('webpack').Configuration}
 */
module.exports = {
    context: __dirname,
    mode: 'production',
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
            outputPath: path.resolve(__dirname,"dist","static", 'clientManifest.json'), // Output path for the manifest file
            entrypointOutput: path.resolve(__dirname,"dist","static", 'entrypoints.json'), // Output path for the manifest file
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
