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

$userClassColumn = 'userClass';
$columnLookupResult = $mysqli->query("SHOW COLUMNS FROM tbluser LIKE 'userClass'");
if (!$columnLookupResult || $columnLookupResult->num_rows === 0) {
    $userClassColumn = 'userLocation';
}

$query = "SELECT c.id, c.className, COUNT(u.id) AS assignedUsers
          FROM tblClass c
          LEFT JOIN tbluser u ON u." . $userClassColumn . " COLLATE utf8mb4_general_ci = c.className COLLATE utf8mb4_general_ci
          GROUP BY c.id, c.className
          ORDER BY c.className ASC";

$stmt = $mysqli->prepare($query);

if (!$stmt) {
    log_info('Get classes prepare failed: ' . $mysqli->error);
    send_response('Unable to prepare class lookup.', 500);
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