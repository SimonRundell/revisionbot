<?php

include 'setup.php';

    // Get the next order number for this topic
    $orderQuery = "SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM tblquestion WHERE topicid = ?";
    $orderStmt = $mysqli->prepare($orderQuery);
    $orderStmt->bind_param("i", $receivedData['topicid']);
    $orderStmt->execute();
    $orderResult = $orderStmt->get_result();
    $nextOrder = $orderResult->fetch_assoc()['next_order'];
    $orderStmt->close();

    $query = "INSERT INTO tblquestion (question, topicid, attachments, markscheme, question_order) 
    VALUES (?, ?, ?, ?, ?)";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Question create prepare failed: " . $mysqli->error);
        send_response("Question create prepare failed: " . $mysqli->error, 500);
    } else {
        $attachments_json = json_encode($receivedData['attachments'] ?? []);
    
    $stmt->bind_param("sissi", $receivedData['question'],
         $receivedData['topicid'], 
         $attachments_json, $receivedData['markscheme'], $nextOrder);

        if (!$stmt->execute()) {
            log_info("Question creation failed: " . $stmt->error);
            send_response("Question creation failed: " . $stmt->error, 500);
        } else {
            log_info("Question created: " . $receivedData['question']);
            send_response("Question successfully created", 200);
        }
    }


$stmt->close();
?>