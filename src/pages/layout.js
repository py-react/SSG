import React from 'react';

export const Layout = ({ title,scripts, children }) => (
  <html>
    <head>
      <title>{title}</title>
      {scripts?.map(script=>(
        <script key={script} src={`/static/${script}`} defer ></script>
      ))}
    </head>
    <body>
      <div id="root">
        {children}
      </div>
    </body>
  </html>
);

export default Layout;