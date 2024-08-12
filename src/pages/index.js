import React from 'react';

export const Home = ({children}) => (
  <div>
    <h1>Home</h1>
    <p>A simple SSG Site with React</p>
    {children}
  </div>
);

export default Home;