<?php
include 'setup.php';

// Convert fileList array to JSON string
$fileListJson = json_encode($receivedData["fileList"]);

$query = "INSERT INTO tblquestion (school, subject, subjectTopic, question, markscheme, fileList) VALUES (1,?,?,?,?,?)";
$stmt = $mysqli->prepare($query);
$stmt->bind_param("iisss",  $receivedData["subject"],
                            $receivedData["subjectTopic"],
                            $receivedData["question"],
                            $receivedData["markscheme"],
                            $fileListJson
);

if ($stmt->execute()) {
    $questionId = $stmt->insert_id; // Get the ID of the inserted record
    send_response(array("outcome" => "New Question added", "QuestionId" => $questionId), 200);
} else {
    send_response("Error: " . $mysqli->error, 500);
}   