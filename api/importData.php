<?php

include 'setup.php';

    // Validate import data
    if (!isset($receivedData['metadata']) || !isset($receivedData['metadata']['version'])) {
        log_info("Import failed: Invalid file format");
        send_response("Invalid import file format", 400);
        exit;
    }

    $subjects = $receivedData['subjects'] ?? [];
    $topics = $receivedData['topics'] ?? [];
    $questions = $receivedData['questions'] ?? [];

    $importResults = array(
        'subjects_imported' => 0,
        'topics_imported' => 0,
        'questions_imported' => 0,
        'questions_updated' => 0,
        'subjects_skipped' => 0,
        'topics_skipped' => 0,
        'questions_skipped' => 0
    );

    // Begin transaction
    $mysqli->autocommit(false);

    try {
        // Import subjects
        foreach ($subjects as $subject) {
            // Check if subject already exists
            $checkQuery = "SELECT id FROM tblsubject WHERE subject = ?";
            $checkStmt = $mysqli->prepare($checkQuery);
            $checkStmt->bind_param("s", $subject['subject']);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows > 0) {
                $importResults['subjects_skipped']++;
                $checkStmt->close();
                continue;
            }
            $checkStmt->close();

            // Insert new subject
            $insertQuery = "INSERT INTO tblsubject (subject) VALUES (?)";
            $insertStmt = $mysqli->prepare($insertQuery);
            $insertStmt->bind_param("s", $subject['subject']);
            
            if ($insertStmt->execute()) {
                $importResults['subjects_imported']++;
            }
            $insertStmt->close();
        }

        // Import topics
        foreach ($topics as $topic) {
            // Find subject ID by name
            $subjectQuery = "SELECT id FROM tblsubject WHERE subject = (SELECT subject FROM tblsubject WHERE id = ?)";
            $subjectStmt = $mysqli->prepare($subjectQuery);
            $subjectStmt->bind_param("i", $topic['subjectid']);
            $subjectStmt->execute();
            $subjectResult = $subjectStmt->get_result();
            
            if ($subjectResult->num_rows === 0) {
                $importResults['topics_skipped']++;
                $subjectStmt->close();
                continue;
            }
            $subjectStmt->close();

            // Check if topic already exists
            $checkQuery = "SELECT id FROM tbltopic WHERE topic = ? AND subjectid = ?";
            $checkStmt = $mysqli->prepare($checkQuery);
            $checkStmt->bind_param("si", $topic['topic'], $topic['subjectid']);
            $checkStmt->execute();
            $result = $checkStmt->get_result();
            
            if ($result->num_rows > 0) {
                $importResults['topics_skipped']++;
                $checkStmt->close();
                continue;
            }
            $checkStmt->close();

            // Insert new topic
            $insertQuery = "INSERT INTO tbltopic (topic, subjectid) VALUES (?, ?)";
            $insertStmt = $mysqli->prepare($insertQuery);
            $insertStmt->bind_param("si", $topic['topic'], $topic['subjectid']);
            
            if ($insertStmt->execute()) {
                $importResults['topics_imported']++;
            }
            $insertStmt->close();
        }

        // Import questions
        foreach ($questions as $question) {
            // Check if topic exists
            $topicQuery = "SELECT id FROM tbltopic WHERE id = ?";
            $topicStmt = $mysqli->prepare($topicQuery);
            $topicStmt->bind_param("i", $question['topicid']);
            $topicStmt->execute();
            $topicResult = $topicStmt->get_result();

            if ($topicResult->num_rows === 0) {
                $importResults['questions_skipped']++;
                $topicStmt->close();
                continue;
            }
            $topicStmt->close();

            $attachments_json = json_encode($question['attachments'] ?? []);
            $order      = $question['question_order'] ?? 0;
            $markscheme = $question['markscheme'] ?? '';

            // If the JSON entry carries an id, check whether that row exists and UPDATE it
            $incomingId = isset($question['id']) ? intval($question['id']) : 0;
            if ($incomingId > 0) {
                $existsStmt = $mysqli->prepare("SELECT id FROM tblquestion WHERE id = ?");
                $existsStmt->bind_param("i", $incomingId);
                $existsStmt->execute();
                $exists = $existsStmt->get_result()->num_rows > 0;
                $existsStmt->close();

                if ($exists) {
                    $updateStmt = $mysqli->prepare(
                        "UPDATE tblquestion SET question = ?, topicid = ?, attachments = ?, markscheme = ?, question_order = ? WHERE id = ?"
                    );
                    $updateStmt->bind_param("sissii",
                        $question['question'],
                        $question['topicid'],
                        $attachments_json,
                        $markscheme,
                        $order,
                        $incomingId
                    );
                    if ($updateStmt->execute()) {
                        $importResults['questions_updated']++;
                    }
                    $updateStmt->close();
                    continue;
                }
            }

            // No matching id — insert as new (skip if identical text+topic already exists)
            $checkStmt = $mysqli->prepare("SELECT id FROM tblquestion WHERE question = ? AND topicid = ?");
            $checkStmt->bind_param("si", $question['question'], $question['topicid']);
            $checkStmt->execute();
            $duplicate = $checkStmt->get_result()->num_rows > 0;
            $checkStmt->close();

            if ($duplicate) {
                $importResults['questions_skipped']++;
                continue;
            }

            $insertStmt = $mysqli->prepare(
                "INSERT INTO tblquestion (question, topicid, attachments, markscheme, question_order) VALUES (?, ?, ?, ?, ?)"
            );
            $insertStmt->bind_param("sissi",
                $question['question'],
                $question['topicid'],
                $attachments_json,
                $markscheme,
                $order
            );
            if ($insertStmt->execute()) {
                $importResults['questions_imported']++;
            }
            $insertStmt->close();
        }

        // Commit transaction
        $mysqli->commit();
        $mysqli->autocommit(true);

        $message = sprintf(
            "Import completed: %d subjects, %d topics, %d questions imported, %d questions updated. %d subjects, %d topics, %d questions skipped.",
            $importResults['subjects_imported'],
            $importResults['topics_imported'],
            $importResults['questions_imported'],
            $importResults['questions_updated'],
            $importResults['subjects_skipped'],
            $importResults['topics_skipped'],
            $importResults['questions_skipped']
        );

        log_info("Data imported successfully: " . $message);
        send_response($message, 200);

    } catch (Exception $e) {
        // Rollback transaction
        $mysqli->rollback();
        $mysqli->autocommit(true);
        
        log_info("Import failed: " . $e->getMessage());
        send_response("Import failed: " . $e->getMessage(), 500);
    }

?>