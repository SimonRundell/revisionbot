<?php
/****************************************************************************
 * Get Classes Endpoint (Admin)
 *
 * Retrieves all managed classes for administrator assignment workflows.
 * Includes assigned user counts and normalizes collations so legacy class
 * data can still be counted during the `userLocation` to `userClass` transition.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @output JSON array of classes with id, className, and assignedUsers
 * @version 0.4.2
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireAdmin($mysqli);
$caller = getAuthenticatedUser($mysqli);
$callerIsSuper = (int) ($caller['is_super_admin'] ?? 0) === 1;

$userClassColumn = 'userClass';
$columnLookupResult = $mysqli->query("SHOW COLUMNS FROM tbluser LIKE 'userClass'");
if (!$columnLookupResult || $columnLookupResult->num_rows === 0) {
    $userClassColumn = 'userLocation';
}

// Counts are joined within the same department so identical class labels in
// other tenants are not double-counted. Department admins see only their own
// classes; the super-admin sees all.
$query = "SELECT c.id, c.className, c.department_id, COUNT(u.id) AS assignedUsers
          FROM tblClass c
          LEFT JOIN tbluser u ON u." . $userClassColumn . " COLLATE utf8mb4_general_ci = c.className COLLATE utf8mb4_general_ci
              AND u.department_id = c.department_id";

if (!$callerIsSuper) {
    $query .= " WHERE c.department_id = ?";
}
$query .= " GROUP BY c.id, c.className, c.department_id ORDER BY c.className ASC";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Get classes prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare class lookup.', 500);
}

if (!$callerIsSuper) {
    $callerDept = (int) ($caller['department_id'] ?? 0);
    $stmt->bind_param('i', $callerDept);
}

if (!$stmt->execute()) {
    log_info('Get classes execute failed: ' . $stmt->error);
    send_response('Unable to fetch classes.', 500);
}

$result = $stmt->get_result();
$rows = $result ? mysqli_fetch_all($result, MYSQLI_ASSOC) : [];
send_response(json_encode($rows), 200);

$stmt->close();
?>