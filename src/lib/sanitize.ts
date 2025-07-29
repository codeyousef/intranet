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
      'class', 'id', 'style', 'target', 'rel'
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
    return DOMPurify.sanitize(dirty, config);
  }

  return clean.toString();
}

/**
 * Create a sanitized HTML object for use with dangerouslySetInnerHTML
 * @param html - The HTML string to sanitize
 * @returns Object with __html property containing sanitized HTML
 */
export function createSanitizedMarkup(html: string): { __html: string } {
  return { __html: sanitizeHtml(html) };
}
