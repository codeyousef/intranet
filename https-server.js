const { createServer } = require('https')
const { parse } = require('url')
const next = require('next')
const fs = require('fs')
const path = require('path')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = process.env.PORT || 8443
const nextPort = process.env.NEXT_PORT || 3001

// Prepare the Next.js app
const app = next({ dev, hostname, port: nextPort })
const handle = app.getRequestHandler()

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'localhost.crt')),
}

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      // Add CORS headers - restrict to specific origin
      const origin = req.headers.origin;
      const allowedOrigins = ['https://172.22.58.184:8443', 'http://localhost:3001'];
      
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle OPTIONS method for preflight requests
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      // Parse the URL
      const parsedUrl = parse(req.url, true)

      // Special handling for 4-auth-msal.js
      if (parsedUrl.pathname === '/4-auth-msal.js') {
        try {
          const filePath = path.join(__dirname, 'public', '4-auth-msal.js');
          const content = fs.readFileSync(filePath, 'utf8');
          res.setHeader('Content-Type', 'application/javascript');
          res.statusCode = 200;
          res.end(content);
          return;
        } catch (err) {
          console.error('Error serving 4-auth-msal.js:', err);
          // Fall through to normal handling if there's an error
        }
      }

      // Handle the request
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })
  .once('error', (err) => {
    console.error(err)
    process.exit(1)
  })
  .listen(port, hostname, () => {
    console.log(`> Ready on https://${hostname}:${port}`)
  })
})
