<?php
/****************************************************************************
 * Create School Endpoint (Super-admin)
 *
 * Creates a new top-level school. Super-admin only.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['school_name'] - School name (unique)
 * @output Success or error message, with the new school id
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireSuperAdmin($mysqli);

$schoolName = trim((string) ($receivedData['school_name'] ?? ''));
if ($schoolName === '') {
    send_response('School name is required.', 400);
}

$stmt = $mysqli->prepare('INSERT INTO tblschool (school_name) VALUES (?)');
if (!$stmt) {
    log_info('Create school prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare school creation.', 500);
}

$stmt->bind_param('s', $schoolName);
if (!$stmt->execute()) {
    $code = (int) ($stmt->errno ?? 0) === 1062 ? 409 : 500;
    log_info('Create school execute failed: ' . $stmt->error);
    send_response($code === 409 ? 'A school with that name already exists.' : 'Unable to create school.', $code);
}

send_response(['message' => 'School created successfully.', 'id' => $mysqli->insert_id], 200);
$stmt->close();
?>
