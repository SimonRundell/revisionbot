<?php

include 'setup.php';

// Extract the AI-suggested RAG rating from the feedback HTML
$aiFeedback = $receivedData['aiFeedback'];
$estimatedGrade = null;
if (preg_match('/data-rating="([RAG])"/', $aiFeedback, $matches)) {
    $estimatedGrade = $matches[1];
}

// Update the response with AI feedback and extracted estimated grade
$query = "UPDATE tblresponse
          SET ai_feedback = ?,
              estimated_grade = ?,
              ai_processed = TRUE,
              ai_timestamp = CURRENT_TIMESTAMP,
              completion_status = 'assessed'
          WHERE id = ?";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("AI feedback update prepare failed: " . $mysqli->error);
    send_response("AI feedback update prepare failed: " . $mysqli->error, 500);
} else {
    $stmt->bind_param("ssi", $aiFeedback, $estimatedGrade, $receivedData['responseId']);
    
    if (!$stmt->execute()) {
        log_info("AI feedback update execute failed: " . $stmt->error);
        send_response("AI feedback update execute failed: " . $stmt->error, 500);
    } else {
        if ($stmt->affected_rows > 0) {
            log_info("AI feedback updated successfully for response ID: " . $receivedData['responseId']);
            send_response([
                "success" => true,
                "message" => "AI feedback updated successfully"
            ], 200);
        } else {
            log_info("Response not found or already processed for ID: " . $receivedData['responseId']);
            send_response([
                "success" => false,
                "error" => "Response not found or already processed"
            ], 404);
        }
    }
    $stmt->close();
}
?>