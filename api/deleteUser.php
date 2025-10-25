<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin delete functions
requireAuth();

$query = "DELETE FROM tbluser WHERE id = ?";
$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Prepare failed: " . $mysqli->error);
    send_response("Prepare failed: " . $mysqli->error, 500);
}

$stmt->bind_param("i", $receivedData['id']);

if (!$stmt->execute()) {
    log_info("Execute failed: " . $stmt->error);
    send_response("Execute failed: " . $stmt->error, 500);
} else {
    log_info("User deleted: " . $receivedData['id']);
    send_response("User deleted", 200);
} 