<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin update functions
requireAuth();

$query = "UPDATE tbluser SET email=?, 
                             userName=?, 
                             passwordHash=?,
                             userLocation=?, 
                             userLocale=?,
                             admin=?,
                             avatar=?,
                             userAccess=? WHERE id=?
          ";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("User update prepare failed: " . $mysqli->error);
    send_response("User update prepare failed: " . $mysqli->error, 500);
} else {
    $emailLower = strtolower($receivedData['email']);
    $stmt->bind_param("ssssssssi", $emailLower,
                             $receivedData['userName'],
                             $receivedData['passwordHash'],
                             $receivedData['userLocation'],
                             $receivedData['userLocale'],
                             $receivedData['admin'],
                             $receivedData['avatar'],
                             $receivedData['userAccess'],
                             $receivedData['id']);    
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
