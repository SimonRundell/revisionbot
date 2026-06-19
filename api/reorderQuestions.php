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

require_once 'simple_security.php';
include 'setup.php';

// Admin only (previously unauthenticated).
requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);
$callerIsSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;

    // Check if questions array is provided
    if (!isset($receivedData['questions']) || !is_array($receivedData['questions']) || empty($receivedData['questions'])) {
        log_info("Questions reorder failed: Questions array is required");
        send_response("Questions array is required", 400);
        exit;
    }

    $questions = $receivedData['questions'];
    $updatedCount = 0;

    // Add-only ownership: a department admin may only reorder questions their
    // department owns. Reject the whole batch if any belong elsewhere.
    if (!$callerIsSuper) {
        $callerDept = (int) ($caller['department_id'] ?? 0);
        $ids = [];
        foreach ($questions as $questionData) {
            if (isset($questionData['id'])) {
                $ids[] = (int) $questionData['id'];
            }
        }
        if (!empty($ids)) {
            $placeholders = str_repeat('?,', count($ids) - 1) . '?';
            $ownCheck = $mysqli->prepare(
                "SELECT COUNT(*) AS c FROM tblquestion WHERE id IN ($placeholders) "
                . "AND (owner_department_id IS NULL OR owner_department_id <> ?)"
            );
            $types = str_repeat('i', count($ids)) . 'i';
            $params = array_merge($ids, [$callerDept]);
            $ownCheck->bind_param($types, ...$params);
            $ownCheck->execute();
            $foreign = (int) ($ownCheck->get_result()->fetch_assoc()['c'] ?? 0);
            $ownCheck->close();
            if ($foreign > 0) {
                send_response("One or more questions are owned by another department and cannot be reordered here.", 403);
            }
        }
    }

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