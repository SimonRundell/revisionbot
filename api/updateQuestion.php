<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin update functions
requireAuth();

    // Check if ID is provided
    if (!isset($receivedData['id']) || empty($receivedData['id'])) {
        log_info("Question update failed: ID is required");
        send_response("Question ID is required", 400);
        exit;
    }

    $query = "UPDATE tblquestion SET question = ?, topicid = ?, attachments = ?, markscheme = ? WHERE id = ?";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Question update prepare failed: " . $mysqli->error);
        send_response("Question update prepare failed: " . $mysqli->error, 500);
    } else {
        $attachments_json = json_encode($receivedData['attachments'] ?? []);
    
        $stmt->bind_param("sissi", 
            $receivedData['question'],
            $receivedData['topicid'], 
            $attachments_json, 
            $receivedData['markscheme'],
            $receivedData['id']
        );

        if (!$stmt->execute()) {
            log_info("Question update failed: " . $stmt->error);
            send_response("Question update failed: " . $stmt->error, 500);
        } else {
            // Check if any rows were affected
            if ($stmt->affected_rows === 0) {
                log_info("Question update failed: No question found with ID " . $receivedData['id']);
                send_response("No question found with the provided ID", 404);
            } else {
                log_info("Question updated: ID " . $receivedData['id'] . " - " . $receivedData['question']);
                send_response("Question successfully updated", 200);
            }
        }
    }

$stmt->close();
?>