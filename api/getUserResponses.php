<?php
/****************************************************************************
 * Get User Responses Endpoint
 * 
 * Retrieves all responses for a specific user with AI feedback, teacher ratings,
 * and complete question/subject/topic context.
 * 
 * Returns:
 * - Student answers and graphics
 * - AI feedback and timestamps
 * - Teacher comments and RAG ratings
 * - Question text, markscheme, attachments
 * - Subject and topic information
 * 
 * Security:
 * - Protected by requireAuth() - Enhanced security for user data
 * - Filters responses by user_id
 * - Only returns responses with AI feedback
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['userId'] - User ID to retrieve responses for
 * @output JSON array of user responses with full context
 * 
 * @version 2.0
 * @updated 2025-11-17 - Added student_graphic support
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to user response data
requireAuth();

// Get user responses with AI feedback - simplified JOIN
$query = "SELECT 
            r.id as response_id,
            r.student_answer,
            r.ai_feedback,
            r.teacher_comment,
            r.teacher_rating,
            r.teacher_feedback_timestamp,
            r.teacher_id,
            r.time_taken,
            r.attempt_number,
            r.ai_timestamp,
            r.created_at,
            teacher.userName as teacher_name,
            q.id as question_id,
            q.question,
            q.markscheme,
            q.attachments,
            s.subject as subject_name,
            t.topic as topic_name
          FROM tblresponse r
          LEFT JOIN tbluser teacher ON r.teacher_id = teacher.id
          LEFT JOIN tblquestion q ON r.question_id = q.id
          LEFT JOIN tblsubject s ON r.subject_id = s.id
          LEFT JOIN tbltopic t ON r.topic_id = t.id
          WHERE r.user_id = ? AND r.ai_feedback IS NOT NULL AND r.ai_feedback != ''
          ORDER BY r.created_at DESC";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("User responses query prepare failed: " . $mysqli->error);
    send_response("User responses query prepare failed: " . $mysqli->error, 500);
} else {
    log_info("Querying responses for user ID: " . $receivedData['userId']);
    $stmt->bind_param("i", $receivedData['userId']);
    
    if (!$stmt->execute()) {
        log_info("User responses query execute failed: " . $stmt->error);
        send_response("User responses query execute failed: " . $stmt->error, 500);
    } else {
        $result = $stmt->get_result();
        $responses = [];
        
        while ($row = $result->fetch_assoc()) {
            $responses[] = [
                'responseId' => (int)$row['response_id'],
                'studentAnswer' => $row['student_answer'],
                'aiFeedback' => $row['ai_feedback'],
                'teacherComment' => $row['teacher_comment'],
                'teacherRating' => $row['teacher_rating'],
                'teacherFeedbackTimestamp' => $row['teacher_feedback_timestamp'],
                'teacherId' => $row['teacher_id'] ? (int)$row['teacher_id'] : null,
                'teacherName' => $row['teacher_name'],
                'timeTaken' => (int)$row['time_taken'],
                'attemptNumber' => (int)$row['attempt_number'],
                'aiTimestamp' => $row['ai_timestamp'],
                'createdAt' => $row['created_at'],
                'question' => [
                    'id' => (int)$row['question_id'],
                    'question' => $row['question'],
                    'markscheme' => $row['markscheme'],
                    'attachments' => $row['attachments']
                ],
                'subjectName' => $row['subject_name'],
                'topicName' => $row['topic_name']
            ];
        }
        
        log_info("Retrieved " . count($responses) . " responses for user: " . $receivedData['userId']);
        $json = json_encode($responses);
        send_response($json, 200);
    }
    $stmt->close();
}

?>