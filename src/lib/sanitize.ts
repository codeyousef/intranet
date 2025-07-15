import DOMPurify from 'isomorphic-dompurify';

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

  // Additional safety: Add rel="noopener noreferrer" to external links
  if (typeof window !== 'undefined') {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = clean.toString();
    const links = tempDiv.querySelectorAll('a[target="_blank"]');
    links.forEach(link => {
      link.setAttribute('rel', 'noopener noreferrer');
    });
    return tempDiv.innerHTML;
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