<?php
/****************************************************************************
 * Delete Question Endpoint (Admin)
 * 
 * Permanently deletes a question from the system.
 * Validates question ID exists before deletion.
 * 
 * Warning:
 * - Deletion is permanent and cannot be undone
 * - May orphan student responses if not handled properly
 * - Consider soft delete or cascade delete for responses
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Validates question ID required
 * - Returns 404 if question not found
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['id'] - Question ID to delete (required)
 * @output Success or error message with affected rows
 * 
 * @version 1.0
 * @todo Consider cascade delete for related responses
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin delete functions
requireAuth();

    // Check if ID is provided
    if (!isset($receivedData['id']) || empty($receivedData['id'])) {
        log_info("Question delete failed: ID is required");
        send_response("Question ID is required", 400);
        exit;
    }

    $query = "DELETE FROM tblquestion WHERE id = ?";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Question delete prepare failed: " . $mysqli->error);
        send_response("Question delete prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt->bind_param("i", $receivedData['id']);

        if (!$stmt->execute()) {
            log_info("Question delete failed: " . $stmt->error);
            send_response("Question delete failed: " . $stmt->error, 500);
        } else {
            // Check if any rows were affected
            if ($stmt->affected_rows === 0) {
                log_info("Question delete failed: No question found with ID " . $receivedData['id']);
                send_response("No question found with the provided ID", 404);
            } else {
                log_info("Question deleted: ID " . $receivedData['id']);
                send_response("Question successfully deleted", 200);
            }
        }
    }

$stmt->close();
?>