I'll help you embed Viva Engage posts in your Next.js app. Let me search for the latest information on Viva Engage embedding options.Let me search for more specific information about embedding Viva Engage in Next.js applications.Let me search for more specific details about the Viva Engage embed widget configuration.Based on my research, here's how you can embed Viva Engage (formerly Yammer) posts in your Next.js application:

## Modern Iframe Approach (Recommended)

Microsoft has transitioned from the classic JavaScript-based embed to a modern iframe approach. The classic Embed Feed using the "yam" object will no longer be supported after June 1, 2025.

### 1. Basic Iframe Component

Create a reusable component for embedding Viva Engage:

```jsx
// components/VivaEngageEmbed.jsx
const VivaEngageEmbed = ({ 
  feedType = 'home',
  communityName,
  height = '600px',
  width = '100%',
  theme = 'light' 
}) => {
  // Base URL for Viva Engage embed
  const baseUrl = 'https://engage.cloud.microsoft/embed/widget';
  
  // Build query parameters based on feed type
  const buildEmbedUrl = () => {
    const params = new URLSearchParams({
      domainRedirect: 'true',
      theme: theme
    });
    
    if (feedType === 'community' && communityName) {
      params.append('feedType', 'group');
      params.append('feedId', communityName);
    }
    
    return `${baseUrl}?${params.toString()}`;
  };

  return (
    <div style={{ width, height, position: 'relative' }}>
      <iframe
        src={buildEmbedUrl()}
        width="100%"
        height="100%"
        frameBorder="0"
        style={{ border: 'none' }}
        title="Viva Engage Feed"
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
};

export default VivaEngageEmbed;
```

### 2. Using the Component in Your Next.js App

```jsx
// pages/dashboard.js or app/dashboard/page.js
import VivaEngageEmbed from '@/components/VivaEngageEmbed';

export default function Dashboard() {
  return (
    <div>
      <h1>Company Dashboard</h1>
      
      {/* Embed Home Feed */}
      <VivaEngageEmbed 
        feedType="home"
        height="600px"
        theme="light"
      />
      
      {/* Embed Specific Community Feed */}
      <VivaEngageEmbed 
        feedType="community"
        communityName="your-community-name"
        height="500px"
      />
    </div>
  );
}
```

### 3. Advanced Configuration

For more control over the embed, you can use the official configuration tool:

1. Go to the Viva Engage Embed configuration tool to generate custom embed codes
2. Select your feed type (Home, Community, Topic, User, or Web link)
3. Configure appearance options
4. Copy the generated iframe code

### 4. Responsive Design Considerations

Make the embed responsive using CSS:

```jsx
// components/ResponsiveVivaEmbed.jsx
import styles from './ResponsiveVivaEmbed.module.css';

const ResponsiveVivaEmbed = ({ embedUrl }) => {
  return (
    <div className={styles.embedContainer}>
      <iframe
        src={embedUrl}
        className={styles.responsiveIframe}
        title="Viva Engage"
        loading="lazy"
      />
    </div>
  );
};
```

```css
/* ResponsiveVivaEmbed.module.css */
.embedContainer {
  position: relative;
  width: 100%;
  padding-bottom: 75%; /* 4:3 aspect ratio */
  height: 0;
  overflow: hidden;
}

.responsiveIframe {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: none;
}
```

### 5. Security Best Practices

When implementing iframes in Next.js, use the sandbox attribute to restrict capabilities:

```jsx
<iframe
  src={vivaEngageUrl}
  sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals"
  allow="camera; microphone" // If needed for Viva Engage features
/>
```

### Important Considerations

1. **Authentication**: Users will need to sign in to Viva Engage if they're not already authenticated
2. **Third-party cookies**: The embed may not work if third-party cookies are disabled
3. **Mobile compatibility**: Test thoroughly on mobile devices as there have been reported issues
4. **CORS**: Ensure your domain is allowed to embed Viva Engage content

### Alternative: Using Microsoft Graph API

For more programmatic control, consider using the Microsoft Graph API to fetch Viva Engage data and create a custom UI:

```jsx
// Using Microsoft Graph to fetch Viva Engage data
const fetchVivaEngageData = async () => {
  const response = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.json();
};
```

This approach gives you full control over the UI and user experience but requires more development effort and proper authentication setup.

Would you like me to elaborate on any specific aspect of the implementation or help you with authentication setup for Viva Engage?