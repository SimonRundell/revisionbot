<?php
/****************************************************************************
 * User Authentication Endpoint
 * 
 * Authenticates users by email and password hash.
 * Returns user data if credentials are valid.
 * 
 * Security:
 * - Protected by blockDirectAccess() - POST with JSON only
 * - Password already hashed on client side
 * - Case-insensitive email matching
 * - Returns all user fields including admin status
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['email'] - User email address
 * @input receivedData['passwordHash'] - SHA-256 hashed password
 * @output JSON array with user data or error message
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access (but allow legitimate login attempts)
blockDirectAccess();

$query = "SELECT * FROM tbluser WHERE LOWER(email) = LOWER(?) AND passwordHash = ?";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

$stmt->bind_param("ss", $receivedData['email'], $receivedData['passwordHash']);

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