<?php
/****************************************************************************
 * Delete Class Endpoint (Admin)
 *
 * Deletes an unused class entry after administrator confirmation.
 * Assigned classes must be cleared or moved first, and the assignment check
 * normalizes collations so legacy and migrated class values compare safely.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - Class ID
 * @output Success or error message
 * @version 0.4.2
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireAdmin($mysqli);

$userClassColumn = 'userClass';
$columnLookupResult = $mysqli->query("SHOW COLUMNS FROM tbluser LIKE 'userClass'");
if (!$columnLookupResult || $columnLookupResult->num_rows === 0) {
    $userClassColumn = 'userLocation';
}

$classId = (int) ($receivedData['id'] ?? 0);
if ($classId <= 0) {
    send_response('A valid class id is required.', 400);
}

$lookupStmt = $mysqli->prepare('SELECT className FROM tblClass WHERE id = ? LIMIT 1');
if (!$lookupStmt) {
    log_info('Delete class lookup prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare class lookup.', 500);
}

$lookupStmt->bind_param('i', $classId);
if (!$lookupStmt->execute()) {
    log_info('Delete class lookup execute failed: ' . $lookupStmt->error);
    send_response('Unable to lookup class.', 500);
}

$result = $lookupStmt->get_result();
$classRow = $result ? $result->fetch_assoc() : null;
$lookupStmt->close();

if (!$classRow) {
    send_response('Class not found.', 404);
}

$className = (string) $classRow['className'];

$assignmentStmt = $mysqli->prepare(
    'SELECT COUNT(*) AS assignedUsers FROM tbluser WHERE ' . $userClassColumn . ' COLLATE utf8mb4_general_ci = ? COLLATE utf8mb4_general_ci'
);
if (!$assignmentStmt) {
    log_info('Delete class assignment check prepare failed: ' . $mysqli->error);
    send_response('Unable to check class assignments.', 500);
}

$assignmentStmt->bind_param('s', $className);
if (!$assignmentStmt->execute()) {
    log_info('Delete class assignment check execute failed: ' . $assignmentStmt->error);
    send_response('Unable to check class assignments.', 500);
}

$assignmentResult = $assignmentStmt->get_result();
$assignmentRow = $assignmentResult ? $assignmentResult->fetch_assoc() : ['assignedUsers' => 0];
$assignmentStmt->close();

if ((int) ($assignmentRow['assignedUsers'] ?? 0) > 0) {
    send_response('This class is assigned to one or more users. Reassign them before deleting the class.', 409);
}

$deleteStmt = $mysqli->prepare('DELETE FROM tblClass WHERE id = ?');
if (!$deleteStmt) {
    log_info('Delete class prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare class deletion.', 500);
}

$deleteStmt->bind_param('i', $classId);
if (!$deleteStmt->execute()) {
    log_info('Delete class execute failed: ' . $deleteStmt->error);
    send_response('Unable to delete class.', 500);
}

if ($deleteStmt->affected_rows < 1) {
    send_response('Class not found.', 404);
}

send_response('Class deleted successfully.', 200);
$deleteStmt->close();
?>