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

require_once 'simple_security.php';
include 'setup.php';

// Admin only (previously unauthenticated). The teacher id is taken from the
// token, and a department admin may only mark responses in their department.
requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);
$callerIsSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;
$teacherId = (int) $caller['id'];
$responseId = (int) ($receivedData['responseId'] ?? 0);

// Update response with teacher feedback and rating. The department clause keeps
// a department admin from marking another tenant's responses.
if ($callerIsSuper) {
    $query = "UPDATE tblresponse
              SET teacher_comment = ?,
                  teacher_rating = ?,
                  teacher_feedback_timestamp = CURRENT_TIMESTAMP,
                  teacher_id = ?
              WHERE id = ?";
} else {
    $query = "UPDATE tblresponse
              SET teacher_comment = ?,
                  teacher_rating = ?,
                  teacher_feedback_timestamp = CURRENT_TIMESTAMP,
                  teacher_id = ?
              WHERE id = ? AND department_id = ?";
}

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Teacher feedback update prepare failed: " . $mysqli->error);
    send_response("Teacher feedback update prepare failed: " . $mysqli->error, 500);
} else {
    if ($callerIsSuper) {
        $stmt->bind_param("ssii",
            $receivedData['teacherComment'],
            $receivedData['teacherRating'],
            $teacherId,
            $responseId
        );
    } else {
        $callerDept = (int) ($caller['department_id'] ?? 0);
        $stmt->bind_param("ssiii",
            $receivedData['teacherComment'],
            $receivedData['teacherRating'],
            $teacherId,
            $responseId,
            $callerDept
        );
    }
    
    if (!$stmt->execute()) {
        log_info("Teacher feedback update execute failed: " . $stmt->error);
        send_response("Teacher feedback update execute failed: " . $stmt->error, 500);
    } else {
        if ($stmt->affected_rows > 0) {
            log_info("Teacher feedback added successfully for response ID: " . $responseId . " by teacher ID: " . $teacherId);
            send_response([
                "success" => true,
                "message" => "Teacher feedback saved successfully"
            ], 200);
        } else {
            log_info("Response not found / out of scope for teacher feedback update, ID: " . $responseId);
            send_response([
                "success" => false,
                "error" => "Response not found or not in your department"
            ], 404);
        }
    }
    $stmt->close();
}

?>