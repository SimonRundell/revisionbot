<?php
/****************************************************************************
 * Update User Endpoint (Admin)
 * 
 * Updates existing user account details.
 * Allows modification of all user fields including admin status and access control.
 * 
 * Updatable fields:
 * - Email address (converted to lowercase)
 * - User name
 * - Password hash
 * - Location/department
 * - Locale preference
 * - Admin flag
 * - Avatar identifier
 * - User access JSON (subject/topic permissions)
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Email uniqueness enforced by database
 * - Can change user passwords and admin status
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - User ID (required)
 * @input receivedData['email'] - Updated email
 * @input receivedData['userName'] - Updated name
 * @input receivedData['passwordHash'] - Updated password hash
 * @input receivedData['userLocation'] - Updated location
 * @input receivedData['userLocale'] - Updated locale
 * @input receivedData['admin'] - Admin flag (0 or 1)
 * @input receivedData['avatar'] - Avatar identifier
 * @input receivedData['userAccess'] - Access control JSON
 * @output Success or error message
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin update functions
requireAuth();

$query = "UPDATE tbluser SET email=?, 
                             userName=?, 
                             passwordHash=?,
                             userLocation=?, 
                             userLocale=?,
                             admin=?,
                             avatar=?,
                             userAccess=? WHERE id=?
          ";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("User update prepare failed: " . $mysqli->error);
    send_response("User update prepare failed: " . $mysqli->error, 500);
} else {
    $emailLower = strtolower($receivedData['email']);
    $stmt->bind_param("ssssssssi", $emailLower,
                             $receivedData['userName'],
                             $receivedData['passwordHash'],
                             $receivedData['userLocation'],
                             $receivedData['userLocale'],
                             $receivedData['admin'],
                             $receivedData['avatar'],
                             $receivedData['userAccess'],
                             $receivedData['id']);    
if (!$stmt->execute()) {
        log_info("Execute failed: " . $stmt->error);
        send_response("User update failed: " . $stmt->error, 500);
    } else {
        log_info("User successfully updated: " . $emailLower);
        send_response("User successfully updated", 200);
    }
}

$stmt->close();
?>
