<?php

include 'setup.php';

$query = "UPDATE tbluser SET email=?, 
                             userName=?, 
                             passwordHash=?,
                             userLocation=?, 
                             userLocale=?,
                             admin=?,
                             avatar=? WHERE id=?
          ";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("User update prepare failed: " . $mysqli->error);
    send_response("User update prepare failed: " . $mysqli->error, 500);
} else {
$stmt->bind_param("sssssisi", $receivedData['email'],
                             $receivedData['userName'],
                             $receivedData['passwordHash'],
                             $receivedData['userLocation'],
                             $receivedData['userLocale'],
                             $receivedData['admin'],
                             $receivedData['avatar'],
                             $receivedData['id']);    
if (!$stmt->execute()) {
        log_info("Execute failed: " . $stmt->error);
        send_response("User update failed: " . $stmt->error, 500);
    } else {
        log_info("User successfully updated: " . $receivedData['email']);
        send_response("User successfully updated", 200);
    }
}

$stmt->close();
?>
