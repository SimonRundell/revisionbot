<?php

require_once 'simple_security.php';
include 'setup.php';

// Authenticated only (previously unauthenticated). A student may update only
// their own response; a department admin only within their department; the
// super-admin anywhere.
$caller = requireAuth($mysqli);
$callerIsSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;
$callerIsAdmin = (int) ($caller['admin'] ?? 0) === 1 || $callerIsSuper;
$responseId = (int) ($receivedData['responseId'] ?? 0);

// Extract the AI-suggested RAG rating from the feedback HTML
$aiFeedback = $receivedData['aiFeedback'];
$estimatedGrade = null;
if (preg_match('/data-rating="([RAG])"/', $aiFeedback, $matches)) {
    $estimatedGrade = $matches[1];
}

// Update the response with AI feedback and extracted estimated grade, scoped to
// what the caller is allowed to touch.
$baseSet = "UPDATE tblresponse
          SET ai_feedback = ?,
              estimated_grade = ?,
              ai_processed = TRUE,
              ai_timestamp = CURRENT_TIMESTAMP,
              completion_status = 'assessed'
          WHERE id = ?";

if ($callerIsSuper) {
    $query = $baseSet;
} elseif ($callerIsAdmin) {
    $query = $baseSet . " AND department_id = ?";
} else {
    $query = $baseSet . " AND user_id = ?";
}

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info("AI feedback update prepare failed: " . $mysqli->error);
    send_response("AI feedback update prepare failed: " . $mysqli->error, 500);
} else {
    if ($callerIsSuper) {
        $stmt->bind_param("ssi", $aiFeedback, $estimatedGrade, $responseId);
    } elseif ($callerIsAdmin) {
        $callerDept = (int) ($caller['department_id'] ?? 0);
        $stmt->bind_param("ssii", $aiFeedback, $estimatedGrade, $responseId, $callerDept);
    } else {
        $callerUserId = (int) $caller['id'];
        $stmt->bind_param("ssii", $aiFeedback, $estimatedGrade, $responseId, $callerUserId);
    }
    
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