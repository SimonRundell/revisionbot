<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';
require_once 'simple_security.php';
include 'setup.php';
require_once __DIR__ . '/emailHelper.php';

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

        $mail = createMailer($config);
        $mail->SMTPDebug = 2;
        $mail->Debugoutput = function($str, $level) {
            error_log("SMTP Debug (Level $level): " . trim($str));
        };

        $mail->addAddress($email, $userName);
        $mail->Subject = 'Password Changed - AI Revision Bot';

        $logoUrl       = getLogoUrl();
        $datetime      = date('F j, Y \a\t g:i A T');
        $changedByText = ($changedBy === 'user') ? 'You (self-service)' : 'System Administrator';

        $htmlPath = dirname(__DIR__) . '/public/templates/password_change_notification.html';
        if (!file_exists($htmlPath)) {
            error_log("Password change email template not found: $htmlPath");
            throw new Exception("Email template file not found");
        }

        $mail->Body = renderEmailTemplate($htmlPath, [
            'NAME'       => htmlspecialchars($userName),
            'EMAIL'      => htmlspecialchars($email),
            'DATETIME'   => htmlspecialchars($datetime),
            'CHANGED_BY' => htmlspecialchars($changedByText),
            'logoUrl'    => htmlspecialchars($logoUrl),
        ]);

        $txtPath = dirname(__DIR__) . '/public/templates/password_change_notification.txt';
        if (file_exists($txtPath)) {
            $mail->AltBody = renderEmailTemplate($txtPath, [
                'NAME'       => $userName,
                'EMAIL'      => $email,
                'DATETIME'   => $datetime,
                'CHANGED_BY' => $changedByText,
            ]);
        } else {
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