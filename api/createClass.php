<?php
/****************************************************************************
 * Create Class Endpoint (Admin)
 *
 * Creates a new class entry for manual student class assignment.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['className'] - Class name
 * @output Success or error message
 * @version 0.4.1
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireAdmin($mysqli);

$className = trim((string) ($receivedData['className'] ?? ''));
if ($className === '') {
    send_response('Class name is required.', 400);
}

$stmt = $mysqli->prepare('INSERT INTO tblClass (className) VALUES (?)');
if (!$stmt) {
    log_info('Create class prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare class creation.', 500);
}

$stmt->bind_param('s', $className);
if (!$stmt->execute()) {
    $code = (int) ($stmt->errno ?? 0) === 1062 ? 409 : 500;
    log_info('Create class execute failed: ' . $stmt->error);
    send_response($code === 409 ? 'That class already exists.' : 'Unable to create class.', $code);
}

send_response('Class created successfully.', 200);
$stmt->close();
?>