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

// Build logo URL from public config
$publicConfigPath = dirname(__DIR__) . '/public/.config.json';
$publicConfig     = file_exists($publicConfigPath)
    ? json_decode(file_get_contents($publicConfigPath), true)
    : [];
$logoBaseUrl = rtrim((string)($publicConfig['appBaseUrl'] ?? ''), '/');
$logoUrl     = $logoBaseUrl !== ''
    ? $logoBaseUrl . '/title_bw.png'
    : 'https://exe-coll.ac.uk/wp-content/themes/exeter-college/assets/images/logo.png';

// Load templates
$htmlTemplatePath = '../public/templates/admin_message.html';
$txtTemplatePath  = '../public/templates/admin_message.txt';
$htmlTemplate     = file_exists($htmlTemplatePath) ? file_get_contents($htmlTemplatePath) : null;
$txtTemplate      = file_exists($txtTemplatePath)  ? file_get_contents($txtTemplatePath)  : null;

if ($htmlTemplate === null) {
    send_response('Admin message email template not found.', 500);
}

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

    $htmlBody = str_replace('{{NAME}}',         htmlspecialchars($recipientName, ENT_QUOTES, 'UTF-8'), $htmlTemplate);
    $htmlBody = str_replace('{{SUBJECT}}',      htmlspecialchars($subject, ENT_QUOTES, 'UTF-8'),       $htmlBody);
    $htmlBody = str_replace('{{MESSAGE_BODY}}', $personalizedBodyHtml,                                  $htmlBody);
    $htmlBody = str_replace('{{APP_URL}}',      htmlspecialchars($appUrl, ENT_QUOTES, 'UTF-8'),         $htmlBody);
    $htmlBody = str_replace('{{logoUrl}}',      htmlspecialchars($logoUrl, ENT_QUOTES, 'UTF-8'),        $htmlBody);

    // Plain-text version
    if ($txtTemplate !== null) {
        $txtBody = str_replace('{{NAME}}',         $recipientName,     $txtTemplate);
        $txtBody = str_replace('{{SUBJECT}}',      $subject,           $txtBody);
        $txtBody = str_replace('{{MESSAGE_BODY}}', $personalizedBody,  $txtBody);
        $txtBody = str_replace('{{APP_URL}}',      $appUrl,            $txtBody);
    } else {
        $txtBody = "Dear $recipientName,\n\n$personalizedBody\n\n---\nAI Revision Bot\n$appUrl";
    }

    try {
        $mail = new PHPMailer(true);
        $mail->SMTPDebug  = 0;
        $mail->isSMTP();
        $mail->Host = $config['smtpServer'];

        if (!empty($config['smtpSecure'])) {
            $mail->SMTPAuth   = true;
            $mail->Username   = $config['smtpUser'];
            $mail->Password   = $config['smtpPass'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPAuth = false;
        }

        $mail->Port     = $config['smtpPort'];
        $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
        $mail->addAddress($recipientEmail, $recipientName);
        $mail->isHTML(true);
        $mail->CharSet  = 'UTF-8';
        $mail->Encoding = 'base64';
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
