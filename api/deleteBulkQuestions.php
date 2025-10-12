<?php

include 'setup.php';

    // Check if IDs are provided
    if (!isset($receivedData['ids']) || !is_array($receivedData['ids']) || empty($receivedData['ids'])) {
        log_info("Bulk question delete failed: IDs array is required");
        send_response("Question IDs array is required", 400);
        exit;
    }

    $ids = $receivedData['ids'];
    $idCount = count($ids);

    // Validate that all IDs are integers
    foreach ($ids as $id) {
        if (!is_numeric($id) || intval($id) != $id) {
            log_info("Bulk question delete failed: Invalid ID format");
            send_response("All IDs must be valid integers", 400);
            exit;
        }
    }

    // Create placeholders for the IN clause
    $placeholders = str_repeat('?,', $idCount - 1) . '?';
    $query = "DELETE FROM tblquestion WHERE id IN ($placeholders)";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Bulk question delete prepare failed: " . $mysqli->error);
        send_response("Bulk question delete prepare failed: " . $mysqli->error, 500);
    } else {
        // Bind parameters dynamically
        $stmt->bind_param(str_repeat('i', $idCount), ...$ids);

        if (!$stmt->execute()) {
            log_info("Bulk question delete failed: " . $stmt->error);
            send_response("Bulk question delete failed: " . $stmt->error, 500);
        } else {
            $deletedCount = $stmt->affected_rows;
            
            if ($deletedCount === 0) {
                log_info("Bulk question delete: No questions found with provided IDs");
                send_response("No questions found with the provided IDs", 404);
            } else {
                log_info("Bulk question delete: " . $deletedCount . " questions deleted from IDs: " . implode(', ', $ids));
                send_response($deletedCount . " questions successfully deleted", 200);
            }
        }
    }

$stmt->close();
?>