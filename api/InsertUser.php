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
 * @input receivedData['userAccess'] - JSON string of access control settings (optional, defaults to {"1":"all"})
 * @output Success or error message
 * 
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Admin only. Self-registration is disabled: AI assessment incurs cost, so
// schools administer all accounts. Resolve the new user's department and the
// permitted admin flag from the caller's identity:
// - super-admin: must name a department_id (onboarding a school's admin);
// - department admin: new user pinned to the caller's own department.
requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);
$requestedAdmin = (int) ($receivedData['admin'] ?? 0);

    if ((int) ($caller['is_super_admin'] ?? 0) === 1) {
        $departmentId = (int) ($receivedData['department_id'] ?? 0);
        $adminFlag = $requestedAdmin;
    } else {
        $departmentId = (int) ($caller['department_id'] ?? 0);
        $adminFlag = $requestedAdmin;
    }

    if ($departmentId <= 0) {
        send_response('A department is required to create an account.', 400);
    }

    // Validate the department exists before inserting.
    $deptCheck = $mysqli->prepare('SELECT id FROM tbldepartment WHERE id = ? LIMIT 1');
    $deptCheck->bind_param('i', $departmentId);
    $deptCheck->execute();
    if (!$deptCheck->get_result()->fetch_assoc()) {
        send_response('The specified department does not exist.', 400);
    }
    $deptCheck->close();

    $query = "INSERT INTO tbluser (email, passwordHash, userName, userClass, userStatus, userLocale, avatar, admin, userAccess, department_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    $stmt = $mysqli->prepare($query);

    if (!$stmt) {
        log_info("User create prepare failed: " . $mysqli->error);
        send_response("User create prepare failed: " . $mysqli->error, 500);
    } else {
        $emailLower = strtolower($receivedData['email']);
        $resolvedUserClass = (string) ($receivedData['userClass'] ?? $receivedData['userLocation'] ?? '');

        // Handle userAccess - convert array to JSON string if needed
        $userAccess = $receivedData['userAccess'] ?? '{"1":"all"}';
        if (is_array($userAccess)) {
            $userAccess = json_encode($userAccess);
        }

        $stmt->bind_param("sssssssisi", $emailLower,
                                 $receivedData['passwordHash'],
                                 $receivedData['userName'],
                     $resolvedUserClass,
                                 $receivedData['userStatus'],
                                 $receivedData['userLocale'],
                                 $receivedData['avatar'],
                                 $adminFlag,
                                 $userAccess,
                                 $departmentId);
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
