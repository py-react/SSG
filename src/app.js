import React from "react";
import { Route, Routes } from "react-router-dom";
import { routes } from "./routes";
import { Outlet } from "react-router-dom";

const renderRoutes = (routeConfig) => {
  return (
    <React.Fragment>
      {routeConfig.map((route, index) => (
        <Route key={index} path={route.path} element={<Outlet/>}>
          <Route index element={route.element}/>
          <React.Fragment>
            {route.children && renderRoutes(route.children)}
          </React.Fragment>
        </Route>
      ))}
    </React.Fragment>
  );
};

const App = () => {
  return (
    <Routes>
      <React.Fragment>{renderRoutes(routes)}</React.Fragment>
    </Routes>
  );
};

export default App;
