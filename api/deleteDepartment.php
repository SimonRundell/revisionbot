<?php
/****************************************************************************
 * Delete Department Endpoint (Super-admin)
 *
 * Deletes a department. Refuses if users are still assigned, to avoid
 * orphaning students/admins (FK would null their department_id).
 *
 * Note: owned subjects/topics/questions are a shared resource; the FK on
 * owner_department_id is ON DELETE SET NULL, so deleting a department reverts
 * its authored content to super-owned rather than destroying it.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - Department id
 * @output Success or error message
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireSuperAdmin($mysqli);

$departmentId = (int) ($receivedData['id'] ?? 0);
if ($departmentId <= 0) {
    send_response('Department id is required.', 400);
}

$check = $mysqli->prepare('SELECT COUNT(*) AS c FROM tbluser WHERE department_id = ?');
$check->bind_param('i', $departmentId);
$check->execute();
$userCount = (int) ($check->get_result()->fetch_assoc()['c'] ?? 0);
$check->close();

if ($userCount > 0) {
    send_response('Cannot delete a department that still has users. Reassign or remove them first.', 409);
}

$stmt = $mysqli->prepare('DELETE FROM tbldepartment WHERE id = ?');
if (!$stmt) {
    log_info('Delete department prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare department deletion.', 500);
}

$stmt->bind_param('i', $departmentId);
if (!$stmt->execute()) {
    log_info('Delete department execute failed: ' . $stmt->error);
    send_response('Unable to delete department.', 500);
}

send_response('Department deleted successfully.', 200);
$stmt->close();
?>
