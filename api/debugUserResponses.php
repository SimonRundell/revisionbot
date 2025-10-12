<?php

include 'setup.php';

log_info("Debug API called with data: " . json_encode($receivedData));

// First check if we have any responses at all
$countQuery = "SELECT COUNT(*) as total FROM tblresponse";
$countStmt = $mysqli->prepare($countQuery);
if ($countStmt) {
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $totalCount = $countResult->fetch_assoc()['total'];
    log_info("Total responses in database: " . $totalCount);
    $countStmt->close();
}

// Simple query to check what responses exist for a user
$query = "SELECT 
            r.id as response_id,
            r.user_id,
            r.question_id,
            r.subject_id,
            r.topic_id,
            r.student_answer,
            r.ai_feedback,
            r.created_at
          FROM tblresponse r
          WHERE r.user_id = ?
          ORDER BY r.created_at DESC";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("Debug query prepare failed: " . $mysqli->error);
    send_response("Debug query prepare failed: " . $mysqli->error, 500);
} else {
    log_info("Debug: Querying ALL responses for user ID: " . $receivedData['userId']);
    $stmt->bind_param("i", $receivedData['userId']);
    
    if (!$stmt->execute()) {
        log_info("Debug query execute failed: " . $stmt->error);
        send_response("Debug query execute failed: " . $stmt->error, 500);
    } else {
        $result = $stmt->get_result();
        $responses = [];
        
        while ($row = $result->fetch_assoc()) {
            $responses[] = $row;
        }
        
        log_info("Debug: Found " . count($responses) . " total responses for user: " . $receivedData['userId']);
        send_response([
            'totalResponses' => count($responses),
            'responses' => $responses
        ], 200);
    }
    $stmt->close();
}

?>