<?php
/****************************************************************************
 * Create Subject Endpoint (Admin)
 * 
 * Creates new subject categories in the system.
 * Subjects are top-level organizational units containing topics and questions.
 * 
 * Examples:
 * - Computing
 * - Mathematics
 * - Science
 * - History
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Simple text field validation
 * - Subject names should be unique (enforced at app level)
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['subject'] - Subject name
 * @output Success or error message
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Admin only. New content is owned by the creator's department (NULL for the
// super-admin = super-owned), which governs who may later edit/delete it.
requireAdmin($mysqli);
$ownerDepartmentId = getCallerDepartmentId($mysqli);

    $query = "INSERT INTO tblsubject (subject, owner_department_id) VALUES (?, ?)";


    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Subject create prepare failed: " . $mysqli->error);
        send_response("Subject create prepare failed: " . $mysqli->error, 500);
    } else {
        $stmt->bind_param("si", $receivedData['subject'], $ownerDepartmentId);
                                 
        if (!$stmt->execute()) {
            log_info("Subject creation failed: " . $stmt->error);
            send_response("Subject creation failed: " . $stmt->error, 500);
        } else {
            log_info("Subject created: " . $receivedData['subject']);
            send_response("Subject successfully created", 200);
        }
    }


$stmt->close();
?>