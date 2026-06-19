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

// Admin only; a department admin may only delete users in their own department.
requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);

$targetUserId = (int) ($receivedData['id'] ?? 0);
if ($targetUserId <= 0) {
    send_response('A valid user id is required.', 400);
}

if ($targetUserId === (int) $caller['id']) {
    send_response('You cannot delete your own account.', 400);
}

$targetDepartmentId = lookupUserDepartmentId($mysqli, $targetUserId);
if (!callerActsOnDepartment($caller, $targetDepartmentId)) {
    send_response('You are not allowed to delete this account.', 403);
}

$query = "DELETE FROM tbluser WHERE id = ?";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

$stmt->bind_param("i", $targetUserId);

if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Execute failed: " . $stmt->error, 500);
} else {
    log_info("User deleted: " . $receivedData['id']);
    send_response("User deleted", 200);
} 