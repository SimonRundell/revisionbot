<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access
requireAuth();

// Get POST data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    send_response('Invalid JSON data', 400);
    exit;
}

// Validate required fields
$requiredFields = ['email', 'userName', 'changedBy'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        send_response("Missing required field: $field", 400);
        exit;
    }
}

$email = $data['email'];
$userName = $data['userName'];
$changedBy = $data['changedBy']; // 'user' or 'administrator'

// Send password change notification
if (sendPasswordChangeNotification($email, $userName, $changedBy)) {
    send_response([
        'success' => true,
        'message' => 'Password change notification sent successfully'
    ]);
} else {
    send_response('Failed to send password change notification', 500);
}

function sendPasswordChangeNotification($email, $userName, $changedBy) {
    global $config;
    
    try {
        error_log("SMTP: Sending password change notification to: $email");
        
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
        error_log("SMTP: Auth User: " . $config['smtpUser']);
        
        // Recipients
        $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
        $mail->addAddress($email, $userName);
        
        // Content
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Subject = 'Password Changed - AI Revision Bot';
        
        $publicConfigPath = dirname(__DIR__) . '/public/.config.json';
        $publicConfig = file_exists($publicConfigPath)
            ? json_decode(file_get_contents($publicConfigPath), true)
            : [];

        $logoBaseUrl = rtrim((string) ($publicConfig['appBaseUrl'] ?? ''), '/');
        $logoUrl = $logoBaseUrl !== ''
            ? $logoBaseUrl . '/title_bw.png'
            : 'https://exe-coll.ac.uk/wp-content/themes/exeter-college/assets/images/logo.png';

        // Load HTML email template
        $templatePath = dirname(__DIR__) . '/public/templates/password_change_notification.html';
        if (file_exists($templatePath)) {
            $htmlBody = file_get_contents($templatePath);
            
            // Prepare values
            $datetime = date('F j, Y \a\t g:i A T');
            $changedByText = ($changedBy === 'user') ? 'You (self-service)' : 'System Administrator';
            
            // Replace placeholders with actual values
            $htmlBody = str_replace('{{NAME}}', htmlspecialchars($userName), $htmlBody);
            $htmlBody = str_replace('{{EMAIL}}', htmlspecialchars($email), $htmlBody);
            $htmlBody = str_replace('{{DATETIME}}', htmlspecialchars($datetime), $htmlBody);
            $htmlBody = str_replace('{{CHANGED_BY}}', htmlspecialchars($changedByText), $htmlBody);
            $htmlBody = str_replace('{{logoUrl}}', htmlspecialchars($logoUrl), $htmlBody);
        } else {
            error_log("Password change email template not found: $templatePath");
            throw new Exception("Email template file not found");
        }
        
        $mail->Body = $htmlBody;
        
        // Plain text version
        $textTemplatePath = dirname(__DIR__) . '/public/templates/password_change_notification.txt';
        if (file_exists($textTemplatePath)) {
            $textBody = file_get_contents($textTemplatePath);
            
            // Prepare values
            $datetime = date('F j, Y \a\t g:i A T');
            $changedByText = ($changedBy === 'user') ? 'You (self-service)' : 'System Administrator';
            
            // Replace placeholders with actual values
            $textBody = str_replace('{{NAME}}', $userName, $textBody);
            $textBody = str_replace('{{EMAIL}}', $email, $textBody);
            $textBody = str_replace('{{DATETIME}}', $datetime, $textBody);
            $textBody = str_replace('{{CHANGED_BY}}', $changedByText, $textBody);
            
            $mail->AltBody = $textBody;
        } else {
            // Fallback plain text version
            $mail->AltBody = "Your password has been changed. If you did not make this change, please contact your administrator immediately.";
        }
        
        error_log("SMTP: Attempting to send email to: $email");
        $mail->send();
        error_log("SMTP: Successfully sent password change notification to: $email");
        return true;
        
    } catch (Exception $e) {
        error_log("SMTP ERROR: Password change notification failed for $email");
        error_log("SMTP ERROR: " . $e->getMessage());
        error_log("SMTP ERROR: Code: " . $e->getCode());
        if (isset($mail) && method_exists($mail, 'ErrorInfo')) {
            error_log("SMTP ERROR: ErrorInfo: " . $mail->ErrorInfo);
        }
        return false;
    }
}
?>