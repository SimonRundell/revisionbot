<?php
/****************************************************************************
 * User Authentication Endpoint
 * 
 * Authenticates users by email and password.
 * Supports both new bcrypt hashes and legacy MD5 hashes stored in passwordHash.
 * Returns user data plus a signed bearer token if credentials are valid.
 * 
 * Security:
 * - Protected by blockDirectAccess() - POST with JSON only
 * - Case-insensitive email matching
 * - Rejects deactivated accounts
 * - Upgrades legacy MD5 hashes to bcrypt on successful plaintext login
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['email'] - User email address
 * @input receivedData['password'] - Plaintext password for bcrypt-compatible login
 * @input receivedData['passwordHash'] - Legacy MD5 password hash for backwards compatibility
 * @output JSON array with user data and auth token or error message
 * 
 * @version 0.4.1
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access (but allow legitimate login attempts)
blockDirectAccess();

$email = strtolower(trim((string) ($receivedData['email'] ?? '')));
$plainPassword = (string) ($receivedData['password'] ?? '');
$legacyPasswordHash = strtolower(trim((string) ($receivedData['passwordHash'] ?? '')));

if ($email === '' || ($plainPassword === '' && $legacyPasswordHash === '')) {
    send_response('Email and password are required.', 400);
}

$query = "SELECT * FROM tbluser WHERE LOWER(email) = LOWER(?) LIMIT 1";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

$stmt->bind_param("s", $email);

if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Execute failed: " . $stmt->error, 500);
}

$result = $stmt->get_result();

if (!$result) {
    log_info("Query failed: " . $mysqli->error);
    send_response("Query failed: " . $mysqli->error, 500);
}

$user = $result->fetch_assoc();

if (!$user) {
    send_response('Invalid email or password.', 401);
}

if ((int) ($user['is_active'] ?? 1) !== 1) {
    send_response('Account deactivated. Please contact an administrator.', 403);
}

$storedHash = (string) ($user['passwordHash'] ?? '');
$passwordInfo = password_get_info($storedHash);
$usesPasswordHashApi = !empty($passwordInfo['algo']);
$passwordMatches = false;
$shouldUpgradeLegacyHash = false;

if ($plainPassword !== '' && $usesPasswordHashApi) {
    $passwordMatches = password_verify($plainPassword, $storedHash);
}

if (!$passwordMatches && $plainPassword !== '' && preg_match('/^[a-f0-9]{32}$/i', $storedHash)) {
    $passwordMatches = hash_equals(strtolower($storedHash), md5($plainPassword));
    $shouldUpgradeLegacyHash = $passwordMatches;
}

if (!$passwordMatches && $legacyPasswordHash !== '' && preg_match('/^[a-f0-9]{32}$/i', $storedHash)) {
    $passwordMatches = hash_equals(strtolower($storedHash), $legacyPasswordHash);
}

if (!$passwordMatches) {
    send_response('Invalid email or password.', 401);
}

if ($shouldUpgradeLegacyHash) {
    $newHash = password_hash($plainPassword, PASSWORD_BCRYPT);
    $upgradeStmt = $mysqli->prepare('UPDATE tbluser SET passwordHash = ?, last_pw_change = NOW() WHERE id = ?');
    if ($upgradeStmt) {
        $userId = (int) $user['id'];
        $upgradeStmt->bind_param('si', $newHash, $userId);
        $upgradeStmt->execute();
        $upgradeStmt->close();
        $user['passwordHash'] = $newHash;
    }
}

$user['token'] = generateAuthToken((int) $user['id']);
unset($user['passwordHash']);

send_response(json_encode([$user]), 200);