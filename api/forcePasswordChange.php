<?php
/****************************************************************************
 * Force Password Change Endpoint
 * 
 * Marks a target account so the next login requires a password update.
 * Restricted to administrators.
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - User ID to flag
 * @output Success or error message
 * @version 0.4.1
 ****************************************************************************/

require_once 'simple_security.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Authorization, X-Requested-With');
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

include 'setup.php';

$authenticatedUser = requireAdmin($mysqli);
$targetUserId = (int) ($receivedData['id'] ?? 0);

if ($targetUserId <= 0) {
    send_response('A valid user id is required.', 400);
}

$stmt = $mysqli->prepare('UPDATE tbluser SET force_pw_change = 1 WHERE id = ?');

if (!$stmt) {
    log_info('Force password change prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare password change enforcement.', 500);
}

$stmt->bind_param('i', $targetUserId);

if (!$stmt->execute()) {
    log_info('Force password change execute failed: ' . $stmt->error . ' by admin ' . $authenticatedUser['id']);
    send_response('Unable to require a password change for this account.', 500);
}

if ($stmt->affected_rows < 1) {
    send_response('User not found.', 404);
}

log_info('Forced password change for user ' . $targetUserId . ' by admin ' . $authenticatedUser['id']);
send_response('Password change will be required on next login.', 200);

$stmt->close();
?>