<?php
// Simple test script to debug analytics API
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Include database connection
require_once 'setup.php';

echo "Testing database connection...\n";

// Test basic connection
if ($mysqli->connect_error) {
    echo "Connection failed: " . $mysqli->connect_error . "\n";
    exit;
}

echo "Database connected successfully\n";

// Test if tables exist
$tables_to_check = ['tblresponse', 'tbluser', 'tblquestion', 'tbltopic', 'tblsubject'];

foreach ($tables_to_check as $table) {
    $result = $mysqli->query("SHOW TABLES LIKE '$table'");
    if ($result->num_rows > 0) {
        echo "✓ Table $table exists\n";
    } else {
        echo "✗ Table $table does NOT exist\n";
    }
}

// Test basic query on tblresponse
echo "\nTesting tblresponse table...\n";
$result = $mysqli->query("SELECT COUNT(*) as count FROM tblresponse");
if ($result) {
    $row = $result->fetch_assoc();
    echo "✓ tblresponse has " . $row['count'] . " records\n";
} else {
    echo "✗ Error querying tblresponse: " . $mysqli->error . "\n";
}

// Test basic query on tbluser
echo "\nTesting tbluser table...\n";
$result = $mysqli->query("SELECT COUNT(*) as count FROM tbluser WHERE admin != 1");
if ($result) {
    $row = $result->fetch_assoc();
    echo "✓ tbluser has " . $row['count'] . " non-admin users\n";
} else {
    echo "✗ Error querying tbluser: " . $mysqli->error . "\n";
}

// Test the departments available
echo "\nTesting available departments...\n";
$result = $mysqli->query("SELECT DISTINCT userLocation FROM tbluser WHERE admin != 1 AND userLocation IS NOT NULL");
if ($result) {
    echo "Available departments:\n";
    while ($row = $result->fetch_assoc()) {
        echo "  - " . $row['userLocation'] . "\n";
    }
} else {
    echo "✗ Error querying departments: " . $mysqli->error . "\n";
}

echo "\nTest completed.\n";
?>