<?php
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