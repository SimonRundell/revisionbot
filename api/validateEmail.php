<?php

include 'setup.php';

function send_html_response($title, $message, $success = true) {
    header('Content-Type: text/html; charset=UTF-8');
    $backgroundColor = $success ? '#4CAF50' : '#f44336';
    $html = "<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <title>$title</title>
  <style>
    body {
      background-color: #f4f4f4;
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border: 1px solid #dddddd;
      padding: 20px;
      text-align: center;
    }
    .logo {
      max-width: 200px;
      margin-bottom: 20px;
    }
    .header {
      background-color: $backgroundColor;
      color: white;
      padding: 10px;
      font-size: 20px;
      font-weight: bold;
    }
    .content {
      font-size: 16px;
      color: #333333;
      margin: 20px 0;
    }
    .footer {
      font-size: 14px;
      color: #888888;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class='email-container'>
    <div class='header'>$title</div>
    <div class='content'>$message</div>
    <div class='footer'>
      <p>Regards,<br>AI Revision Robot</p>
    </div>
  </div>
</body>
</html>";
    echo $html;
    exit;
}

function validate_email($email, $hash, $mysqli) {
    // Fetch user details from the database
    $query = "SELECT passwordHash FROM tbluser WHERE email = ?";
    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("Failed to prepare statement: " . $mysqli->error);
        send_html_response("Failed to prepare statement. <br><br>This is a server error and isn't your fault.", false);
        exit;
    }

    $stmt->bind_param("s", $email);

    if (!$stmt->execute()) {
        log_info("Execute failed: " . $stmt->error);
        send_html_response("Execute failed: " . $stmt->error. "<br><br>This is a server error and isn't your fault.", false);
    }

    $result = $stmt->get_result();

    if (!$result || $result->num_rows === 0) {
        send_html_response("That user cannot be found.", false);
        return;
    }

    $user = $result->fetch_assoc(); // Fetch a single row as an associative array

    log_info("User found: " . json_encode($user));

    if (!$user) {
        log_info("Query failed: " . $mysqli->error);
        send_html_response("Query failed: " . $mysqli->error . "<br><br>This is a server error and isn't your fault.", false);
        return;
    }

    // Generate the expected hash
    $expectedHash = $user['passwordHash'];

    log_info("Email: $email, Hash: $hash, Expected Hash: $expectedHash");

    if ($hash === $expectedHash) {
        // Update the userEmailValidated field
        $updateQuery = "UPDATE tbluser SET userEmailValidated = 1 WHERE email = ?";
        $updateStmt = $mysqli->prepare($updateQuery);

        if (!$updateStmt) {
            log_info("Failed to prepare update statement: " . $mysqli->error);
            send_html_response("Failed to prepare update statement. <br><br>This is a server error and isn't your fault.", false);
            return;
        }

        $updateStmt->bind_param("s", $email);

        if ($updateStmt->execute()) {
            send_html_response("Email Validated", "Your email has been successfully validated.");
        } else {
            send_html_response("Validation Failed", "We encountered an error while validating your email. Please try again later. <br><br>This is a server error and isn't your fault.", false);
        }

        $updateStmt->close();
    } else {
        send_html_response("Invalid Link", "The validation link is invalid or has expired. Please try registering again.", false);
    }

    $stmt->close();
}

// Extract query parameters
$email = $_GET['email'] ?? null;
$hash = $_GET['hash'] ?? null;

if (!$email || !$hash) {
    send_response("Missing email or hash.", 400);
    exit;
}

validate_email($email, $hash, $mysqli);

?>