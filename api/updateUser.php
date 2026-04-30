<?php
/****************************************************************************
 * Update User Endpoint
 * 
 * Updates existing user account details.
 * Allows modification of all user fields including admin status and access control.
 * 
 * Updatable fields:
 * - Email address (converted to lowercase)
 * - User name
 * - Password hash
 * - Location/department
 * - Locale preference
 * - Admin flag
 * - Avatar identifier
 * - User access JSON (subject/topic permissions)
 * 
 * Security:
 * - Protected by requireAuth() with signed bearer token validation
 * - Allows admin updates for any account and self-service updates for own account
 * - Email uniqueness enforced by database
 * - Clears force_pw_change and updates last_pw_change when password changes
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - User ID (required)
 * @input receivedData['email'] - Updated email
 * @input receivedData['userName'] - Updated name
 * @input receivedData['password'] - Optional plaintext password (preferred)
 * @input receivedData['passwordHash'] - Updated password hash
 * @input receivedData['userClass'] - Updated class
 * @input receivedData['userLocale'] - Updated locale
 * @input receivedData['admin'] - Admin flag (0 or 1)
 * @input receivedData['avatar'] - Avatar identifier
 * @input receivedData['userAccess'] - Access control JSON
 * @output Success or error message
 * 
 * @version 0.4.1
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Authenticate and allow either self-service updates or admin edits.
$authenticatedUser = requireAuth($mysqli);
$targetUserId = (int) ($receivedData['id'] ?? 0);

if ($targetUserId <= 0) {
    send_response('A valid user id is required.', 400);
}

if ((int) ($authenticatedUser['admin'] ?? 0) !== 1 && (int) $authenticatedUser['id'] !== $targetUserId) {
    send_response('You are not allowed to update this account.', 403);
}

$currentPasswordStmt = $mysqli->prepare('SELECT passwordHash FROM tbluser WHERE id = ? LIMIT 1');
if (!$currentPasswordStmt) {
    log_info('User password lookup prepare failed: ' . $mysqli->error);
    send_response('User password lookup failed.', 500);
}

$currentPasswordStmt->bind_param('i', $targetUserId);
if (!$currentPasswordStmt->execute()) {
    log_info('User password lookup execute failed: ' . $currentPasswordStmt->error);
    send_response('User password lookup failed.', 500);
}

$currentPasswordResult = $currentPasswordStmt->get_result();
$currentUserRow = $currentPasswordResult ? $currentPasswordResult->fetch_assoc() : null;
$currentPasswordStmt->close();

if (!$currentUserRow) {
    send_response('User not found.', 404);
}

$resolvedPasswordHash = (string) $currentUserRow['passwordHash'];
$passwordChanged = false;

if (isset($receivedData['password']) && trim((string) $receivedData['password']) !== '') {
    $resolvedPasswordHash = password_hash((string) $receivedData['password'], PASSWORD_BCRYPT);
    $passwordChanged = true;
} elseif (isset($receivedData['passwordHash']) && (string) $receivedData['passwordHash'] !== '') {
    $incomingPasswordHash = (string) $receivedData['passwordHash'];
    if (!hash_equals($resolvedPasswordHash, $incomingPasswordHash)) {
        $resolvedPasswordHash = $incomingPasswordHash;
        $passwordChanged = true;
    }
}

$emailLower = strtolower((string) ($receivedData['email'] ?? ''));
$userAccess = $receivedData['userAccess'] ?? '';
if (is_array($userAccess)) {
    $userAccess = json_encode($userAccess);
}

$query = $passwordChanged
    ? "UPDATE tbluser SET email=?, 
                             userName=?, 
                             passwordHash=?,
                             userClass=?, 
                             userLocale=?,
                             admin=?,
                             avatar=?,
                             userAccess=?,
                             force_pw_change=0,
                             last_pw_change=NOW() WHERE id=?"
    : "UPDATE tbluser SET email=?, 
                             userName=?, 
                             passwordHash=?,
                             userClass=?, 
                             userLocale=?,
                             admin=?,
                             avatar=?,
                             userAccess=? WHERE id=?";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("User update prepare failed: " . $mysqli->error);
    send_response("User update prepare failed: " . $mysqli->error, 500);
} else {
    $adminValue = (int) ($receivedData['admin'] ?? 0);
    $userName = (string) ($receivedData['userName'] ?? '');
    $userClass = (string) ($receivedData['userClass'] ?? $receivedData['userLocation'] ?? '');
    $userLocale = (string) ($receivedData['userLocale'] ?? '');
    $avatar = (string) ($receivedData['avatar'] ?? '');

    $stmt->bind_param(
        "sssssissi",
        $emailLower,
        $userName,
        $resolvedPasswordHash,
        $userClass,
        $userLocale,
        $adminValue,
        $avatar,
        $userAccess,
        $targetUserId
    );

    if (!$stmt->execute()) {
        log_info("Execute failed: " . $stmt->error);
        send_response("User update failed: " . $stmt->error, 500);
    } else {
        log_info("User successfully updated: " . $emailLower);
        send_response("User successfully updated", 200);
    }
}

$stmt->close();
?>
