<?php
/****************************************************************************
 * Insert User Endpoint (Registration)
 * 
 * Creates new user accounts in the system.
 * Used for student registration and admin user creation.
 * 
 * Creates user with:
 * - Email (converted to lowercase for consistency)
 * - Password hash (SHA-256 from client)
 * - User name and location
 * - Status and locale preferences
 * - Avatar identifier
 * - Admin flag (default: false)
 * 
 * Security:
 * - Protected by blockDirectAccess()
 * - Email uniqueness enforced by database
 * - Password already hashed on client side
 * - No email validation required (handled separately)
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input receivedData['email'] - User email address
 * @input receivedData['passwordHash'] - SHA-256 hashed password
 * @input receivedData['userName'] - Full name
 * @input receivedData['userClass'] - Class/department
 * @input receivedData['userStatus'] - Account status
 * @input receivedData['userLocale'] - Language preference
 * @input receivedData['avatar'] - Avatar identifier
 * @input receivedData['admin'] - Admin flag (0 or 1)
 * @output Success or error message
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to registration
blockDirectAccess();

    $query = "INSERT INTO tbluser (email, passwordHash, userName, userClass, userStatus, userLocale, avatar, admin)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("User create prepare failed: " . $mysqli->error);
        send_response("User create prepare failed: " . $mysqli->error, 500);
    } else {
        $emailLower = strtolower($receivedData['email']);
        $resolvedUserClass = (string) ($receivedData['userClass'] ?? $receivedData['userLocation'] ?? '');

        $stmt->bind_param("sssssssi", $emailLower, 
                                 $receivedData['passwordHash'], 
                                 $receivedData['userName'],
                     $resolvedUserClass,
                                 $receivedData['userStatus'],
                                 $receivedData['userLocale'],
                                 $receivedData['avatar'],
                                 $receivedData['admin']);
        if (!$stmt->execute()) {
            log_info("User creation failed: " . $stmt->error);
            send_response("User creation failed: " . $stmt->error, 500);
        } else {
            log_info("User created " . $receivedData['email']);
            send_response("User successfully created", 200);
        }
    }


$stmt->close();
?>
