const path =require("path");
const fs =require("fs");
const React =require("react");
const ReactDOMServer =require("react-dom/server");
const {exec} = require("child_process")
const crypto = require('crypto');
const { StaticRouter } = require("react-router-dom/server");

class ClientDirectivePlugin {
    constructor(options) {
        this.entrypointOutput = options.entrypointOutput || path.resolve(process.cwd(),"dist","entrypoints.json")
        this.templateDir = options.templateDir || path.resolve(process.cwd(),"dist","templates");
        // Directory containing your app files
        const pagesDir = "pages";
        const appDir = path.resolve(__dirname,"src",pagesDir);
        this.appDir = options.appDir || appDir
        this.publicPath = options.publicPath || "/static/"
    }

    apply(compiler) {
        // Generate manifest file
        // console.log(Object.keys(compiler.hooks))
        compiler.hooks.initialize.tap("ClientDirectiveGenerateRoutes",async()=>{
          const routes = await generateRoutes(this.appDir);
          this.routes = routes
        })
        compiler.hooks.done.tap("ClientDirectiveGenerateSite",(stats)=>{
            exec("npm run build",async(err, stdout, stderr) => {
                if(err || stderr ){
                    console.log(stdout);
                    console.log(stderr);
                    return
                }
                console.log(stdout);
                const compilation = stats.compilation;
                const entrypoints = compilation.entrypoints;

                const EntryPoints = []
                entrypoints.forEach((entrypoint, name) => {
                    entrypoint.getFiles().forEach((file) => {
                        EntryPoints.push(file);
                        
                    });
                });
                // console.log('Entry points built:',JSON.stringify(EntryPoints, null, 2));
                fs.writeFileSync(this.entrypointOutput, JSON.stringify(EntryPoints, null, 2));
                // generate routes.js
                await processRoutes(this.routes,this.templateDir,this.entrypointOutput);
                console.log("Static site generated!");
            })
        })
    }
    
}

// Function to generate routes based on filesystem
const generateRoutes = async (appDir) => {
  try {
    const traverseDirectory = async (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true });
      const nestedRoutes = [];
      const rootRoute = {
        path: null,
        importPath: null,
        Component: null,
        ComponentName: null,
        layout: null,
        children: nestedRoutes,
      };

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          const subRoutes = await traverseDirectory(fullPath);

          if (subRoutes.length > 0) {
            nestedRoutes.push(...subRoutes);
          }
        } else if (file.isFile() && isIndexFile(file.name)) {
          const componentName = getUniqueComponentName(dir, appDir);
          const routePath = getRoutePath(dir, appDir);
          const importPath = getRoutePath(dir, appDir, true); // Get full path for imports

          rootRoute.path = routePath;
          rootRoute.importPath = importPath;
          rootRoute.Component = componentName;
          rootRoute.ComponentName = componentName;
          rootRoute.children = nestedRoutes;
        } else if (file.isFile() && isLayoutFile(file.name)) {
          const layoutName = getUniqueComponentName(dir, appDir) + 'Layout';
          rootRoute.layout = layoutName;
        }
      }

      return rootRoute.path ? [rootRoute] : nestedRoutes;
    };

    // Start traversing from the appDir
    const routes = await traverseDirectory(appDir);

    // Generate import statements
    const importStatements = generateImportStatements(routes);

    // Generate routes.js content
    const routesJsContent = `
      import React from "react";
      ${importStatements}
      export const routes = ${generateRoutesContent(routes)};
    `;

    // Write to routes.js
    fs.writeFileSync(path.resolve(__dirname, "src", 'routes.js'), routesJsContent);
    console.log('routes.js has been generated successfully!');
    return routes;
  } catch (error) {
    console.error('Error generating routes.js:', error);
  }
};

// Helper functions
const isIndexFile = (fileName) => ['index.jsx', 'index.tsx', 'index.js'].includes(fileName);
const isLayoutFile = (fileName) => ['layout.jsx', 'layout.tsx', 'layout.js'].includes(fileName);

