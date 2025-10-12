<?php

include 'setup.php';

// Add teacher feedback columns to tblresponse table
$queries = [
    "ALTER TABLE tblresponse ADD COLUMN teacher_comment TEXT DEFAULT NULL",
    "ALTER TABLE tblresponse ADD COLUMN teacher_rating ENUM('R', 'A', 'G') DEFAULT NULL COMMENT 'R=Red, A=Amber, G=Green'",
    "ALTER TABLE tblresponse ADD COLUMN teacher_feedback_timestamp TIMESTAMP NULL DEFAULT NULL",
    "ALTER TABLE tblresponse ADD COLUMN teacher_id INT DEFAULT NULL COMMENT 'ID of teacher who provided feedback'"
];

foreach ($queries as $query) {
    $result = $mysqli->query($query);
    if ($result) {
        log_info("Successfully executed: " . $query);
        echo "✓ " . $query . "\n";
    } else {
        log_info("Failed to execute: " . $query . " Error: " . $mysqli->error);
        echo "✗ " . $query . " - Error: " . $mysqli->error . "\n";
    }
}

echo "\nDatabase schema update completed.\n";

?>