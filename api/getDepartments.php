<?php
/****************************************************************************
 * Get Departments Endpoint
 *
 * Super-admin: returns all departments (optionally filtered by school_id).
 * Department admin: returns only their own department.
 *
 * The encrypted Gemini key is NEVER returned. Callers receive only
 * hasGeminiKey (bool) and gemini_key_last4 for display.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['school_id'] - Optional filter (super-admin only)
 * @output JSON array of departments
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

$caller = getAuthenticatedUser($mysqli);
if (!$caller) {
    send_response('Authentication required.', 403);
}

$isSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;

$baseSelect = 'SELECT d.id, d.school_id, s.school_name, d.department_name, d.is_active, d.created_at, '
    . 'd.gemini_key_last4, (d.gemini_key_cipher IS NOT NULL) AS hasGeminiKey '
    . 'FROM tbldepartment d JOIN tblschool s ON s.id = d.school_id ';

if ($isSuper) {
    $schoolFilter = (int) ($receivedData['school_id'] ?? 0);
    if ($schoolFilter > 0) {
        $stmt = $mysqli->prepare($baseSelect . 'WHERE d.school_id = ? ORDER BY s.school_name, d.department_name');
        $stmt->bind_param('i', $schoolFilter);
    } else {
        $stmt = $mysqli->prepare($baseSelect . 'ORDER BY s.school_name, d.department_name');
    }
} else {
    // Department admins (and any non-super caller) see only their own department.
    $deptId = (int) ($caller['department_id'] ?? 0);
    if ($deptId <= 0) {
        send_response(json_encode([]), 200);
    }
    $stmt = $mysqli->prepare($baseSelect . 'WHERE d.id = ?');
    $stmt->bind_param('i', $deptId);
}

if (!$stmt) {
    log_info('Get departments prepare failed: ' . $mysqli->error);
    send_response('Unable to fetch departments.', 500);
}

if (!$stmt->execute()) {
    log_info('Get departments execute failed: ' . $stmt->error);
    send_response('Unable to fetch departments.', 500);
}

$rows = mysqli_fetch_all($stmt->get_result(), MYSQLI_ASSOC);

// Normalise the computed boolean column to a real bool for the client.
foreach ($rows as &$row) {
    $row['hasGeminiKey'] = (bool) $row['hasGeminiKey'];
}
unset($row);

send_response(json_encode($rows), 200);
$stmt->close();
?>
