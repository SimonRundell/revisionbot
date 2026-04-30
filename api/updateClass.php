<?php
/****************************************************************************
 * Update Class Endpoint (Admin)
 *
 * Renames an existing class and cascades the new name to assigned users.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - Class ID
 * @input receivedData['className'] - Updated class name
 * @output Success or error message
 * @version 0.4.1
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
$newClassName = trim((string) ($receivedData['className'] ?? ''));

if ($classId <= 0) {
    send_response('A valid class id is required.', 400);
}

if ($newClassName === '') {
    send_response('Class name is required.', 400);
}

$lookupStmt = $mysqli->prepare('SELECT className FROM tblClass WHERE id = ? LIMIT 1');
if (!$lookupStmt) {
    log_info('Update class lookup prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare class lookup.', 500);
}

$lookupStmt->bind_param('i', $classId);
if (!$lookupStmt->execute()) {
    log_info('Update class lookup execute failed: ' . $lookupStmt->error);
    send_response('Unable to lookup class.', 500);
}

$result = $lookupStmt->get_result();
$classRow = $result ? $result->fetch_assoc() : null;
$lookupStmt->close();

if (!$classRow) {
    send_response('Class not found.', 404);
}

$oldClassName = (string) $classRow['className'];

$mysqli->begin_transaction();

try {
    $updateClassStmt = $mysqli->prepare('UPDATE tblClass SET className = ? WHERE id = ?');
    if (!$updateClassStmt) {
        throw new Exception('Unable to prepare class update.');
    }

    $updateClassStmt->bind_param('si', $newClassName, $classId);
    if (!$updateClassStmt->execute()) {
        $code = (int) ($updateClassStmt->errno ?? 0) === 1062 ? 409 : 500;
        throw new RuntimeException($code === 409 ? 'That class already exists.' : 'Unable to update class.', $code);
    }
    $updateClassStmt->close();

    $updateUsersStmt = $mysqli->prepare('UPDATE tbluser SET ' . $userClassColumn . ' = ? WHERE ' . $userClassColumn . ' = ?');
    if (!$updateUsersStmt) {
        throw new Exception('Unable to prepare assigned user update.');
    }

    $updateUsersStmt->bind_param('ss', $newClassName, $oldClassName);
    if (!$updateUsersStmt->execute()) {
        throw new Exception('Unable to update assigned users.');
    }
    $updateUsersStmt->close();

    $mysqli->commit();
    send_response('Class updated successfully.', 200);
} catch (RuntimeException $exception) {
    $mysqli->rollback();
    log_info('Update class failed: ' . $exception->getMessage());
    send_response($exception->getMessage(), $exception->getCode() ?: 500);
} catch (Throwable $exception) {
    $mysqli->rollback();
    log_info('Update class failed: ' . $exception->getMessage());
    send_response('Unable to update class.', 500);
}
?>