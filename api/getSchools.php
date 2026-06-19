<?php
/****************************************************************************
 * Get Schools Endpoint (Super-admin)
 *
 * Returns all schools. Cross-tenant data, so restricted to the super-admin.
 *
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @output JSON array of schools (id, school_name, is_active, created_at)
 * @version 1.0
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireSuperAdmin($mysqli);

$result = $mysqli->query(
    'SELECT id, school_name, is_active, created_at FROM tblschool ORDER BY school_name ASC'
);

if (!$result) {
    log_info('Get schools failed: ' . $mysqli->error);
    send_response('Unable to fetch schools.', 500);
}

$rows = mysqli_fetch_all($result, MYSQLI_ASSOC);
send_response(json_encode($rows), 200);
?>
