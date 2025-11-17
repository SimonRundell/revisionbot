<?php
/****************************************************************************
 * Submit Student Response Endpoint
 * 
 * Stores student answers in the database including text responses and optional graphics.
 * Tracks attempt numbers for multiple submissions of the same question.
 * Updates user statistics for progress tracking.
 * 
 * Security:
 * - Protected by blockDirectAccess() - requires POST with JSON content-type
 * - Validates all input parameters
 * - Uses prepared statements to prevent SQL injection
 * 
 * Database Operations:
 * - Checks for existing attempts and increments attempt_number
 * - Inserts response into tblresponse with all metadata
 * - Stores optional student_graphic as LONGTEXT base64 data
 * - Updates tbluser_stats for analytics
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database and configuration
 * @input receivedData['userId'] - Student user ID
 * @input receivedData['questionId'] - Question being answered
 * @input receivedData['subjectId'] - Subject context
 * @input receivedData['topicId'] - Topic context
 * @input receivedData['studentAnswer'] - Text response
 * @input receivedData['studentGraphic'] - Optional base64 image data URL
 * @input receivedData['timeTaken'] - Time spent on question (seconds)
 * @input receivedData['sessionId'] - Session identifier
 * @output JSON response with responseId and success status
 * 
 * @version 2.0
 * @updated 2025-11-17 - Added student_graphic support
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access
blockDirectAccess();

// Check if user already has a response for this question (for attempt numbering)
$checkStmt = $mysqli->prepare("SELECT MAX(attempt_number) as max_attempt FROM tblresponse WHERE user_id = ? AND question_id = ?");

if (!$checkStmt) {
    log_info("Response check prepare failed: " . $mysqli->error);
    send_response("Response check prepare failed: " . $mysqli->error, 500);
} else {
    $checkStmt->bind_param("ii", $receivedData['userId'], $receivedData['questionId']);
    
    if (!$checkStmt->execute()) {
        log_info("Response check execute failed: " . $checkStmt->error);
        send_response("Response check execute failed: " . $checkStmt->error, 500);
    } else {
        $result = $checkStmt->get_result();
        $row = $result->fetch_assoc();
        $attemptNumber = ($row['max_attempt'] ?? 0) + 1;
        
        /**
         * Insert student response with multimodal support
         * 
         * Stores:
         * - Text answer (student_answer)
         * - Optional graphic (student_graphic) as base64 LONGTEXT
         * - Metadata: user_id, question_id, subject_id, topic_id
         * - Tracking: time_taken, session_id, attempt_number
         * - Status: completion_status = 'submitted'
         * 
         * @see tblresponse schema for field definitions
         */
        $query = "INSERT INTO tblresponse (
                    user_id, question_id, subject_id, topic_id, 
                    student_answer, student_graphic, time_taken, session_id, attempt_number,
                    completion_status
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')";
        
        $stmt = $mysqli->prepare($query);
        
        if (!$stmt) {
            log_info("Response insert prepare failed: " . $mysqli->error);
            send_response("Response insert prepare failed: " . $mysqli->error, 500);
        } else {
            // Extract student graphic from request (optional, defaults to null)
            $studentGraphic = $receivedData['studentGraphic'] ?? null;
            
            /**
             * Bind parameters for prepared statement
             * 
             * Type string: "iiiissisi"
             * i = user_id (integer)
             * i = question_id (integer)
             * i = subject_id (integer)
             * i = topic_id (integer)
             * s = student_answer (string/text)
             * s = student_graphic (string/LONGTEXT base64 or null)
             * i = time_taken (integer seconds)
             * s = session_id (string)
             * i = attempt_number (integer)
             */
            $stmt->bind_param("iiiissisi", 
                $receivedData['userId'], 
                $receivedData['questionId'], 
                $receivedData['subjectId'], 
                $receivedData['topicId'],
                $receivedData['studentAnswer'],
                $studentGraphic,
                $receivedData['timeTaken'], 
                $receivedData['sessionId'], 
                $attemptNumber
            );
            
            if (!$stmt->execute()) {
                log_info("Response insert execute failed: " . $stmt->error);
                send_response("Response insert execute failed: " . $stmt->error, 500);
            } else {
                $responseId = $stmt->insert_id;
                log_info("Response submitted successfully for user: " . $receivedData['userId'] . " question: " . $receivedData['questionId']);
                
                // Update user stats
                updateUserStats($mysqli, $receivedData['userId'], $receivedData['subjectId'], $receivedData['topicId']);
                
                send_response([
                    "success" => true,
                    "responseId" => $responseId,
                    "message" => "Response submitted successfully"
                ], 200);
            }
        }
        $stmt->close();
    }
    $checkStmt->close();
}

function updateUserStats($mysqli, $userId, $subjectId, $topicId) {
    // Update subject-level stats
    $stmt = $mysqli->prepare("
        INSERT INTO tbluser_stats (user_id, subject_id, total_questions_attempted, total_questions_completed)
        VALUES (?, ?, 1, 1)
        ON DUPLICATE KEY UPDATE 
            total_questions_attempted = total_questions_attempted + 1,
            total_questions_completed = total_questions_completed + 1,
            last_activity = CURRENT_TIMESTAMP
    ");
    
    if ($stmt) {
        $stmt->bind_param("ii", $userId, $subjectId);
        if ($stmt->execute()) {
            log_info("Subject stats updated for user: " . $userId . " subject: " . $subjectId);
        } else {
            log_info("Subject stats update failed: " . $stmt->error);
        }
        $stmt->close();
    }
    
    // Update topic-level stats
    $stmt = $mysqli->prepare("
        INSERT INTO tbluser_stats (user_id, subject_id, topic_id, total_questions_attempted, total_questions_completed)
        VALUES (?, ?, ?, 1, 1)
        ON DUPLICATE KEY UPDATE 
            total_questions_attempted = total_questions_attempted + 1,
            total_questions_completed = total_questions_completed + 1,
            last_activity = CURRENT_TIMESTAMP
    ");
    
    if ($stmt) {
        $stmt->bind_param("iii", $userId, $subjectId, $topicId);
        if ($stmt->execute()) {
            log_info("Topic stats updated for user: " . $userId . " subject: " . $subjectId . " topic: " . $topicId);
        } else {
            log_info("Topic stats update failed: " . $stmt->error);
        }
        $stmt->close();
    }
}
?>