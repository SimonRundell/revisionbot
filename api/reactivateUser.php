<?php
/****************************************************************************
 * Reactivate User Endpoint
 *
 * Marks a user account as active so login is allowed again.
 * Restricted to administrators.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - User ID to reactivate
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

$adminUserId = requireAdmin($mysqli);
$targetUserId = (int) ($receivedData['id'] ?? 0);

if ($targetUserId <= 0) {
    send_response('A valid user id is required.', 400);
}

$stmt = $mysqli->prepare('UPDATE tbluser SET is_active = 1 WHERE id = ?');

if (!$stmt) {
    log_info('Reactivate user prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare account reactivation.', 500);
}

$stmt->bind_param('i', $targetUserId);

if (!$stmt->execute()) {
    log_info('Reactivate user execute failed: ' . $stmt->error . ' by admin ' . $adminUserId);
    send_response('Unable to reactivate this account.', 500);
}

if ($stmt->affected_rows < 1) {
    send_response('User not found or already active.', 404);
}

log_info('Reactivated user ' . $targetUserId . ' by admin ' . $adminUserId);
send_response('Account reactivated.', 200);

$stmt->close();
?>