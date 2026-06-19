<?php
/****************************************************************************
 * Delete Topic Endpoint (Admin)
 * 
 * Permanently deletes a topic and all associated questions.
 * Performs cascade deletion:
 * 1. Delete all questions in the topic
 * 2. Delete the topic itself
 * 
 * Warning:
 * - Deletion is permanent and cannot be undone
 * - Deletes ALL questions under this topic
 * - May orphan student responses
 * - Returns count of deleted questions
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Validates topic ID required
 * - Returns 404 if topic not found
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - Topic ID to delete (required)
 * @output Success message with deleted question count
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Admin only.
requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);
$callerIsSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;

    // Check if ID is provided
    if (!isset($receivedData['id']) || empty($receivedData['id'])) {
        log_info("Topic delete failed: ID is required");
        send_response("Topic ID is required", 400);
        exit;
    }

    // Add-only ownership: a department admin may delete a topic only if they
    // own it AND every question under it is also theirs.
    if (!$callerIsSuper) {
        $topicId = (int) $receivedData['id'];
        $callerDept = (int) ($caller['department_id'] ?? 0);

        $topicOwner = lookupOwnerDepartmentId($mysqli, 'tbltopic', $topicId);
        if ($topicOwner === false) {
            send_response("No topic found with the provided ID", 404);
        }
        if (!callerActsOnDepartment($caller, $topicOwner)) {
            send_response("This topic is owned by another department and cannot be deleted here.", 403);
        }

        $foreignQuestions = $mysqli->prepare(
            'SELECT COUNT(*) AS c FROM tblquestion WHERE topicid = ? AND (owner_department_id IS NULL OR owner_department_id <> ?)'
        );
        $foreignQuestions->bind_param('ii', $topicId, $callerDept);
        $foreignQuestions->execute();
        $foreignQuestionCount = (int) ($foreignQuestions->get_result()->fetch_assoc()['c'] ?? 0);
        $foreignQuestions->close();

        if ($foreignQuestionCount > 0) {
            send_response("This topic contains questions owned by other departments. Ask the super-admin to delete it.", 403);
        }
    }

    // First delete all questions in this topic
    $deleteQuestionsQuery = "DELETE FROM tblquestion WHERE topicid = ?";
    $stmt1 = $mysqli->prepare($deleteQuestionsQuery);
    
    if (!$stmt1) {
        log_info("Topic delete questions prepare failed: " . $mysqli->error);  
        send_response("Topic delete questions prepare failed: " . $mysqli->error, 500);
        exit;
    }
    
    $stmt1->bind_param("i", $receivedData['id']);
    $stmt1->execute();
    $deletedQuestions = $stmt1->affected_rows;
    $stmt1->close();

    // Then delete the topic
    $deleteTopicQuery = "DELETE FROM tbltopic WHERE id = ?";
    $stmt2 = $mysqli->prepare($deleteTopicQuery);

    if (!$stmt2) {
        log_info("Topic delete prepare failed: " . $mysqli->error);
        send_response("Topic delete prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt2->bind_param("i", $receivedData['id']);

        if (!$stmt2->execute()) {
            log_info("Topic delete failed: " . $stmt2->error);
            send_response("Topic delete failed: " . $stmt2->error, 500);
        } else {
            // Check if any rows were affected
            if ($stmt2->affected_rows === 0) {
                log_info("Topic delete failed: No topic found with ID " . $receivedData['id']);
                send_response("No topic found with the provided ID", 404);
            } else {
                log_info("Topic deleted: ID " . $receivedData['id'] . " (also deleted " . $deletedQuestions . " questions)");
                send_response("Topic and associated questions successfully deleted", 200);
            }
        }
    }

$stmt2->close();
?>