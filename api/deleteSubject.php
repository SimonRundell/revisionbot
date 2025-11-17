<?php
/****************************************************************************
 * Delete Subject Endpoint (Admin)
 * 
 * Permanently deletes a subject and all associated topics and questions.
 * Performs cascade deletion in proper order:
 * 1. Delete all questions in all topics
 * 2. Delete all topics
 * 3. Delete the subject
 * 
 * Warning:
 * - Deletion is permanent and cannot be undone
 * - Deletes ALL topics and questions under this subject
 * - May orphan student responses
 * - Returns count of deleted items for confirmation
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Validates subject ID required
 * - Returns 404 if subject not found
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - Subject ID to delete (required)
 * @output JSON with deleted counts {questionsDeleted, topicsDeleted, subjectDeleted}
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin delete functions
requireAuth();

    // Check if ID is provided
    if (!isset($receivedData['id']) || empty($receivedData['id'])) {
        log_info("Subject delete failed: ID is required");
        send_response("Subject ID is required", 400);
        exit;
    }

    // First get all topics for this subject
    $getTopicsQuery = "SELECT id FROM tbltopic WHERE subjectid = ?";
    $stmt1 = $mysqli->prepare($getTopicsQuery);
    
    if (!$stmt1) {
        log_info("Subject delete get topics prepare failed: " . $mysqli->error);
        send_response("Subject delete get topics prepare failed: " . $mysqli->error, 500);
        exit;
    }
    
    $stmt1->bind_param("i", $receivedData['id']);
    $stmt1->execute();
    $result = $stmt1->get_result();
    $topicIds = [];
    while ($row = $result->fetch_assoc()) {
        $topicIds[] = $row['id'];
    }
    $stmt1->close();

    $deletedQuestions = 0;
    
    // Delete all questions in all topics of this subject
    if (!empty($topicIds)) {
        $placeholders = str_repeat('?,', count($topicIds) - 1) . '?';
        $deleteQuestionsQuery = "DELETE FROM tblquestion WHERE topicid IN ($placeholders)";
        $stmt2 = $mysqli->prepare($deleteQuestionsQuery);
        
        if (!$stmt2) {
            log_info("Subject delete questions prepare failed: " . $mysqli->error);
            send_response("Subject delete questions prepare failed: " . $mysqli->error, 500);
            exit;
        }
        
        $stmt2->bind_param(str_repeat('i', count($topicIds)), ...$topicIds);
        $stmt2->execute();
        $deletedQuestions = $stmt2->affected_rows;
        $stmt2->close();
    }

    // Delete all topics in this subject
    $deleteTopicsQuery = "DELETE FROM tbltopic WHERE subjectid = ?";
    $stmt3 = $mysqli->prepare($deleteTopicsQuery);
    
    if (!$stmt3) {
        log_info("Subject delete topics prepare failed: " . $mysqli->error);
        send_response("Subject delete topics prepare failed: " . $mysqli->error, 500);
        exit;
    }
    
    $stmt3->bind_param("i", $receivedData['id']);
    $stmt3->execute();
    $deletedTopics = $stmt3->affected_rows;
    $stmt3->close();

    // Finally delete the subject
    $deleteSubjectQuery = "DELETE FROM tblsubject WHERE id = ?";
    $stmt4 = $mysqli->prepare($deleteSubjectQuery);

    if (!$stmt4) {
        log_info("Subject delete prepare failed: " . $mysqli->error);
        send_response("Subject delete prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt4->bind_param("i", $receivedData['id']);

        if (!$stmt4->execute()) {
            log_info("Subject delete failed: " . $stmt4->error);
            send_response("Subject delete failed: " . $stmt4->error, 500);
        } else {
            // Check if any rows were affected
            if ($stmt4->affected_rows === 0) {
                log_info("Subject delete failed: No subject found with ID " . $receivedData['id']);
                send_response("No subject found with the provided ID", 404);
            } else {
                log_info("Subject deleted: ID " . $receivedData['id'] . " (also deleted " . $deletedTopics . " topics and " . $deletedQuestions . " questions)");
                send_response("Subject and all associated content successfully deleted", 200);
            }
        }
    }

$stmt4->close();
?>