<?php
/****************************************************************************
 * Send Admin Message Endpoint
 *
 * Allows admins to send a custom email to one or more users by user ID.
 * Each recipient receives a personalised copy with {{NAME}} substituted.
 *
 * Input (JSON POST):
 *   userIds  int[]   Required. Array of user IDs to message.
 *   subject  string  Required. Email subject line.
 *   body     string  Required. Plain-text message body. {{NAME}} is replaced
 *                              with each recipient's name before sending.
 *
 * Output (JSON):
 *   { message: "Sent N email(s).", sent: N, failed: M }
 *
 * Security:
 *   - requireAdmin($mysqli) — signed bearer token + admin flag check
 *
 * @requires PHPMailer - Email sending
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection and config
 * @version 1.0
 ****************************************************************************/

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
require_once 'simple_security.php';
include 'setup.php';
require_once __DIR__ . '/emailHelper.php';

requireAdmin($mysqli);

// Validate inputs
$userIds = $receivedData['userIds'] ?? [];
$subject = trim($receivedData['subject'] ?? '');
$body    = trim($receivedData['body']    ?? '');

if (!is_array($userIds) || count($userIds) === 0) {
    send_response('userIds must be a non-empty array.', 400);
}
if ($subject === '') {
    send_response('subject is required.', 400);
}
if ($body === '') {
    send_response('body is required.', 400);
}

// Sanitise and validate IDs
$safeIds = array_values(array_filter(array_map('intval', $userIds), fn($id) => $id > 0));
if (count($safeIds) === 0) {
    send_response('No valid user IDs provided.', 400);
}

// Fetch recipients — only active users to avoid messaging deactivated accounts
$placeholders = implode(',', array_fill(0, count($safeIds), '?'));
$stmt = $mysqli->prepare(
    "SELECT id, userName, email FROM tbluser WHERE id IN ($placeholders) AND is_active != 0"
);
$types = str_repeat('i', count($safeIds));
$stmt->bind_param($types, ...$safeIds);
$stmt->execute();
$result     = $stmt->get_result();
$recipients = $result->fetch_all(MYSQLI_ASSOC);
$stmt->close();

if (count($recipients) === 0) {
    send_response('No active users found for the given IDs.', 404);
}

$logoUrl = getLogoUrl();

$htmlTemplatePath = '../public/templates/admin_message.html';
$txtTemplatePath  = '../public/templates/admin_message.txt';

if (!file_exists($htmlTemplatePath)) {
    send_response('Admin message email template not found.', 500);
}
$hasTxtTemplate = file_exists($txtTemplatePath);

$appUrl = $config['appUrl'] ?? '';
$sent   = 0;
$failed = 0;
$errors = [];

foreach ($recipients as $recipient) {
    $recipientEmail = $recipient['email'];
    $recipientName  = $recipient['userName'];

    // Personalise the body — {{NAME}} → recipient's name
    $personalizedBody = str_replace('{{NAME}}', $recipientName, $body);

    // Build HTML: convert newlines to <br> before embedding in the template
    $personalizedBodyHtml = nl2br(htmlspecialchars($personalizedBody, ENT_QUOTES, 'UTF-8'));

    $htmlBody = renderEmailTemplate($htmlTemplatePath, [
        'NAME'         => htmlspecialchars($recipientName, ENT_QUOTES, 'UTF-8'),
        'SUBJECT'      => htmlspecialchars($subject, ENT_QUOTES, 'UTF-8'),
        'MESSAGE_BODY' => $personalizedBodyHtml,
        'APP_URL'      => htmlspecialchars($appUrl, ENT_QUOTES, 'UTF-8'),
        'logoUrl'      => htmlspecialchars($logoUrl, ENT_QUOTES, 'UTF-8'),
    ]);

    // Plain-text version
    if ($hasTxtTemplate) {
        $txtBody = renderEmailTemplate($txtTemplatePath, [
            'NAME'         => $recipientName,
            'SUBJECT'      => $subject,
            'MESSAGE_BODY' => $personalizedBody,
            'APP_URL'      => $appUrl,
        ]);
    } else {
        $txtBody = "Dear $recipientName,\n\n$personalizedBody\n\n---\nAI Revision Bot\n$appUrl";
    }

    try {
        $mail = createMailer($config);
        $mail->addAddress($recipientEmail, $recipientName);
        $mail->Subject  = $subject;
        $mail->Body     = $htmlBody;
        $mail->AltBody  = $txtBody;
        $mail->send();

        $sent++;
        error_log("Admin message sent to: $recipientEmail");

    } catch (Exception $e) {
        $failed++;
        $errors[] = "$recipientEmail: " . $e->getMessage();
        error_log("Admin message FAILED for $recipientEmail: " . $e->getMessage());
    }
}

$summary = "Sent $sent email(s).";
if ($failed > 0) {
    $summary .= " $failed failed.";
}

$httpCode = ($failed > 0 && $sent === 0) ? 500 : 200;
send_response(json_encode([
    'message' => $summary,
    'sent'    => $sent,
    'failed'  => $failed,
]), $httpCode);
?>
