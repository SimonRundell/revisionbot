/****************************************************************************
 * API Headers Utility Module
 * 
 * Provides utility functions for creating HTTP headers with optional authorization.
 * Handles Bearer token authentication for secured API endpoints.
 * 
 * @module apiHeaders
 * @exports createApiHeaders - Creates headers with optional authorization
 * @exports createJsonHeaders - Creates JSON content-type headers with auth
 ****************************************************************************/

/**
 * Create API headers with optional Bearer token authorization
 * 
 * Adds Authorization header only if valid token exists in currentUser object.
 * Merges additional headers if provided.
 * 
 * @param {Object} currentUser - User object containing authentication token
 * @param {string} currentUser.token - Bearer token for API authentication
 * @param {Object} additionalHeaders - Optional headers to merge (default: {})
 * @returns {Object} Headers object with authorization and additional headers
 * 
 * @example
 * const headers = createApiHeaders(currentUser, {'X-Custom': 'value'});
 * // Returns: {Authorization: 'Bearer token123', 'X-Custom': 'value'}
 */
export const createApiHeaders = (currentUser, additionalHeaders = {}) => {
    const headers = { ...additionalHeaders };
    
    // Only add authorization header if token exists and is not undefined
    if (currentUser?.token && currentUser.token !== 'undefined') {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    
    return headers;
};

/**
 * Create JSON content-type headers with authorization
 * 
 * Convenience function that creates headers with Content-Type: application/json
 * and optional Bearer token authorization.
 * 
 * @param {Object} currentUser - User object containing authentication token
 * @param {string} currentUser.token - Bearer token for API authentication
 * @returns {Object} Headers with Content-Type and Authorization
 * 
 * @example
 * const headers = createJsonHeaders(currentUser);
 * // Returns: {'Content-Type': 'application/json', Authorization: 'Bearer token123'}
 */
export const createJsonHeaders = (currentUser) => {
    return createApiHeaders(currentUser, {
        'Content-Type': 'application/json'
    });
};