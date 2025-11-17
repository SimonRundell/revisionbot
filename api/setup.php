<?php
/****************************************************************************
 * Setup Module - Core Configuration and Utilities
 * 
 * Provides common functionality for all PHP API endpoints including:
 * - Database connection management
 * - CORS headers configuration
 * - JSON request/response handling
 * - Logging utilities
 * - Configuration file loading
 * 
 * This file is included by all API endpoints to ensure consistent
 * database access, error handling, and security headers.
 * 
 * @requires .config.json - Database and SMTP configuration
 * @global mysqli $mysqli - Database connection object
 * @global array $config - Configuration array from .config.json
 * @global array $receivedData - Decoded JSON POST data
 * 
 * @author Simon Rundell for CodeMonkey Design Ltd.
 * @version 2.0
 * @updated 2025-11-17 - Enhanced documentation and security
 ****************************************************************************/

// Configure CORS headers for cross-origin requests
header("Access-Control-Allow-Origin: *"); 
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Authorization, X-Requested-With");
header("Content-Type: application/json");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");
header("Expires: 0");

// debug
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    // Return 200 OK for preflight requests
    http_response_code(200);
    exit;
}


// Read connection information from a secure location
$config = json_decode(file_get_contents('./.config.json'), true);
$mysqli = new mysqli($config['servername'], $config['username'], $config['password'], $config['dbname']);

// Check connection
if ($mysqli->connect_error) {
    log_info("Connection failed: " . $mysqli->connect_error);
    send_response("Connection failed: " . $mysqli->connect_error, 500);
} else {
    log_info("Connected successfully to the database.");
}

// Read the raw POST data
$jsonPayload = file_get_contents('php://input');

// Decode the JSON payload into an associative array
$receivedData = json_decode($jsonPayload, true);

// Handle empty payload
if ($jsonPayload === '' || $receivedData === null) {
    $receivedData = [];
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    log_info("Received: " . json_encode($receivedData));
    $data = $receivedData;

    // Move the array check here, after decoding
    if (!is_array($data)) {
        log_info("Invalid JSON payload");
        send_response("Invalid JSON payload", 400);
        exit;
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Backend now updated to refuse GET requests
    send_response("GET requests are not supported.", 405);
    exit;
    // Assuming GET requests are handled differently and might not need JSON decoding
    // $data['action'] = $_GET['action']; 
    // $data['data'] = $_GET['data'];}

/**
 * Log output to browser console (for debugging)
 * 
 * Generates JavaScript console.log() statements embedded in HTML.
 * Useful for backend debugging visible in browser console.
 * 
 * @param mixed $output - Data to log (will be JSON encoded)
 * @param bool $with_script_tags - Whether to wrap in <script> tags (default: true)
 * @return void Echoes JavaScript to page
 */
function console_log($output, $with_script_tags = true) {
    $js_code = 'console.log(' . json_encode($output, JSON_HEX_TAG) . ');';
    if ($with_script_tags) {
        $js_code = '<script>' . $js_code . '</script>';
    }
    echo $js_code;
}

/**
 * Send JSON response and terminate script execution
 * 
 * Standardized response function used by all API endpoints.
 * Sets HTTP status code and returns JSON with status_code field.
 * Terminates script with die() to prevent further output.
 * 
 * @param mixed $response - Response data (string or array)
 * @param int $code - HTTP status code (default: 200)
 * @return void Terminates script execution
 * 
 * @example
 * send_response("Success message", 200);
 * send_response(["data" => $results], 200);
 * send_response("Error message", 500);
 */
function send_response($response, $code = 200) {
    http_response_code($code);

    // Ensure $response is an array
    if (!is_array($response)) {
        $response = ['message' => $response];
    }

    $response['status_code'] = $code; // Add the response code to the response data
    die(json_encode($response));
}

/**
 * Send JSON response without terminating script
 * 
 * Similar to send_response() but allows script to continue execution.
 * Used when additional processing is needed after sending response.
 * 
 * @param mixed $response - Response data (string or array)
 * @param int $code - HTTP status code (default: 200)
 * @return void Echoes JSON response
 * 
 * @see send_response() for terminating version
 */
function send_response_keep_alive($response, $code = 200) {
    http_response_code($code);

    // Ensure $response is an array
    if (!is_array($response)) {
        $response = ['message' => $response];
    }

    $response['status_code'] = $code; // Add the response code to the response data
    echo json_encode($response);
}

/**
 * Log information to server log file
 * 
 * Writes timestamped log entries to server.log file.
 * Currently commented out - uncomment file_put_contents line to enable.
 * 
 * @param string $log - Log message to write
 * @return void
 * 
 * @note Currently disabled for performance
 * @todo Enable in production with log rotation
 */
function log_info($log) {
    $currentDirectory = getcwd();
    $file=$currentDirectory.'/server.log';
    $currentDateTime = date('Y-m-d H:i:s');
    // file_put_contents($file, $currentDateTime." : ".$log.chr(13), FILE_APPEND);
} // log_info
