<?php

include 'setup.php';

    $query = "INSERT INTO tbltopic (topic, subjectid) VALUES (?, ?)";


    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Topic create prepare failed: " . $mysqli->error);
        send_response("Topic create prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt->bind_param("si", $receivedData['topic'], $receivedData['subjectid']);

        if (!$stmt->execute()) {
            log_info("Topic creation failed: " . $stmt->error);
            send_response("Topic creation failed: " . $stmt->error, 500);
        } else {
            log_info("Topic created: " . $receivedData['topic']);
            send_response("Topic successfully created", 200);
        }
    }


$stmt->close();
?>