<?php
/****************************************************************************
 * API Directory Protection
 * 
 * Prevents directory browsing of the /api folder while allowing
 * access to individual API endpoints.
 * 
 * This file is served when users navigate directly to /api/ directory,
 * returning a 403 Forbidden status to prevent file/folder listings.
 * 
 * Security:
 * - Blocks directory enumeration
 * - Does not interfere with API endpoint access
 * - Returns HTML error page for browser requests
 * 
 * @version 1.0
 * @updated 2025-11-17 - Created for directory protection
 ****************************************************************************/

// Prevent directory browsing
http_response_code(403);
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>403 Forbidden</title>
</head>
<body>
    <h1>403 Forbidden</h1>
    <p>Access to this directory is not allowed.</p>
</body>
</html>
