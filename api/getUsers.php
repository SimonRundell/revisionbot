<?php
/****************************************************************************
 * Get Users Endpoint (Admin)
 * 
 * Admin endpoint that retrieves all user accounts.
 * Used in user management interfaces for viewing and editing users.
 * 
 * Returns sensitive data including:
 * - Email addresses
 * - Password hashes
 * - User status and roles
 * - Location and locale settings
 * - Admin flags
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Contains highly sensitive user data
 * - Should not be accessible to regular users
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @output JSON array of all users with complete data
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to sensitive user data
requireAuth();

$query = "SELECT * FROM tbluser";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Execute failed: " . $stmt->error, 500);
}

$result = $stmt->get_result();

if ($result) {
    $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
    $json = json_encode($rows);
    send_response($json, 200);
} else {
    log_info("Query failed: " . $mysqli->error);
    send_response("Query failed: " . $mysqli->error, 500);
}