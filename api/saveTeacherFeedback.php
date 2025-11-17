<?php
/****************************************************************************
 * Save Teacher Feedback Endpoint
 * 
 * Allows teachers to add ratings and comments to student responses.
 * Updates existing responses with teacher assessment data.
 * 
 * RAG Rating System:
 * - R (Red): Relevant - Partially addresses the question
 * - A (Amber): Adequate - Meets basic requirements
 * - G (Green): Good - Demonstrates thorough understanding
 * 
 * Updates:
 * - teacher_comment: Text feedback from teacher
 * - teacher_rating: RAG rating (R, A, or G)
 * - teacher_feedback_timestamp: Auto-set to current time
 * - teacher_id: ID of teacher providing feedback
 * 
 * Security:
 * - No explicit security (relies on frontend validation)
 * - Should be enhanced with requireAuth() in production
 * - Validates response_id exists
 * 
 * @requires setup.php - Database connection
 * @input receivedData['teacherComment'] - Teacher's text feedback
 * @input receivedData['teacherRating'] - RAG rating (R/A/G)
 * @input receivedData['teacherId'] - Teacher user ID
 * @input receivedData['responseId'] - Response ID to update
 * @output Success or error message with affected rows
 * 
 * @version 1.0
 * @todo Add requireAuth() for production security
 ****************************************************************************/

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