<?php
/****************************************************************************
 * Reorder Questions Endpoint (Admin)
 * 
 * Updates the display order of multiple questions within a topic.
 * Allows drag-and-drop reordering in admin interface.
 * 
 * Uses transaction safety:
 * - All updates committed together or none at all
 * - Rollback on any error
 * - Ensures data consistency
 * 
 * Input format:
 * {
 *   "questions": [
 *     {"id": 1, "order": 1},
 *     {"id": 5, "order": 2},
 *     {"id": 3, "order": 3}
 *   ]
 * }
 * 
 * Security:
 * - No explicit security (should add requireAuth())
 * - Validates input array structure
 * - Transaction prevents partial updates
 * 
 * @requires setup.php - Database connection
 * @input receivedData['questions'] - Array of {id, order} objects
 * @output Success message with updated count
 * 
 * @version 1.0
 * @todo Add requireAuth() for production security
 ****************************************************************************/

include 'setup.php';

    // Check if questions array is provided
    if (!isset($receivedData['questions']) || !is_array($receivedData['questions']) || empty($receivedData['questions'])) {
        log_info("Questions reorder failed: Questions array is required");
        send_response("Questions array is required", 400);
        exit;
    }

    $questions = $receivedData['questions'];
    $updatedCount = 0;

    // Begin transaction
    $mysqli->autocommit(false);

    try {
        foreach ($questions as $questionData) {
            if (!isset($questionData['id']) || !isset($questionData['order'])) {
                throw new Exception("Each question must have id and order fields");
            }

            $query = "UPDATE tblquestion SET question_order = ? WHERE id = ?";
            $stmt = $mysqli->prepare($query);
            
            if (!$stmt) {
                throw new Exception("Prepare failed: " . $mysqli->error);
            }

            $stmt->bind_param("ii", $questionData['order'], $questionData['id']);
            
            if (!$stmt->execute()) {
                throw new Exception("Execute failed: " . $stmt->error);
            }

            $updatedCount += $stmt->affected_rows;
            $stmt->close();
        }

        // Commit transaction
        $mysqli->commit();
        $mysqli->autocommit(true);

        log_info("Questions reordered: " . $updatedCount . " questions updated");
        send_response("Questions successfully reordered", 200);

    } catch (Exception $e) {
        // Rollback transaction
        $mysqli->rollback();
        $mysqli->autocommit(true);
        
        log_info("Questions reorder failed: " . $e->getMessage());
        send_response("Questions reorder failed: " . $e->getMessage(), 500);
    }

?>