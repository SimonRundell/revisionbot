<?php

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