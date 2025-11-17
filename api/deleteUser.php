<?php
/****************************************************************************
 * Delete User Endpoint (Admin)
 * 
 * Permanently deletes a user account from the system.
 * 
 * Warning:
 * - Deletion is permanent and cannot be undone
 * - May orphan student responses and statistics
 * - Consider soft delete or data export before deletion
 * - No cascade delete implemented for user data
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - No validation to prevent deleting own account
 * - Should add protection against self-deletion
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - User ID to delete (required)
 * @output Success or error message
 * 
 * @version 1.0
 * @todo Add protection against self-deletion
 * @todo Consider cascade delete for user responses
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin delete functions
requireAuth();

$query = "DELETE FROM tbluser WHERE id = ?";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

$stmt->bind_param("i", $receivedData['id']);

if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Execute failed: " . $stmt->error, 500);
} else {
    log_info("User deleted: " . $receivedData['id']);
    send_response("User deleted", 200);
} 