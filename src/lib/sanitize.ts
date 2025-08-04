import DOMPurify from 'isomorphic-dompurify';

// Initialize DOMPurify hooks once when the module is loaded
if (typeof window !== 'undefined') {
  DOMPurify.addHook('afterSanitizeAttributes', function(node) {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - The HTML string to sanitize
 * @param options - Optional DOMPurify configuration
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(dirty: string, options?: any): string {
  // Configure DOMPurify with safe defaults
  const config = {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'strong', 'em', 'u', 'i', 'b',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
      'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'section', 'article', 'header', 'footer',
      'nav', 'aside', 'figure', 'figcaption'
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'width', 'height',
      'class', 'id', 'style', 'target', 'rel',
      'loading', 'decoding', 'sandbox', 'referrerpolicy'
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    KEEP_CONTENT: true,
    ADD_TAGS: ['iframe'], // Allow iframes for embedded content
    ADD_ATTR: ['frameborder', 'allowfullscreen'],
    // Ensure target="_blank" links have rel="noopener noreferrer"
    RETURN_TRUSTED_TYPE: false,
    ...options
  };

  const clean = DOMPurify.sanitize(dirty, config);

  // When on the client side, we've already added the hook at module load time
  // so we just need to sanitize the HTML
  if (typeof window !== 'undefined') {
    return DOMPurify.sanitize(dirty, config).toString();
  }

  return clean.toString();
}

/**
 * Create a sanitized HTML object for use with dangerouslySetInnerHTML
 * @param html - The HTML string to sanitize
 * @returns Object with __html property containing sanitized HTML
 */
export function createSanitizedMarkup(html: string): { __html: string } {
  try {
    // Additional pre-processing to handle common HTML issues that cause React errors
    let processedHtml = html;

    // Fix common malformed HTML issues
    // Remove or fix unclosed comments
    processedHtml = processedHtml.replace(/<!--(?![\s\S]*?-->)[\s\S]*$/g, '');

    // Fix self-closing tags that aren't properly closed for React
    const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];
    selfClosingTags.forEach(tag => {
      // Convert HTML-style self-closing tags to XHTML-style for React
      const regex = new RegExp(`<${tag}([^>]*?)(?<!/)>`, 'gi');
      processedHtml = processedHtml.replace(regex, `<${tag}$1 />`);
    });

    // Remove any remaining unclosed tags at the end
    processedHtml = processedHtml.replace(/<[^>]*$/, '');

    // Fix common attribute issues
    // Ensure all attributes have values
    processedHtml = processedHtml.replace(/(\s)([a-z][a-z0-9\-_]*)(?=[\s>])(?!\s*=)/gi, '$1$2=""');

    // Fix unquoted attribute values
    processedHtml = processedHtml.replace(/=([^\s"][^\s>]*)/gi, '="$1"');

    // Remove any JavaScript event handlers that might cause issues
    processedHtml = processedHtml.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

    const sanitized = sanitizeHtml(processedHtml);

    // Final validation - if the sanitized HTML is empty or just whitespace, provide fallback
    if (!sanitized || sanitized.trim().length === 0) {
      console.warn('Newsletter HTML sanitization resulted in empty content, using fallback');
      return { 
        __html: '<div class="newsletter-fallback"><p>Newsletter content could not be displayed properly. Please try refreshing the page.</p></div>' 
      };
    }

    return { __html: sanitized };
  } catch (error) {
    console.error('Error in createSanitizedMarkup:', error);
    // Return a safe fallback if sanitization fails
    return { 
      __html: '<div class="newsletter-error"><p>There was an error processing the newsletter content. Please try refreshing the page.</p></div>' 
    };
  }
}
