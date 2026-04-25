<?php
/**
 * Simple API Security Helper
 * Blocks obvious direct browser access while allowing legitimate API calls
 */

/**
 * Check if this appears to be a legitimate API call
 */
function isLegitimateApiCall() {
    // Must be POST request (not GET from browser address bar)
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return false;
    }
    
    // Must have JSON content type (set by axios/fetch) OR multipart form data (for file uploads)
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') === false && 
        strpos($contentType, 'multipart/form-data') === false) {
        return false;
    }
    
    return true;
}

/**
 * Block direct browser access
 */
function blockDirectAccess() {
    if (!isLegitimateApiCall()) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'API access only - direct browser access not allowed']);
        exit;
    }
}

/**
 * Enhanced security for sensitive endpoints
 * TODO: Implement proper JWT token validation when ready
 * For now, just ensure it's a proper API call
 */
function requireAuth() {
    blockDirectAccess();
    
    // Token validation is currently disabled
    // In future, add JWT validation here:
    // - Extract token from Authorization header
    // - Validate JWT signature and expiration
    // - Check user permissions
    
    return true;
}
?>