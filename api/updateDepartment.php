<?php
/****************************************************************************
 * Update Department Endpoint (Super-admin)
 *
 * Renames a department or toggles its active flag. Super-admin only.
 * Moving a department between schools is intentionally not supported here.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - Department id
 * @input receivedData['department_name'] - New department name
 * @input receivedData['is_active'] - Optional 0/1 active flag
 * @output Success or error message
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireSuperAdmin($mysqli);

$departmentId = (int) ($receivedData['id'] ?? 0);
$departmentName = trim((string) ($receivedData['department_name'] ?? ''));
$isActive = isset($receivedData['is_active']) ? (int) (!!$receivedData['is_active']) : 1;

if ($departmentId <= 0 || $departmentName === '') {
    send_response('Department id and name are required.', 400);
}

$stmt = $mysqli->prepare('UPDATE tbldepartment SET department_name = ?, is_active = ? WHERE id = ?');
if (!$stmt) {
    log_info('Update department prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare department update.', 500);
}

$stmt->bind_param('sii', $departmentName, $isActive, $departmentId);
if (!$stmt->execute()) {
    $code = (int) ($stmt->errno ?? 0) === 1062 ? 409 : 500;
    log_info('Update department execute failed: ' . $stmt->error);
    send_response($code === 409 ? 'That department already exists in this school.' : 'Unable to update department.', $code);
}

send_response('Department updated successfully.', 200);
$stmt->close();
?>
