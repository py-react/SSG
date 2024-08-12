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
      <main id="root">
        {children}
      </main>
    </body>
  </html>
);

export default Layout;