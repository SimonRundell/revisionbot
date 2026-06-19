<?php

require_once 'simple_security.php';
include 'setup.php';

// Admin only (previously unauthenticated). Scope the target user to the
// caller's department unless super-admin.
requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);
$callerIsSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;
$targetUserId = (int) ($receivedData['userId'] ?? 0);
if ($targetUserId <= 0) {
    send_response('Valid userId is required', 400);
}
if (!$callerIsSuper) {
    $targetDepartmentId = lookupUserDepartmentId($mysqli, $targetUserId);
    if (!callerActsOnDepartment($caller, $targetDepartmentId)) {
        send_response('Forbidden', 403);
    }
}

log_info("Debug API called with data: " . json_encode($receivedData));

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
    log_info("Debug: Querying ALL responses for user ID: " . $targetUserId);
    $stmt->bind_param("i", $targetUserId);
    
    if (!$stmt->execute()) {
        log_info("Debug query execute failed: " . $stmt->error);
        send_response("Debug query execute failed: " . $stmt->error, 500);
    } else {
        $result = $stmt->get_result();
        $responses = [];
        
        while ($row = $result->fetch_assoc()) {
            $responses[] = $row;
        }
        
        log_info("Debug: Found " . count($responses) . " total responses for user: " . $targetUserId);
        send_response([
            'totalResponses' => count($responses),
            'responses' => $responses
        ], 200);
    }
    $stmt->close();
}

?>