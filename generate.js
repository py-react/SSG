import path from"path";
import fs from"fs/promises";
import React from"react";
import ReactDOMServer from"react-dom/server";
import { ensureDir, writeFile } from"./fileUtils.js";

const outputDir = path.resolve("./dist/templates");
const manifestPath = path.resolve(__dirname,"static","clientManifest.json");
const entrypointPath = path.resolve(__dirname,"static","entrypoints.json");

// Directory containing your app files
const pagesDir = "pages";
const appDir = path.resolve(__dirname,"..","src",pagesDir);

// Function to generate routes based on filesystem
const generateRoutes = async () => {
  try {
    const traverseDirectory = async (dir) => {
      const files = await fs.readdir(dir, { withFileTypes: true });
      const nestedRoutes = [];
      const rootRoute = {
        path: null,
        component: null,
        layout:null,
        routes: nestedRoutes,
      };

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          const subRoutes = await traverseDirectory(fullPath);

          if (subRoutes.length > 0) {
            nestedRoutes.push(...subRoutes);
          }
        } else if (file.isFile() && isIndexFile(file.name)) {
          const componentName = getComponentName(dir);
          const routePath = getRoutePath(dir);

          rootRoute.path = routePath
          rootRoute.component = componentName
          rootRoute.routes = nestedRoutes
        }else if (file.isFile() && isLayoutFile(file.name)){
          rootRoute.layout = true
        }
      }

      return rootRoute ? [rootRoute] : nestedRoutes;
    };

    // Start traversing from the appDir
    const routes = await traverseDirectory(appDir);

    // Generate routes.js content
    const routesJsContent = `module.exports = {"routes":${JSON.stringify(routes, null, 2)}}`;

    // Write to routes.js
    await fs.writeFile(path.resolve(__dirname,"static", 'routes.js'), routesJsContent);
    console.log('routes.js has been generated successfully!');
    return routes;
  } catch (error) {
    console.error('Error generating routes.js:', error);
  }
};

// Helper functions
const isIndexFile = (fileName) => ['index.jsx', 'index.tsx', 'index.js'].includes(fileName);
const isLayoutFile = (fileName) => ['layout.jsx', 'layout.tsx', 'layout.js'].includes(fileName);

const getRoutePath = (dir) => {
  const relativePath = path.relative(appDir, dir);
  return relativePath === '' ? '/' : '/' + relativePath.replace(/\\/g, '/');
};

const getComponentName = (dir) => {
  const componentName = path.basename(dir);
  return componentName.charAt(0).toUpperCase() + componentName.slice(1);
};

// Load the manifest
const loadManifest = async () => {
  try {
    const manifestContent = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(manifestContent);
  } catch (error) {
    console.error("Error reading manifest file:", error);
    return {};
  }
};

// Load the entrypoints
const loadEntryPoints = async () => {
  try {
    const manifestContent = await fs.readFile(entrypointPath, "utf8");
    return JSON.parse(manifestContent);
  } catch (error) {
    console.error("Error reading entrypoint file:", error);
    return {};
  }
};

// Generate HTML with JavaScript
const generatePageHtml = async (Component, title, jsFiles,Layout) => {
  const entryPoints = await loadEntryPoints()
  let elem = null
  if(Layout){
    elem = React.createElement(Layout,{title,scripts:entryPoints,children:React.createElement(Component)});
  }else{
    elem = React.createElement(Component);
  }
  const pageHtml = ReactDOMServer.renderToStaticMarkup(elem);
  
  return `${pageHtml}`;
};

function isSubPath(fullPath, subPath) {
  // Normalize paths by removing leading and trailing slashes
  const normalizedFullPath = fullPath.replace(/^\/|\/$/g, '');
  const normalizedSubPath = subPath.replace(/^\/|\/$/g, '');

  // Build the regex pattern to match the normalizedSubPath in any subdirectory of src
  // The pattern allows for any characters after the subPath, including extensions
  const regexPattern = `^.*${normalizedSubPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\..*)?$`;
  
  // Create the regex
  const regex = new RegExp(regexPattern);

  // Test if the fullPath matches the pattern
  const isSubPath = regex.test(normalizedFullPath);

  return isSubPath;
}

// Find JavaScript files for the component
const findJsFilesForComponent = (componentName, manifest) => {
  const jsFiles = [];
  // const exactMatch = Object.keys(manifest).find((file) => {
  //   const parents = manifest[file].parents
  //   return parents.some(p=>{
  //     return isSubPath(p,componentName)
  //   });
  // });
  // if (exactMatch) {
  //   let jsFile = exactMatch.split(path.sep).join("_")
  //   let ext = jsFile.split(".")[1]
  //   jsFiles.push([jsFile.split(".")[0],ext].join("_")+"."+ext);
  // }
  return jsFiles;
};

// Recursively process routes and generate HTML files
const processRoutes = async (allRoutes,basePath = '') => {
  const traverseRoutes = async(routes,lastLayout=null)=>{
      for (const route of routes) {
        const componentName = route.path === "/" ? "/index" : path.join(route.path, "index");
        const manifest = await loadManifest();
        
        try {
          const Component = (
            await import(`${__dirname}/babel_build/pages${componentName}.js`)
          ).default;
          let Layout = lastLayout
          if(route.layout){
            const LayoutPath = route.path === "/" ? "/Layout" : path.join(route.path, "Layout");
            Layout = (
              await import(`${__dirname}/babel_build/pages${LayoutPath}.js`)
            ).default;

          }
          // Determine JavaScript files to include
          const jsFiles = findJsFilesForComponent(componentName, manifest);
          const pageHtml = await generatePageHtml(Component, route.title, jsFiles||[],Layout);
          const routePath = path.join(basePath, route.path === "/" ? "index.html" : `${route.path}.html`);
          await ensureDir(path.dirname(path.join(outputDir,routePath)));
          await writeFile(path.join(outputDir, routePath), pageHtml);
          console.log(`Generated ${routePath}`);
          // Process nested routes
          if (route.routes) {
            await traverseRoutes(route.routes, Layout);
          }
        } catch (error) {
          console.error(`Error generating ${route.path}:`, error);
        }
    
      }
  }
  traverseRoutes(allRoutes)
};

(async () => {
  // generate routes.js
  const routes = await generateRoutes();
  await processRoutes(routes);
  console.log("Static site generated!");
})();
