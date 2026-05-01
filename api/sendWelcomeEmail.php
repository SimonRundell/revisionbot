<?php
/****************************************************************************
 * Send Welcome Email Endpoint
 * 
 * Sends a welcome email to a newly created user with login credentials.
 * Used by admin when manually creating users or for resending credentials.
 * 
 * Features:
 * - Uses HTML and plain text email templates
 * - Includes app URL link
 * - Sends login credentials
 * - Security reminder to change password
 * 
 * Security:
 * - Protected by requireAuth() - Admin only
 * - Validates required fields
 * 
 * @requires PHPMailer - Email sending
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection and config
 * @input receivedData['email'] - User email address
 * @input receivedData['userName'] - User's full name
 * @input receivedData['password'] - Plaintext password to send
 * @output Success or error message
 * 
 * @version 1.0
 ****************************************************************************/

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
require_once 'simple_security.php';
include 'setup.php';

// Require admin authentication
requireAuth();

// Validate required fields
if (empty($receivedData['email']) || empty($receivedData['userName']) || empty($receivedData['password'])) {
    send_response('Missing required fields: email, userName, and password are required.', 400);
}

$email = $receivedData['email'];
$name = $receivedData['userName'];
$password = $receivedData['password'];

try {
    error_log("SMTP: Attempting to send welcome email to: $email");
    
    $mail = new PHPMailer(true);
    
    // Enable SMTP debug output (0=off, 1=client, 2=client+server, 3=verbose)
    $mail->SMTPDebug = 2;
    $mail->Debugoutput = function($str, $level) {
        error_log("SMTP Debug (Level $level): " . trim($str));
    };
    
    // Server settings
    $mail->isSMTP();
    $mail->Host = $config['smtpServer'];
    
    // Conditionally enable SMTP auth and encryption (disable for local Mailpit)
    if (!empty($config['smtpSecure'])) {
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtpUser'];
        $mail->Password = $config['smtpPass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPAuth = false;
    }
    
    $mail->Port = $config['smtpPort'];
    
    error_log("SMTP: Attempting connection to " . $config['smtpServer'] . ":" . $config['smtpPort']);
    
    // Recipients
    $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
    $mail->addAddress($email, $name);
    
    // Content
    $mail->isHTML(true);
    $mail->CharSet = 'UTF-8';
    $mail->Encoding = 'base64';
    $mail->Subject = 'Welcome to the AI Revision Bot Revision Application';
    
    // Get logo URL from public config
    $publicConfigPath = dirname(__DIR__) . '/public/.config.json';
    $publicConfig = file_exists($publicConfigPath)
        ? json_decode(file_get_contents($publicConfigPath), true)
        : [];

    $logoBaseUrl = rtrim((string) ($publicConfig['appBaseUrl'] ?? ''), '/');
    $logoUrl = $logoBaseUrl !== ''
        ? $logoBaseUrl . '/title_bw.png'
        : 'https://exe-coll.ac.uk/wp-content/themes/exeter-college/assets/images/logo.png';
    
    // Load email template
    $templatePath = '../public/templates/welcome_email.html';
    if (file_exists($templatePath)) {
        $htmlBody = file_get_contents($templatePath);
        
        // Replace placeholders with actual values
        $htmlBody = str_replace('{{NAME}}', htmlspecialchars($name), $htmlBody);
        $htmlBody = str_replace('{{EMAIL}}', htmlspecialchars($email), $htmlBody);
        $htmlBody = str_replace('{{PASSWORD}}', htmlspecialchars($password), $htmlBody);
        $htmlBody = str_replace('{{APP_URL}}', htmlspecialchars($config['appUrl'] ?? 'http://localhost/'), $htmlBody);
        $htmlBody = str_replace('{{logoUrl}}', htmlspecialchars($logoUrl), $htmlBody);
        
        $mail->Body = $htmlBody;
    } else {
        error_log("Email template not found: $templatePath");
        send_response("Email template file not found", 500);
    }
    
    // Plain text version
    $textTemplatePath = '../public/templates/welcome_email.txt';
    if (file_exists($textTemplatePath)) {
        $textBody = file_get_contents($textTemplatePath);
        
        // Replace placeholders with actual values
        $textBody = str_replace('{{NAME}}', $name, $textBody);
        $textBody = str_replace('{{EMAIL}}', $email, $textBody);
        $textBody = str_replace('{{PASSWORD}}', $password, $textBody);
        $textBody = str_replace('{{APP_URL}}', $config['appUrl'] ?? 'http://localhost/', $textBody);
        
        $mail->AltBody = $textBody;
    } else {
        // Fallback plain text version
        $appUrl = $config['appUrl'] ?? 'http://localhost/';
        $mail->AltBody = "Welcome to the AI Revision Bot!\n\nDear $name,\n\nYour account has been created.\n\nLogin: $email\nPassword: $password\n\nAccess the Application:\n$appUrl\n\nPlease change your password immediately after your first login for security purposes.\n\nBest regards,\nAI Revision Bot";
    }
    
    error_log("SMTP: Attempting to send email to: $email");
    $mail->send();
    error_log("SMTP: Successfully sent welcome email to: $email");
    
    send_response('Welcome email sent successfully', 200);
    
} catch (Exception $e) {
    error_log("SMTP ERROR: Email failed for $email");
    error_log("SMTP ERROR: " . $e->getMessage());
    error_log("SMTP ERROR: Code: " . $e->getCode());
    if (isset($mail) && method_exists($mail, 'ErrorInfo')) {
        error_log("SMTP ERROR: ErrorInfo: " . $mail->ErrorInfo);
    }
    send_response('Failed to send welcome email: ' . $e->getMessage(), 500);
}
?>
