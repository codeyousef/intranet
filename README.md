# Flyadeal Intranet

A modern, glassmorphism-styled intranet portal for Flyadeal built with Next.js 15, TypeScript, Tailwind CSS, and Microsoft authentication.

## Features

- 🎨 **Modern Design**: Glassmorphism UI with Flyadeal brand colors
- 🔐 **Microsoft Authentication**: Secure login with Azure AD
- 📊 **Power BI Integration**: Embedded dashboards and reports
- 📱 **Responsive**: Works on desktop, tablet, and mobile
- 🎯 **TypeScript**: Full type safety

## Brand Colors

- **Primary**: Purple (#522D6D), Yellow (#D7D800), White (#FFFFFF)
- **Secondary**: Dark Blue (#1877B8), Light Blue (#2CB3E2), Pink (#B33288), Red-Pink (#E74D66)
- **Accent**: Red (#E74735), Orange (#F39E5C), Green (#177D44)
- **Font**: Raleway

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Azure AD application registration
- Power BI Pro account (for dashboard integration)

## Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.local.example .env.local
```

3. Configure your `.env.local` file with:
   - Azure AD credentials
   - Power BI credentials  
   - NextAuth secret

## Netskope Proxy Bypass (Development)

If you're using Netskope GoScope proxy that forces HTTPS redirects on localhost:

### Option 1: Use Different Port
```bash
npm run dev -- -p 3001
```

### Option 2: Configure Netskope Bypass
Add localhost to your Netskope bypass list or use:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
npm run dev
```

### Option 3: Use Local Domain
Add to your `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):
```
127.0.0.1 local.flyadeal.dev
```

Then update your `.env.local`:
```
NEXTAUTH_URL=http://local.flyadeal.dev:3000
```

And run:
```bash
npm run dev
```

Access via: http://local.flyadeal.dev:3000

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Azure AD Setup

1. Register a new application in Azure Portal
2. Add redirect URI: `http://localhost:3000/api/auth/callback/azure-ad`
3. Generate client secret
4. Note down Client ID, Client Secret, and Tenant ID

## Power BI Setup

1. Register app in Azure AD for Power BI access
2. Grant Power BI Service permissions
3. Configure service principal access in Power BI Admin Portal
4. Add credentials to `.env.local`

## Project Structure

```
src/
├── app/                    # Next.js 13+ app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── ...               # Feature components
├── lib/                  # Utility libraries
└── types/               # TypeScript type definitions
```

## Deployment

The app is ready for deployment on Vercel, Netlify, or any Node.js hosting platform. Make sure to:

1. Set all environment variables in your hosting platform
2. Update `NEXTAUTH_URL` to your production domain
3. Update Azure AD redirect URIs for production

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Test authentication flow before submitting PRs
4. Ensure responsive design works on all devices

## License

Private - Flyadeal Internal Use Only