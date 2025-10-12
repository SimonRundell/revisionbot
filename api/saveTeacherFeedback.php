<?php

include 'setup.php';

// Update response with teacher feedback and rating
$query = "UPDATE tblresponse 
          SET teacher_comment = ?, 
              teacher_rating = ?,
              teacher_feedback_timestamp = CURRENT_TIMESTAMP,
              teacher_id = ?
          WHERE id = ?";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Teacher feedback update prepare failed: " . $mysqli->error);
    send_response("Teacher feedback update prepare failed: " . $mysqli->error, 500);
} else {
    $stmt->bind_param("ssii", 
        $receivedData['teacherComment'], 
        $receivedData['teacherRating'],
        $receivedData['teacherId'], 
        $receivedData['responseId']
    );
    
    if (!$stmt->execute()) {
        log_info("Teacher feedback update execute failed: " . $stmt->error);
        send_response("Teacher feedback update execute failed: " . $stmt->error, 500);
    } else {
        if ($stmt->affected_rows > 0) {
            log_info("Teacher feedback added successfully for response ID: " . $receivedData['responseId'] . " by teacher ID: " . $receivedData['teacherId']);
            send_response([
                "success" => true,
                "message" => "Teacher feedback saved successfully"
            ], 200);
        } else {
            log_info("Response not found for teacher feedback update, ID: " . $receivedData['responseId']);
            send_response([
                "success" => false,
                "error" => "Response not found"
            ], 404);
        }
    }
    $stmt->close();
}

?>