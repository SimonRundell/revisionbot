<?php

include 'setup.php';

    // Check if ID is provided
    if (!isset($receivedData['id']) || empty($receivedData['id'])) {
        log_info("Question delete failed: ID is required");
        send_response("Question ID is required", 400);
        exit;
    }

    $query = "DELETE FROM tblquestion WHERE id = ?";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Question delete prepare failed: " . $mysqli->error);
        send_response("Question delete prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt->bind_param("i", $receivedData['id']);

        if (!$stmt->execute()) {
            log_info("Question delete failed: " . $stmt->error);
            send_response("Question delete failed: " . $stmt->error, 500);
        } else {
            // Check if any rows were affected
            if ($stmt->affected_rows === 0) {
                log_info("Question delete failed: No question found with ID " . $receivedData['id']);
                send_response("No question found with the provided ID", 404);
            } else {
                log_info("Question deleted: ID " . $receivedData['id']);
                send_response("Question successfully deleted", 200);
            }
        }
    }

$stmt->close();
?>