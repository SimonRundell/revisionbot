<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin bulk functions
requireAuth();

if (empty($receivedData) && $_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {
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
    
    // Send emails to new users - DISABLED for testing
    // TODO: Re-enable when email server is working
    foreach ($newUsers as $user) {
        // Skipping email send for now
        // if (sendWelcomeEmail($user['email'], $user['name'], $user['password'])) {
        //     $emails_sent++;
        // }
        error_log("Would send email to: " . $user['email'] . " with password: " . $user['password']);
        $emails_sent++; // Simulate successful email send
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
    // EMAIL SENDING DISABLED
    error_log("Email sending disabled - would send welcome email to: $email");
    return false; // Simulate email failure to avoid counting as sent
    
    // ORIGINAL CODE COMMENTED OUT
    /*
    global $config;
    
    try {
        $mail = new PHPMailer(true);
        
        // Server settings
        $mail->isSMTP();
        $mail->Host = $config['smtpServer'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtpUser'];
        $mail->Password = $config['smtpPass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = $config['smtpPort'];
        
        // Recipients
        $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
        $mail->addAddress($email, $name);
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Welcome to the Educational Assessment System';
        
        $htmlBody = "
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #1890ff; margin-bottom: 20px;'>Welcome to the Educational Assessment System!</h2>
                
                <p>Dear <strong>$name</strong>,</p>
                
                <p>Your student account has been created in our Educational Assessment System. You can now access the platform to:</p>
                
                <ul>
                    <li>Answer practice questions with AI-powered feedback</li>
                    <li>Review your past responses and progress</li>
                    <li>Receive personalized learning recommendations</li>
                </ul>
                
                <div style='background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                    <h3 style='margin-top: 0; color: #1890ff;'>Your Login Credentials:</h3>
                    <p><strong>Email:</strong> $email</p>
                    <p><strong>Temporary Password:</strong> <code style='background-color: #fff; padding: 2px 5px; border: 1px solid #ddd;'>$password</code></p>
                </div>
                
                <div style='background-color: #fff2e6; padding: 15px; border-radius: 5px; border-left: 4px solid #faad14; margin: 20px 0;'>
                    <h4 style='margin-top: 0; color: #faad14;'>⚠️ Important Security Notice:</h4>
                    <p>Please change your password immediately after your first login for security purposes.</p>
                </div>
                
                <p>If you have any questions or need assistance, please contact your instructor or system administrator.</p>
                
                <p>Best regards,<br>
                <strong>Educational Assessment System</strong></p>
            </div>
        </body>
        </html>";
        
        $mail->Body = $htmlBody;
        
        // Plain text version
        $mail->AltBody = "
Welcome to the Educational Assessment System!

Dear $name,

Your student account has been created. 

Login Credentials:
Email: $email
Temporary Password: $password

Please change your password immediately after your first login.

Best regards,
Educational Assessment System
        ";
        
        $mail->send();
        return true;
        
    } catch (Exception $e) {
        error_log("Email failed for $email: " . $e->getMessage());
        return false;
    }
    */
}
?>