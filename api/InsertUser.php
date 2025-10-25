<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to registration
blockDirectAccess();

    $query = "INSERT INTO tbluser (email, passwordHash, userName, userLocation, userStatus, userLocale, avatar, admin)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("User create prepare failed: " . $mysqli->error);
        send_response("User create prepare failed: " . $mysqli->error, 500);
    } else {
        $emailLower = strtolower($receivedData['email']);
        $stmt->bind_param("sssssssi", $emailLower, 
                                 $receivedData['passwordHash'], 
                                 $receivedData['userName'],
                                 $receivedData['userLocation'],
                                 $receivedData['userStatus'],
                                 $receivedData['userLocale'],
                                 $receivedData['avatar'],
                                 $receivedData['admin']);
        if (!$stmt->execute()) {
            log_info("User creation failed: " . $stmt->error);
            send_response("User creation failed: " . $stmt->error, 500);
        } else {
            log_info("User created " . $receivedData['email']);
            send_response("User successfully created", 200);
        }
    }


$stmt->close();
?>
