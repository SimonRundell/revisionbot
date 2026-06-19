<?php
/****************************************************************************
 * Create Topic Endpoint (Admin)
 * 
 * Creates new topics within a subject.
 * Topics organize questions into specific areas of study.
 * 
 * Examples:
 * - Subject: Computing → Topics: Arrays, Loops, Functions
 * - Subject: Mathematics → Topics: Algebra, Geometry, Calculus
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Validates subject ID exists
 * - Topic names should be unique per subject (enforced at app level)
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['topic'] - Topic name
 * @input receivedData['subjectid'] - Parent subject ID
 * @output Success or error message
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Admin only. New topic is owned by the creator's department (add-only tree).
requireAdmin($mysqli);
$ownerDepartmentId = getCallerDepartmentId($mysqli);

    $query = "INSERT INTO tbltopic (topic, subjectid, owner_department_id) VALUES (?, ?, ?)";


    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Topic create prepare failed: " . $mysqli->error);
        send_response("Topic create prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt->bind_param("sii", $receivedData['topic'], $receivedData['subjectid'], $ownerDepartmentId);

        if (!$stmt->execute()) {
            log_info("Topic creation failed: " . $stmt->error);
            send_response("Topic creation failed: " . $stmt->error, 500);
        } else {
            log_info("Topic created: " . $receivedData['topic']);
            send_response("Topic successfully created", 200);
        }
    }


$stmt->close();
?>