const getRoutePath = (dir, appDir, fullPath = false) => {
  const relativePath = path.relative(appDir, dir);
  const pathParts = relativePath.split(path.sep).filter(Boolean); // Split and filter empty segments

  if (fullPath) {
    return '/' + relativePath.replace(/\\/g, '/');
  }

  return pathParts.length ? pathParts[pathParts.length - 1] : '/'; // Use only the last segment or '/'
};

// Generate unique component/layout name using hash
const getUniqueComponentName = (dir, appDir) => {
  const relativePath = path.relative(appDir, dir);
  const baseName = path.basename(dir);
  const hash = crypto.createHash('md5').update(relativePath).digest('hex').slice(0, 8);
  return `${baseName.charAt(0).toUpperCase() + baseName.slice(1)}_${hash}`;
};

// Generate import statements based on the routes
const generateImportStatements = (routes) => {
  const imports = [];

  const traverseRoutes = (routes) => {
    routes.forEach(route => {
      if (route.ComponentName) {
        imports.push(`import ${route.ComponentName} from './pages${route.importPath}';`);
      }
      if (route.layout) {
        imports.push(`import ${route.layout} from './pages${route.importPath}';`);
      }
      if (route.children && route.children.length > 0) {
        traverseRoutes(route.children);
      }
    });
  };

  traverseRoutes(routes);

  return imports.join('\n');
};

// Generate routes content as JavaScript object without quotes around Component and layout
const generateRoutesContent = (routes) => {
  const traverseRoutes = (route) => {
    const childrenContent = route.children.length
      ? `[${route.children.map(child => traverseRoutes(child)).join(', ')}]`
      : '[]';

    return `{
      path: "${route.importPath}",
      element: <${route.Component}/>,
      layout: ${route.layout ? `<${route.layout}/>` : null},
      children: ${childrenContent},
      importPath:"${route.importPath}"
    }`;
  };

  // Adjust root route and nested routes
  return `[${routes.map(route => {
    if (route.path === '/') {
      return traverseRoutes(route);
    } else {
      return traverseRoutes({
        ...route,
        path: route.path.split('/').pop() // Use only the last segment for nested routes
      });
    }
  }).join(', ')}]`;
};

// Load the entrypoints
const loadEntryPoints = async (entrypointPath) => {
  try {
    const entryPointContent = fs.readFileSync(entrypointPath, "utf8");
    return JSON.parse(entryPointContent);
  } catch (error) {
    console.error("Error reading entrypoint file:", error);
    return {};
  }
};

// Generate HTML with JavaScript
const generatePageHtml = async (App,path,entryPoints) => {
  const pageHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      StaticRouter,
      { location:path },
      React.createElement("main", { id: "root" }, React.createElement(App))
    )
  );
  return `${pageHtml}${entryPoints.map(entry=>`<script defer src="/static/${entry}"></script>`).join("")}`;
};

// Recursively process routes and generate HTML files
const processRoutes = async (allRoutes,templateDir,entrypointOutput) => {

  const traverseRoutes = async(routes)=>{
    const App = (
          await require(`${__dirname}/dist/babel_build/app.js`)
    ).default;
    const entryPoints = await loadEntryPoints(entrypointOutput)
    routes?.forEach(async route => {
        try {
          const pageHtml = await generatePageHtml(App,route.importPath,entryPoints);
          const routePath = path.join("",route.importPath === "/" ? "index.html" : `${route.importPath}.html`);
          await ensureDir(path.dirname(path.join(templateDir,routePath)));
          await writeFile(path.join(templateDir, routePath), pageHtml);
          console.log(`Generated ${routePath}`);
          // Process nested routes
          if (route.children.length) {
            await traverseRoutes(route.children);
          }
        } catch (error) {
          console.error(`Error generating ${route.path}:`, error);
        }
      })
  }
  traverseRoutes(allRoutes)
};


const ensureDir = async (dirPath) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
};

const writeFile = async (filePath, content) => {
  fs.writeFileSync(filePath, content);
};

module.exports = {
  ClientDirectivePlugin
}