<?php

include 'setup.php';

    $query = "INSERT INTO tblsubject (subject) VALUES (?)";


    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Subject create prepare failed: " . $mysqli->error);
        send_response("Subject create prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt->bind_param("s", $receivedData['subject']);
                                 
        if (!$stmt->execute()) {
            log_info("Subject creation failed: " . $stmt->error);
            send_response("Subject creation failed: " . $stmt->error, 500);
        } else {
            log_info("Subject created: " . $receivedData['subject']);
            send_response("Subject successfully created", 200);
        }
    }


$stmt->close();
?>