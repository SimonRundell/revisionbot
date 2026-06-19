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

// Admin only. A department admin sees only their own department's users;
// the super-admin sees everyone. Never expose password hashes.
requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);
$isSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;

// Explicit column list: passwordHash is deliberately excluded.
$columns = 'id, email, userName, userClass, department_id, userAccess, userStatus, '
    . 'userLocale, avatar, admin, is_super_admin, userEmailValidated, is_active, '
    . 'force_pw_change, last_pw_change';

if ($isSuper) {
    $stmt = $mysqli->prepare("SELECT $columns FROM tbluser ORDER BY id ASC");
} else {
    $stmt = $mysqli->prepare("SELECT $columns FROM tbluser WHERE department_id = ? ORDER BY id ASC");
    $callerDept = (int) ($caller['department_id'] ?? 0);
    $stmt->bind_param('i', $callerDept);
}

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Unable to fetch users.", 500);
}

if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Unable to fetch users.", 500);
}

$result = $stmt->get_result();
$rows = $result ? mysqli_fetch_all($result, MYSQLI_ASSOC) : [];
send_response(json_encode($rows), 200);
$stmt->close();