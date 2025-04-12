/**
 * URL validation and processing utilities
 */

/**
 * Check if a string is a valid URL
 * @param url String to check
 * @returns true if valid URL, false otherwise
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Extract the domain from a URL
 * @param url Full URL
 * @returns domain name
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return '';
  }
}

/**
 * Normalize a URL by removing tracking parameters and fragments
 * @param url URL to normalize
 * @returns Normalized URL
 */
export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    
    // Common tracking parameters to remove
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'campaign'
    ];
    
    // Remove tracking parameters
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Remove fragment unless it looks like a SPA route
    if (urlObj.hash && !urlObj.hash.includes('/')) {
      urlObj.hash = '';
    }
    
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Get base URL (protocol + domain)
 * @param url Full URL
 * @returns Base URL (e.g., https://example.com)
 */
export function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch (e) {
    return '';
  }
}

/**
 * Check if a URL is for a specific domain or subdomain
 * @param url URL to check
 * @param domain Domain to check against
 * @returns true if URL is for the domain/subdomain
 */
export function isUrlForDomain(url: string, domain: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`);
  } catch (e) {
    return false;
  }
}
