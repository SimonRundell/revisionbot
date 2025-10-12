<?php
include 'setup.php';

$query = "INSERT INTO tblsubjects (school, subject) VALUES (1,?)";
$stmt = $mysqli->prepare($query);
$stmt->bind_param("s", $receivedData["subject"],
);

if ($stmt->execute()) {
    $subjectId = $stmt->insert_id; // Get the ID of the inserted record
    send_response(array("outcome" => "New Subject added", "subjectId" => $subjectId), 200);
} else {
    send_response("Error: " . $mysqli->error, 500);
}   