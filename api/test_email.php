<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access for security
requireAuth();

function testEmailConfiguration($config) {
    try {
        $mail = new PHPMailer(true);
        
        // Enable debug output for testing (disable in production)
        // $mail->SMTPDebug = 2;
        
        // Server settings - Try both SSL (465) and STARTTLS (587)
        $mail->isSMTP();
        $mail->Host = $config['smtpServer'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtpUser'];
        $mail->Password = $config['smtpPass'];
        
        // DreamHost typically uses port 587 with STARTTLS
        if ($config['smtpPort'] == 465) {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port = 465;
        } else {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
        }
        
        echo "Trying SMTP connection with port: " . $mail->Port . " and encryption: " . $mail->SMTPSecure . "\n";
        
        // Recipients - send to the same server email for testing
        $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
        $mail->addAddress($config['smtpFromEmail'], 'Test Recipient');
        
        // Content
        $mail->isHTML(true);
        $mail->Subject = 'Email Configuration Test - ' . date('Y-m-d H:i:s');
        $mail->Body = '
        <h2>Email Test Successful!</h2>
        <p>This is a test email to verify the SMTP configuration is working correctly.</p>
        <p><strong>Server:</strong> ' . $config['smtpServer'] . '</p>
        <p><strong>Port:</strong> ' . $config['smtpPort'] . '</p>
        <p><strong>User:</strong> ' . $config['smtpUser'] . '</p>
        <p><strong>Sent at:</strong> ' . date('Y-m-d H:i:s') . '</p>
        ';
        
        $mail->AltBody = 'Email Test Successful! Configuration is working. Sent at: ' . date('Y-m-d H:i:s');
        
        $mail->send();
        
        echo json_encode([
            "status_code" => 200, 
            "message" => "Test email sent successfully!",
            "smtp_server" => $config['smtpServer'],
            "smtp_port" => $config['smtpPort'],
            "smtp_user" => $config['smtpUser']
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            "status_code" => 500, 
            "message" => "Email test failed: " . $e->getMessage(),
            "smtp_server" => $config['smtpServer'],
            "smtp_port" => $config['smtpPort'],
            "smtp_user" => $config['smtpUser']
        ]);
    }
}

// Run the test
echo "Testing email configuration...\n";
testEmailConfiguration($config);
?>