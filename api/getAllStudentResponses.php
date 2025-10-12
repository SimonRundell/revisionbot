<?php

include 'setup.php';

// Admin endpoint to get all student responses
$query = "SELECT 
            r.id as response_id,
            r.user_id,
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
            u.userName as student_name,
            u.email as student_email,
            teacher.userName as teacher_name,
            q.id as question_id,
            q.question,
            q.markscheme,
            q.attachments,
            s.subject as subject_name,
            t.topic as topic_name
          FROM tblresponse r
          LEFT JOIN tbluser u ON r.user_id = u.id
          LEFT JOIN tbluser teacher ON r.teacher_id = teacher.id
          LEFT JOIN tblquestion q ON r.question_id = q.id
          LEFT JOIN tblsubject s ON r.subject_id = s.id
          LEFT JOIN tbltopic t ON r.topic_id = t.id
          WHERE r.ai_feedback IS NOT NULL AND r.ai_feedback != ''
          ORDER BY r.created_at DESC";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Admin responses query prepare failed: " . $mysqli->error);
    send_response("Admin responses query prepare failed: " . $mysqli->error, 500);
} else {
    log_info("Admin querying all student responses");
    
    if (!$stmt->execute()) {
        log_info("Admin responses query execute failed: " . $stmt->error);
        send_response("Admin responses query execute failed: " . $stmt->error, 500);
    } else {
        $result = $stmt->get_result();
        $responses = [];
        
        while ($row = $result->fetch_assoc()) {
            $responses[] = [
                'responseId' => (int)$row['response_id'],
                'userId' => (int)$row['user_id'],
                'studentName' => $row['student_name'],
                'studentEmail' => $row['student_email'],
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
        
        log_info("Retrieved " . count($responses) . " total student responses for admin review");
        $json = json_encode($responses);
        send_response($json, 200);
    }
    $stmt->close();
}

?>