<?php
/****************************************************************************
 * Get Questions Endpoint
 * 
 * Retrieves all questions for a specified topic.
 * Returns questions ordered by question_order for proper sequencing.
 * 
 * Security:
 * - Protected by blockDirectAccess()
 * - Filters by topic ID
 * - Includes question text, markscheme, and attachments
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['topicid'] - Topic ID to filter questions
 * @output JSON array of questions with full details
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access
blockDirectAccess();

$query = "SELECT * FROM tblquestion WHERE topicid = ? ORDER BY question_order ASC, id ASC";
$stmt = $mysqli->prepare($query);
$stmt->bind_param("i", $receivedData['topicid']
); 

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