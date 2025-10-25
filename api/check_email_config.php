<?php
// Simple email credential verification
include 'setup.php';

echo "=== Email Configuration Check ===\n";
echo "SMTP Server: " . $config['smtpServer'] . "\n";
echo "SMTP Port: " . $config['smtpPort'] . "\n";
echo "SMTP User: " . $config['smtpUser'] . "\n";
echo "SMTP From Email: " . $config['smtpFromEmail'] . "\n";
echo "SMTP From Name: " . $config['smtpFrom'] . "\n";
echo "Password Length: " . strlen($config['smtpPass']) . " characters\n";
echo "Password First 3 chars: " . substr($config['smtpPass'], 0, 3) . "...\n";
echo "\n";

echo "=== Recommendations ===\n";
echo "1. Verify the email account 'server@aibot.examrevision.online' exists in your DreamHost panel\n";
echo "2. Check if the password is correct\n";
echo "3. Ensure the email account is not suspended or disabled\n";
echo "4. Try logging into webmail with these credentials to verify they work\n";
echo "\n";

echo "=== Test Complete ===\n";
?>