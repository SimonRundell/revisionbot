<?php
/****************************************************************************
 * Update School Endpoint (Super-admin)
 *
 * Renames a school or toggles its active flag. Super-admin only.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - School id
 * @input receivedData['school_name'] - New school name
 * @input receivedData['is_active'] - Optional 0/1 active flag
 * @output Success or error message
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireSuperAdmin($mysqli);

$schoolId = (int) ($receivedData['id'] ?? 0);
$schoolName = trim((string) ($receivedData['school_name'] ?? ''));
$isActive = isset($receivedData['is_active']) ? (int) (!!$receivedData['is_active']) : 1;

if ($schoolId <= 0 || $schoolName === '') {
    send_response('School id and name are required.', 400);
}

$stmt = $mysqli->prepare('UPDATE tblschool SET school_name = ?, is_active = ? WHERE id = ?');
if (!$stmt) {
    log_info('Update school prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare school update.', 500);
}

$stmt->bind_param('sii', $schoolName, $isActive, $schoolId);
if (!$stmt->execute()) {
    $code = (int) ($stmt->errno ?? 0) === 1062 ? 409 : 500;
    log_info('Update school execute failed: ' . $stmt->error);
    send_response($code === 409 ? 'A school with that name already exists.' : 'Unable to update school.', $code);
}

send_response('School updated successfully.', 200);
$stmt->close();
?>
