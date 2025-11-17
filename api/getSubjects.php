<?php
/****************************************************************************
 * Get Subjects Endpoint
 * 
 * Retrieves all available subjects from the database.
 * Used to populate subject selection dropdowns in student and admin interfaces.
 * 
 * Security:
 * - Protected by blockDirectAccess()
 * - No sensitive data exposed
 * - Available to all authenticated users
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @output JSON array of all subjects with id and subject name
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access
blockDirectAccess();

$query = "SELECT * FROM tblsubject";
$stmt = $mysqli->prepare($query);

$stmt->execute(); // Execute the prepared statement
$result = $stmt->get_result(); // Get the result of the executed statement

if ($result) {
    $rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
    $json = json_encode($rows);
    send_response($json, 200);
} else {
    // Handle the error if the query fails
    send_response("Error: " . mysqli_error($connection), 500);
}