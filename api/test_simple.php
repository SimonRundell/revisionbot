<?php
include 'setup.php';

/**
 * Simple analytics test endpoint
 */

log_info("Simple analytics test called");

// Test simple query
$result = $mysqli->query("SELECT 1 as test");
if ($result) {
    $row = $result->fetch_assoc();
    log_info("Simple query successful: " . json_encode($row));
    send_response("Analytics API is working. Database connection OK.", 200);
} else {
    log_info("Simple query failed: " . $mysqli->error);
    send_response("Database query failed: " . $mysqli->error, 500);
}
?>