<?php
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
        
        // Insert the response
        $query = "INSERT INTO tblresponse (
                    user_id, question_id, subject_id, topic_id, 
                    student_answer, time_taken, session_id, attempt_number,
                    completion_status
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')";
        
        $stmt = $mysqli->prepare($query);
        
        if (!$stmt) {
            log_info("Response insert prepare failed: " . $mysqli->error);
            send_response("Response insert prepare failed: " . $mysqli->error, 500);
        } else {
            $stmt->bind_param("iiiisisi", 
                $receivedData['userId'], 
                $receivedData['questionId'], 
                $receivedData['subjectId'], 
                $receivedData['topicId'],
                $receivedData['studentAnswer'], 
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