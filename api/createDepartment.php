<?php
/****************************************************************************
 * Create Department Endpoint (Super-admin)
 *
 * Creates a department under a school. Super-admin only.
 * The Gemini key is set separately via setDepartmentGeminiKey.php.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['school_id'] - Parent school id
 * @input receivedData['department_name'] - Department name (unique per school)
 * @output Success or error message, with the new department id
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireSuperAdmin($mysqli);

$schoolId = (int) ($receivedData['school_id'] ?? 0);
$departmentName = trim((string) ($receivedData['department_name'] ?? ''));

if ($schoolId <= 0 || $departmentName === '') {
    send_response('School id and department name are required.', 400);
}

// Verify the parent school exists.
$check = $mysqli->prepare('SELECT id FROM tblschool WHERE id = ? LIMIT 1');
$check->bind_param('i', $schoolId);
$check->execute();
if (!$check->get_result()->fetch_assoc()) {
    send_response('Parent school not found.', 404);
}
$check->close();

$stmt = $mysqli->prepare('INSERT INTO tbldepartment (school_id, department_name) VALUES (?, ?)');
if (!$stmt) {
    log_info('Create department prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare department creation.', 500);
}

$stmt->bind_param('is', $schoolId, $departmentName);
if (!$stmt->execute()) {
    $code = (int) ($stmt->errno ?? 0) === 1062 ? 409 : 500;
    log_info('Create department execute failed: ' . $stmt->error);
    send_response($code === 409 ? 'That department already exists in this school.' : 'Unable to create department.', $code);
}

send_response(['message' => 'Department created successfully.', 'id' => $mysqli->insert_id], 200);
$stmt->close();
?>
