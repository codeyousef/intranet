# Power BI Service Principal Setup Guide

## Current Issue
Your Azure app can get tokens but can't access Power BI reports. This means the service principal needs to be enabled in Power BI.

## Debug Your Connection
Visit: `https://172.22.58.184:8443/api/powerbi/debug`

This will show exactly where the connection is failing.

## Solution 1: Enable Service Principal in Power BI Admin Portal

### Step 1: Access Power BI Admin Portal
1. Go to https://app.powerbi.com
2. Click the gear icon (⚙️) in top right
3. Select "Admin portal"

### Step 2: Enable Service Principal Access
1. Go to "Tenant settings"
2. Find "Developer settings" section
3. Enable "Service principals can use Power BI APIs"
4. Add your app ID: `a1d4e237-dc24-4670-98fa-7a8bb45e5fca`
5. Click "Apply"

### Step 3: Add to Workspace (if needed)
1. Go to your workspace containing the report
2. Click "Access" or "Manage access"
3. Add your app ID as a "Member" or "Admin"

## Solution 2: Alternative - Use Delegated Permissions

If you can't access Admin Portal, try this approach:

### Update Azure App Permissions
1. Go to Azure Portal → App registrations
2. Find your app: `a1d4e237-dc24-4670-98fa-7a8bb45e5fca`
3. Go to "API permissions"
4. Remove current Power BI permissions
5. Add these delegated permissions:
   - `Dataset.Read.All`
   - `Report.Read.All`
   - `Workspace.Read.All`
6. Grant admin consent

### Update Code for Delegated Flow
This would use the user's own permissions instead of service principal.

## Solution 3: Direct Dataset Access

If reports API doesn't work, try accessing the dataset directly:

### Get Dataset ID
1. Go to Power BI service
2. Open your report
3. URL will show dataset ID: `/groups/{workspace}/reports/{report}/ReportSection?datasetId={DATASET_ID}`

### Use Dataset API
```
GET https://api.powerbi.com/v1.0/myorg/datasets/{datasetId}/tables
```

## Current Configuration
- ✅ App ID: a1d4e237-dc24-4670-98fa-7a8bb45e5fca
- ✅ Tenant ID: 6b8805cf-83d0-4342-bd38-fb3b3df952be
- ✅ Client Secret: Configured
- ❌ Service Principal: Needs enabling

## Next Steps
1. Run debug endpoint to see exact error
2. Enable service principal in Power BI Admin Portal
3. If no admin access, try delegated permissions approach
4. Test again with `/api/powerbi/test`

## Alternative: Mock Data for Demo
If Power BI setup is complex, I can create mock data that looks like your Power BI data for demonstration purposes.