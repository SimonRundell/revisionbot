<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin bulk functions
requireAuth();

// For file uploads, we need to handle form data differently
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {
    $receivedData = [];
    foreach ($_POST as $key => $value) {
        $receivedData[$key] = is_string($value) ? trim($value) : $value;
    }
}

// TODO: Add proper admin authentication check
// For now, matching the existing API pattern (no authentication)
// This should be secured in production

// Check if file was uploaded
if (!isset($_FILES['csvFile'])) {
    send_response('No CSV file found in request.', 400);
    exit;
}

if ($_FILES['csvFile']['error'] !== UPLOAD_ERR_OK) {
    $errorMessage = 'File upload error: ';
    switch ($_FILES['csvFile']['error']) {
        case UPLOAD_ERR_INI_SIZE:
            $errorMessage .= 'File size exceeds upload_max_filesize directive.';
            break;
        case UPLOAD_ERR_FORM_SIZE:
            $errorMessage .= 'File size exceeds MAX_FILE_SIZE directive.';
            break;
        case UPLOAD_ERR_PARTIAL:
            $errorMessage .= 'File was only partially uploaded.';
            break;
        case UPLOAD_ERR_NO_FILE:
            $errorMessage .= 'No file was uploaded.';
            break;
        case UPLOAD_ERR_NO_TMP_DIR:
            $errorMessage .= 'Missing temporary folder.';
            break;
        case UPLOAD_ERR_CANT_WRITE:
            $errorMessage .= 'Failed to write file to disk.';
            break;
        case UPLOAD_ERR_EXTENSION:
            $errorMessage .= 'File upload stopped by extension.';
            break;
        default:
            $errorMessage .= 'Unknown upload error.';
            break;
    }
    send_response($errorMessage, 400);
    exit;
}

// Get the default password using the standard receivedData handle
$defaultPassword = isset($receivedData['defaultPassword']) ? $receivedData['defaultPassword'] : 'student123';

if (empty($defaultPassword)) {
    send_response('Default password is required.', 400);
    exit;
}

// Get the user access settings, default to subject 1 with all access
$userAccess = isset($receivedData['userAccess']) ? $receivedData['userAccess'] : '{"1":"all"}';

// Validate userAccess is valid JSON
if (!empty($userAccess) && json_decode($userAccess) === null) {
    send_response('Invalid userAccess format. Must be valid JSON.', 400);
    exit;
}

// Hash the default password using MD5 to match existing login expectations
$hashedPassword = md5($defaultPassword);

// Read and parse CSV file
$csvFile = $_FILES['csvFile']['tmp_name'];
$csvData = [];
$errors = [];
$created_count = 0;
$emails_sent = 0;



if (($handle = fopen($csvFile, "r")) !== FALSE) {
    $header = fgetcsv($handle); // Get header row
    
    // Remove BOM from first column if present
    if (!empty($header[0])) {
        $header[0] = preg_replace('/^\xEF\xBB\xBF/', '', $header[0]); // Remove UTF-8 BOM
        $header[0] = preg_replace('/^\xFF\xFE/', '', $header[0]); // Remove UTF-16 LE BOM
        $header[0] = preg_replace('/^\xFE\xFF/', '', $header[0]); // Remove UTF-16 BE BOM
    }
    

    
    // Validate header
    $requiredColumns = ['email', 'name'];
    $optionalColumns = ['department', 'locale'];
    $allColumns = array_merge($requiredColumns, $optionalColumns);
    
    // Check if required columns exist
    foreach ($requiredColumns as $required) {
        if (!in_array($required, $header)) {
            send_response("Missing required column: $required", 400);
            exit;
        }
    }
    
    $rowNumber = 1;
    while (($data = fgetcsv($handle)) !== FALSE) {
        $rowNumber++;
        
        if (count($data) < count($requiredColumns)) {
            $errors[] = "Row $rowNumber: Not enough columns";
            continue;
        }
        
        // Map CSV data to associative array
        $row = [];
        foreach ($header as $index => $column) {
            $row[$column] = isset($data[$index]) ? trim($data[$index]) : '';
        }
        
        // Validate required fields
        if (empty($row['email']) || empty($row['name'])) {
            $errors[] = "Row $rowNumber: Email and name are required";
            continue;
        }
        
        // Validate email format
        if (!filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = "Row $rowNumber: Invalid email format: " . $row['email'];
            continue;
        }
        
        // Set defaults for optional fields
        $row['department'] = $row['department'] ?? '';
        $row['locale'] = !empty($row['locale']) ? $row['locale'] : 'en-GB';
        
        $csvData[] = $row;
    }
    fclose($handle);
} else {
    send_response('Could not read CSV file.', 400);
    exit;
}

if (empty($csvData)) {
    send_response('No valid data found in CSV file. Errors: ' . implode(', ', $errors), 400);
    exit;
}

