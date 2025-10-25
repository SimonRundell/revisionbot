<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to data export
requireAuth();

    // Get export type from request
    $exportType = isset($receivedData['type']) ? $receivedData['type'] : 'all';
    $subjectId = isset($receivedData['subjectId']) ? intval($receivedData['subjectId']) : null;
    $topicId = isset($receivedData['topicId']) ? intval($receivedData['topicId']) : null;

    $export = array();

    try {
        if ($exportType === 'all' || $exportType === 'subject') {
            // Export subjects
            $subjectQuery = "SELECT * FROM tblsubject";
            if ($subjectId) {
                $subjectQuery .= " WHERE id = " . $subjectId;
            }
            $subjectQuery .= " ORDER BY subject";
            
            $subjectResult = $mysqli->query($subjectQuery);
            $export['subjects'] = array();
            
            while ($subject = $subjectResult->fetch_assoc()) {
                $export['subjects'][] = $subject;
            }

            // Export topics
            $topicQuery = "SELECT * FROM tbltopic";
            if ($subjectId) {
                $topicQuery .= " WHERE subjectid = " . $subjectId;
            }
            $topicQuery .= " ORDER BY topic";
            
            $topicResult = $mysqli->query($topicQuery);
            $export['topics'] = array();
            
            while ($topic = $topicResult->fetch_assoc()) {
                $export['topics'][] = $topic;
            }

            // Export questions
            $questionQuery = "
                SELECT q.*, t.subjectid 
                FROM tblquestion q 
                JOIN tbltopic t ON q.topicid = t.id";
            
            if ($topicId) {
                $questionQuery .= " WHERE q.topicid = " . $topicId;
            } elseif ($subjectId) {
                $questionQuery .= " WHERE t.subjectid = " . $subjectId;
            }
            
            $questionQuery .= " ORDER BY q.topicid, q.question_order, q.id";
            
            $questionResult = $mysqli->query($questionQuery);
            $export['questions'] = array();
            
            while ($question = $questionResult->fetch_assoc()) {
                // Parse JSON fields
                if (isset($question['attachments']) && $question['attachments']) {
                    $question['attachments'] = json_decode($question['attachments'], true);
                }
                $export['questions'][] = $question;
            }
        }

        // Add metadata
        $export['metadata'] = array(
            'exported_at' => date('Y-m-d H:i:s'),
            'export_type' => $exportType,
            'version' => '1.0',
            'total_subjects' => count($export['subjects'] ?? []),
            'total_topics' => count($export['topics'] ?? []),
            'total_questions' => count($export['questions'] ?? [])
        );

        log_info("Data exported successfully - Type: " . $exportType);
        
        // Set appropriate headers for file download
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="quiz_export_' . date('Y-m-d_H-i-s') . '.json"');
        
        echo json_encode($export, JSON_PRETTY_PRINT);
        exit;

    } catch (Exception $e) {
        log_info("Export failed: " . $e->getMessage());
        send_response("Export failed: " . $e->getMessage(), 500);
    }

?>