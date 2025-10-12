<?php

include 'setup.php';

    // Check if ID is provided
    if (!isset($receivedData['id']) || empty($receivedData['id'])) {
        log_info("Topic delete failed: ID is required");
        send_response("Topic ID is required", 400);
        exit;
    }

    // First delete all questions in this topic
    $deleteQuestionsQuery = "DELETE FROM tblquestion WHERE topicid = ?";
    $stmt1 = $mysqli->prepare($deleteQuestionsQuery);
    
    if (!$stmt1) {
        log_info("Topic delete questions prepare failed: " . $mysqli->error);  
        send_response("Topic delete questions prepare failed: " . $mysqli->error, 500);
        exit;
    }
    
    $stmt1->bind_param("i", $receivedData['id']);
    $stmt1->execute();
    $deletedQuestions = $stmt1->affected_rows;
    $stmt1->close();

    // Then delete the topic
    $deleteTopicQuery = "DELETE FROM tbltopic WHERE id = ?";
    $stmt2 = $mysqli->prepare($deleteTopicQuery);

    if (!$stmt2) {
        log_info("Topic delete prepare failed: " . $mysqli->error);
        send_response("Topic delete prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt2->bind_param("i", $receivedData['id']);

        if (!$stmt2->execute()) {
            log_info("Topic delete failed: " . $stmt2->error);
            send_response("Topic delete failed: " . $stmt2->error, 500);
        } else {
            // Check if any rows were affected
            if ($stmt2->affected_rows === 0) {
                log_info("Topic delete failed: No topic found with ID " . $receivedData['id']);
                send_response("No topic found with the provided ID", 404);
            } else {
                log_info("Topic deleted: ID " . $receivedData['id'] . " (also deleted " . $deletedQuestions . " questions)");
                send_response("Topic and associated questions successfully deleted", 200);
            }
        }
    }

$stmt2->close();
?>