<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

include 'setup.php';

function send_email($to, $subject, $message, $config) {
    // EMAIL SENDING ENABLED
    log_info("Config: " . json_encode($config));

    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = $config['smtpServer'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtpUser'];
        $mail->Password = $config['smtpPass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; // Use STARTTLS for port 587
        $mail->Port = $config['smtpPort'];

        log_info("Received data for email sending: " . json_encode($config));

        // Log the From address for debugging
        log_info("Using From address: " . $config['smtpFromEmail'] . " (" . $config['smtpFrom'] . ")");

        // Recipients
        $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
        $mail->addAddress($to);

        // Content
        $mail->isHTML(true); 
        $mail->Subject = $subject;
        $mail->Body = $message;

        $mail->send();
        log_info("Email sent to $to with subject: $subject");
        echo json_encode(["status_code" => 200, "message" => "Email sent successfully."]);
    } catch (Exception $e) {
        log_info("Email sending failed: " . $mail->ErrorInfo);
        echo json_encode(["status_code" => 500, "message" => "Failed to send email: {$mail->ErrorInfo}"]);
    }
}

// Log the received data for debugging
// log_info("Using received data: " . json_encode($receivedData));

$email = $receivedData['email'] ?? null;

if (!$email) {
    log_info("Missing email or password in received data.");
    echo json_encode(["status_code" => 400, "message" => "Invalid input data."]);
    exit;
}

send_email($email, "Validate your Email ", str_replace("{{link}}", $receivedData['link'], $receivedData["htmlTemplate"]), $config);
?>
