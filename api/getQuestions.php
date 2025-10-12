<?php
include 'setup.php';

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