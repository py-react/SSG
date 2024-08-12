import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from "./app";

function handleHydrationError(error,errorInfo){
    console.error({error,errorInfo})
    throw new Error(error)
}
hydrateRoot(document.getElementById('root'),<BrowserRouter><App/></BrowserRouter>,{onRecoverableError:handleHydrationError});

