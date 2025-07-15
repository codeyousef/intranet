#!/bin/bash

echo "=== Flyadeal Intranet Production Fix Script ==="
echo ""

# 1. First, let's clear the PM2 logs
echo "1. Clearing PM2 logs..."
pm2 flush

# 2. Create a rate limit debug script
cat > /home/ubuntu/intranet/check-rate-limit.js << 'EOF'
const http = require('http');

console.log('Starting rate limit debug server on port 3002...');

const server = http.createServer((req, res) => {
  console.log('\n=== New Request ===');
  console.log('Time:', new Date().toISOString());
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Remote Address:', req.connection.remoteAddress);
  console.log('Headers:');
  console.log('  x-forwarded-for:', req.headers['x-forwarded-for']);
  console.log('  x-real-ip:', req.headers['x-real-ip']);
  console.log('  host:', req.headers.host);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    remoteAddress: req.connection.remoteAddress,
    headers: {
      'x-forwarded-for': req.headers['x-forwarded-for'],
      'x-real-ip': req.headers['x-real-ip'],
      'x-forwarded-proto': req.headers['x-forwarded-proto']
    }
  }, null, 2));
});

server.listen(3002, () => {
  console.log('Debug server running on http://localhost:3002');
  console.log('Test with: curl http://localhost:3002/test');
});
EOF

# 3. Update nginx config to ensure proper header forwarding
echo ""
echo "2. Updating nginx configuration..."
cat > /tmp/nginx-intranet.conf << 'EOF'
server {
    listen 80;
    server_name 10.152.8.77;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name 10.152.8.77;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Important: Set real IP from nginx
    set_real_ip_from 0.0.0.0/0;
    real_ip_header X-Real-IP;
    real_ip_recursive on;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        
        # Critical: Forward the actual client IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Trust headers from proxy
        proxy_set_header X-Original-IP $remote_addr;
        
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for debugging
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

echo "New nginx config saved to /tmp/nginx-intranet.conf"
echo "To apply: sudo cp /tmp/nginx-intranet.conf /etc/nginx/sites-available/intranet"
echo ""

# 4. Create environment check script
echo "3. Creating environment check script..."
cat > /home/ubuntu/intranet/check-env.js << 'EOF'
console.log('=== Environment Check ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');
console.log('AZURE_AD_CLIENT_ID:', process.env.AZURE_AD_CLIENT_ID);
console.log('AZURE_AD_TENANT_ID:', process.env.AZURE_AD_TENANT_ID);
console.log('AZURE_AD_CLIENT_SECRET:', process.env.AZURE_AD_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('');

// Check if .env.local exists
const fs = require('fs');
if (fs.existsSync('.env.local')) {
  console.log('.env.local file exists');
  const content = fs.readFileSync('.env.local', 'utf8');
  const lines = content.split('\n');
  console.log('Environment variables found:');
  lines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=');
      console.log(' -', key);
    }
  });
} else {
  console.log('WARNING: .env.local file not found!');
}
EOF

# 5. Fix the auth scope issue
echo ""
echo "4. Fixing OAuth scope issue..."
cat > /home/ubuntu/intranet/fix-auth-scope.patch << 'EOF'
--- a/src/lib/auth.ts
+++ b/src/lib/auth.ts
@@ -17,7 +17,7 @@ export const authOptions: NextAuthOptions = {
       tenantId: process.env.AZURE_AD_TENANT_ID!,
       authorization: {
         params: {
-          scope: 'openid profile email offline_access https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Report.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Group.Read.All https://graph.microsoft.com/User.Read.All'
+          scope: 'openid profile email offline_access'
         }
       }
     }),
@@ -109,7 +109,7 @@ export const authOptions: NextAuthOptions = {
               client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
               grant_type: 'refresh_token',
               refresh_token: token.refreshToken as string,
-              scope: 'openid profile email offline_access https://analysis.windows.net/powerbi/api/Dataset.Read.All https://analysis.windows.net/powerbi/api/Report.Read.All https://graph.microsoft.com/Sites.Read.All https://graph.microsoft.com/Files.Read.All https://graph.microsoft.com/Group.Read.All https://graph.microsoft.com/User.Read.All',
+              scope: 'openid profile email offline_access',
             }),
           })
EOF

echo ""
echo "=== Next Steps ==="
echo "1. Run the environment check:"
echo "   cd /home/ubuntu/intranet && node check-env.js"
echo ""
echo "2. Apply nginx configuration:"
echo "   sudo cp /tmp/nginx-intranet.conf /etc/nginx/sites-available/intranet"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo ""
echo "3. Test IP detection (in another terminal):"
echo "   node /home/ubuntu/intranet/check-rate-limit.js"
echo "   # Then from your browser or curl: http://10.152.8.77:3002/test"
echo ""
echo "4. Apply the auth scope fix:"
echo "   cd /home/ubuntu/intranet"
echo "   patch -p1 < fix-auth-scope.patch"
echo ""
echo "5. Rebuild and restart:"
echo "   npm run build"
echo "   pm2 restart intranet-app"
echo ""
echo "6. Monitor logs:"
echo "   pm2 logs intranet-app"