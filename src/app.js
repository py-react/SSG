import React from 'react';
import { Route, Routes } from 'react-router-dom';
import About from './pages/about/about';
import SecondAbout from './pages/about';
import Home from './pages';

const loadModule = async(path)=>{
    return await import(`${path}`)
}

// Helper function to render routes
const renderRoutes = async (routesPath) => {
    const allRoutes = await loadModule(routesPath)
    const traverseRoutes = (routes) => {
        return routes.map(async (route, index) => (
          route.routes ? (
            <Route
              key={index}
              path={route.path}
              exact
            >
              <Route
                exact
                path={route.path}
                component={await loadModule(`./pages${route.path}`)}
              />
              {traverseRoutes(route.routes)}
            </Route>
          ) : (
            <Route
              key={index}
              path={route.path}
              exact
              component={await loadModule(`./pages${route.path}`)}
            />
          )
        ));
    }
    traverseRoutes(allRoutes)
};

const App = () => {
  return (
    <React.Suspense >
      <Routes>
        <Route path='/about/about' element={<About />}></Route>
        <Route path='/' element={<Home />}></Route>
        <Route path='/about' element={<SecondAbout />}></Route>
        {/* {renderRoutes("./routes")} */}
      </Routes>
    </React.Suspense>
  );
};

export default App;