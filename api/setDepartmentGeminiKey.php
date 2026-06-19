<?php
/****************************************************************************
 * Set Department Gemini Key Endpoint
 *
 * Stores a department's Gemini API key, encrypted at rest (see crypto.php).
 * The key is never echoed back; only a success flag and last-4 are returned.
 *
 * Authorisation:
 * - A department admin may set the key only for their own department.
 * - The super-admin is intentionally excluded: the platform operator never
 *   handles tenant API keys. Schools supply and pay for their own.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @requires crypto.php - Encryption helpers
 * @input receivedData['gemini_key'] - Plaintext Gemini API key (department is
 *         always taken from the caller's token, never the request body).
 * @output Success message with last4, or error
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';
require_once 'crypto.php';

$caller = getAuthenticatedUser($mysqli);
if (!$caller) {
    send_response('Authentication required.', 403);
}

// Only a department admin may set their OWN department's key. The super-admin
// (platform operator) is deliberately excluded: schools supply and pay for
// their own AI keys, so the operator never handles them. The department is
// always derived from the token and never accepted from the request body.
if ((int) ($caller['is_super_admin'] ?? 0) === 1) {
    send_response('Super-admin accounts cannot manage department API keys. Each department sets its own.', 403);
}

if ((int) ($caller['admin'] ?? 0) !== 1 || empty($caller['department_id'])) {
    send_response('Department admin access required.', 403);
}

$departmentId = (int) $caller['department_id'];

$geminiKey = trim((string) ($receivedData['gemini_key'] ?? ''));
if ($geminiKey === '') {
    send_response('A Gemini API key is required.', 400);
}

// Confirm the department exists.
$check = $mysqli->prepare('SELECT id FROM tbldepartment WHERE id = ? LIMIT 1');
$check->bind_param('i', $departmentId);
$check->execute();
if (!$check->get_result()->fetch_assoc()) {
    send_response('Department not found.', 404);
}
$check->close();

try {
    $enc = encryptSecret($geminiKey);
} catch (Throwable $e) {
    log_info('Gemini key encryption failed: ' . $e->getMessage());
    send_response('Server is not configured for secret encryption.', 500);
}

$last4 = secretLast4($geminiKey);

$stmt = $mysqli->prepare(
    'UPDATE tbldepartment SET gemini_key_cipher = ?, gemini_key_nonce = ?, gemini_key_last4 = ? WHERE id = ?'
);
if (!$stmt) {
    log_info('Set Gemini key prepare failed: ' . $mysqli->error);
    send_response('Unable to store the key.', 500);
}

$stmt->bind_param('sssi', $enc['cipher'], $enc['nonce'], $last4, $departmentId);
if (!$stmt->execute()) {
    log_info('Set Gemini key execute failed: ' . $stmt->error);
    send_response('Unable to store the key.', 500);
}

send_response(['message' => 'Gemini API key saved.', 'last4' => $last4], 200);
$stmt->close();
?>