// Start database transaction
$mysqli->begin_transaction();

try {
    // Prepare statements
    $checkUserStmt = $mysqli->prepare("SELECT id FROM tbluser WHERE email = ?");
    $insertUserStmt = $mysqli->prepare("
        INSERT INTO tbluser (email, passwordHash, userName, userLocation, userLocale, admin, userEmailValidated, userAccess) 
        VALUES (?, ?, ?, ?, ?, 0, 0, ?)
    ");
    
    $newUsers = [];
    
    foreach ($csvData as $index => $userData) {
        // Check if user already exists
        $checkUserStmt->bind_param("s", $userData['email']);
        $checkUserStmt->execute();
        $result = $checkUserStmt->get_result();
        
        if ($result->num_rows > 0) {
            $errors[] = "User with email {$userData['email']} already exists - skipped";
            continue;
        }
        
        // Insert new user
        $insertUserStmt->bind_param(
            "ssssss",
            $userData['email'],
            $hashedPassword,
            $userData['name'],
            $userData['department'],
            $userData['locale'],
            $userAccess
        );
        
        if ($insertUserStmt->execute()) {
            $created_count++;
            $newUsers[] = [
                'email' => $userData['email'],
                'name' => $userData['name'],
                'password' => $defaultPassword
            ];
        } else {
            $errors[] = "Failed to create user: {$userData['email']} - " . $insertUserStmt->error;
        }
    }
    
    // Commit transaction
    $mysqli->commit();
    
    // Send emails to new users - ENABLED
    foreach ($newUsers as $user) {
        if (sendWelcomeEmail($user['email'], $user['name'], $user['password'])) {
            $emails_sent++;
            error_log("Successfully sent welcome email to: " . $user['email']);
        } else {
            error_log("Failed to send welcome email to: " . $user['email']);
        }
    }
    
    $response = [
        'success' => true,
        'message' => "Bulk upload completed",
        'created_count' => $created_count,
        'emails_sent' => $emails_sent,
        'errors' => $errors
    ];
    
    if (!empty($errors)) {
        $response['warnings'] = $errors;
    }
    
    send_response($response);
    
} catch (Exception $e) {
    // Rollback transaction on error
    $mysqli->rollback();
    error_log("Bulk upload failed: " . $e->getMessage());
    send_response('Database error occurred during bulk upload: ' . $e->getMessage(), 500);
}

function sendWelcomeEmail($email, $name, $password) {
    // EMAIL SENDING ENABLED
    global $config;
    
    try {
        error_log("Attempting to send welcome email to: $email");
        
        $mail = new PHPMailer(true);
        
        // Enable verbose debug output (disable in production)
        // $mail->SMTPDebug = 2;
        
        // Server settings
        $mail->isSMTP();
        $mail->Host = $config['smtpServer'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtpUser'];
        $mail->Password = $config['smtpPass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // Use STARTTLS for port 587
        $mail->Port = $config['smtpPort'];
        
        error_log("SMTP Config - Host: {$config['smtpServer']}, Port: {$config['smtpPort']}, User: {$config['smtpUser']}");
        
        // Recipients
        $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
        $mail->addAddress($email, $name);
        
        // Content
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Subject = 'Welcome to the AI Revision Bot Revision Application';
        
        // Load email template
        $templatePath = '../public/templates/welcome_email.html';
        if (file_exists($templatePath)) {
            $htmlBody = file_get_contents($templatePath);
            
            // Replace placeholders with actual values
            $htmlBody = str_replace('{{NAME}}', htmlspecialchars($name), $htmlBody);
            $htmlBody = str_replace('{{EMAIL}}', htmlspecialchars($email), $htmlBody);
            $htmlBody = str_replace('{{PASSWORD}}', htmlspecialchars($password), $htmlBody);
        } else {
            error_log("Email template not found: $templatePath");
            throw new Exception("Email template file not found");
        }
        
        $mail->Body = $htmlBody;
        
        // Plain text version
        $textTemplatePath = '../public/templates/welcome_email.txt';
        if (file_exists($textTemplatePath)) {
            $textBody = file_get_contents($textTemplatePath);
            
            // Replace placeholders with actual values
            $textBody = str_replace('{{NAME}}', $name, $textBody);
            $textBody = str_replace('{{EMAIL}}', $email, $textBody);
            $textBody = str_replace('{{PASSWORD}}', $password, $textBody);
            
            $mail->AltBody = $textBody;
        } else {
            // Fallback plain text version
            $mail->AltBody = "Welcome to the AI Revision Bot!\n\nDear $name,\n\nYour account has been created.\n\nLogin: $email\nPassword: $password\n\nBest regards,\nAI Revision Bot";
        }
        
        $mail->send();
        error_log("Successfully sent welcome email to: $email");
        return true;
        
    } catch (Exception $e) {
        error_log("Email failed for $email: " . $e->getMessage());
        return false;
    }
}
?>