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
require_once __DIR__ . '/emailHelper.php';

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

    $mail = createMailer($config);
    $mail->SMTPDebug = 2;
    $mail->Debugoutput = function($str, $level) {
        error_log("SMTP Debug (Level $level): " . trim($str));
    };

    $mail->addAddress($email, $name);
    $mail->Subject = 'Welcome to the AI Revision Bot Revision Application';

    $logoUrl  = getLogoUrl();
    $appUrl   = $config['appUrl'] ?? 'http://localhost/';
    $htmlPath = '../public/templates/welcome_email.html';

    if (!file_exists($htmlPath)) {
        error_log("Email template not found: $htmlPath");
        send_response("Email template file not found", 500);
    }

    $mail->Body = renderEmailTemplate($htmlPath, [
        'NAME'     => htmlspecialchars($name),
        'EMAIL'    => htmlspecialchars($email),
        'PASSWORD' => htmlspecialchars($password),
        'APP_URL'  => htmlspecialchars($appUrl),
        'logoUrl'  => htmlspecialchars($logoUrl),
    ]);

    $txtPath = '../public/templates/welcome_email.txt';
    if (file_exists($txtPath)) {
        $mail->AltBody = renderEmailTemplate($txtPath, [
            'NAME'     => $name,
            'EMAIL'    => $email,
            'PASSWORD' => $password,
            'APP_URL'  => $appUrl,
        ]);
    } else {
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
