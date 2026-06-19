<?php
/****************************************************************************
 * Delete School Endpoint (Super-admin)
 *
 * Deletes a school. Refuses if the school still has departments, to avoid
 * cascading away departments (and their users via FK SET NULL) by accident.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - School id
 * @output Success or error message
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireSuperAdmin($mysqli);

$schoolId = (int) ($receivedData['id'] ?? 0);
if ($schoolId <= 0) {
    send_response('School id is required.', 400);
}

// Guard: do not delete a school that still owns departments.
$check = $mysqli->prepare('SELECT COUNT(*) AS c FROM tbldepartment WHERE school_id = ?');
$check->bind_param('i', $schoolId);
$check->execute();
$deptCount = (int) ($check->get_result()->fetch_assoc()['c'] ?? 0);
$check->close();

if ($deptCount > 0) {
    send_response('Cannot delete a school that still has departments. Remove its departments first.', 409);
}

$stmt = $mysqli->prepare('DELETE FROM tblschool WHERE id = ?');
if (!$stmt) {
    log_info('Delete school prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare school deletion.', 500);
}

$stmt->bind_param('i', $schoolId);
if (!$stmt->execute()) {
    log_info('Delete school execute failed: ' . $stmt->error);
    send_response('Unable to delete school.', 500);
}

send_response('School deleted successfully.', 200);
$stmt->close();
?>
