// Utility function to create headers with optional authorization
export const createApiHeaders = (currentUser, additionalHeaders = {}) => {
    const headers = { ...additionalHeaders };
    
    // Only add authorization header if token exists and is not undefined
    if (currentUser?.token && currentUser.token !== 'undefined') {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    
    return headers;
};

export const createJsonHeaders = (currentUser) => {
    return createApiHeaders(currentUser, {
        'Content-Type': 'application/json'
    });
};