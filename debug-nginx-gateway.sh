#!/bin/bash

echo "=== Debugging Bad Gateway Issue ==="
echo ""

# Check PM2 status
echo "1. PM2 Status:"
pm2 status

echo ""
echo "2. Application Details:"
pm2 show intranet-app

echo ""
echo "3. Check if app is listening on correct port:"
netstat -tlnp | grep :3000 || echo "   ❌ App not listening on port 3000"

echo ""
echo "4. Test direct connection to app:"
curl -I http://localhost:3000/api/health-check 2>/dev/null && echo "   ✅ App responds directly" || echo "   ❌ App not responding on localhost:3000"

echo ""
echo "5. Check nginx status:"
sudo systemctl status nginx --no-pager

echo ""
echo "6. Check nginx configuration:"
echo "Current nginx config for intranet:"
sudo cat /etc/nginx/sites-available/intranet 2>/dev/null || echo "   ❌ No nginx config found at /etc/nginx/sites-available/intranet"

echo ""
echo "7. Check nginx error logs:"
echo "Last 10 nginx errors:"
sudo tail -10 /var/log/nginx/error.log 2>/dev/null || echo "   No nginx error log found"

echo ""
echo "8. Check if port 3000 is in use:"
lsof -i :3000 2>/dev/null || echo "   Nothing listening on port 3000"

echo ""
echo "=== Quick Fixes ==="
echo ""
echo "If app is running but nginx shows bad gateway:"
echo "1. Check nginx config points to correct port (3000)"
echo "2. Restart nginx: sudo systemctl restart nginx"
echo "3. Check PM2 logs: pm2 logs intranet-app --lines 20"
echo ""
echo "If app not on port 3000:"
echo "1. Check ecosystem.config.js or PM2 config"
echo "2. Restart PM2: pm2 restart intranet-app"
echo ""
echo "Common nginx config for port 3000:"
echo "upstream intranet {"
echo "    server 127.0.0.1:3000;"
echo "}"