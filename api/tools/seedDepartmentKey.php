<?php
/****************************************************************************
 * One-shot: seed the General department's Gemini key from the global config.
 *
 * Run ONCE from the command line after applying 0.5.0_multi_school.sql:
 *     php api/tools/seedDepartmentKey.php
 *
 * It reads the legacy global $config['geminiApiKey'], encrypts it with
 * crypto.php, and stores it on the "General" department of "Exeter College"
 * so AI assessment keeps working immediately after migration.
 *
 * Safe to re-run: it overwrites the stored key for that one department only.
 * CLI-only: refuses to run over HTTP.
 *
 * @version 1.0
 ****************************************************************************/

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    die("This tool is CLI-only.\n");
}

require_once __DIR__ . '/../crypto.php';

$configPath = __DIR__ . '/../.config.json';
if (!file_exists($configPath)) {
    fwrite(STDERR, "Missing api/.config.json\n");
    exit(1);
}

$config = json_decode(file_get_contents($configPath), true);
if (!is_array($config)) {
    fwrite(STDERR, "api/.config.json is not valid JSON\n");
    exit(1);
}

$globalKey = trim((string) ($config['geminiApiKey'] ?? ''));
if ($globalKey === '') {
    fwrite(STDERR, "No legacy geminiApiKey found in config; nothing to seed.\n");
    exit(1);
}

$mysqli = new mysqli(
    $config['servername'],
    $config['username'],
    $config['password'],
    $config['dbname'],
    isset($config['port']) ? (int) $config['port'] : 3306
);

if ($mysqli->connect_error) {
    fwrite(STDERR, 'DB connection failed: ' . $mysqli->connect_error . "\n");
    exit(1);
}

// Locate the seeded department.
$deptRow = $mysqli->query(
    "SELECT d.id FROM tbldepartment d
     JOIN tblschool s ON s.id = d.school_id
     WHERE s.school_name = 'Exeter College' AND d.department_name = 'General'
     LIMIT 1"
)->fetch_assoc();

if (!$deptRow) {
    fwrite(STDERR, "General department not found. Run the SQL migration first.\n");
    exit(1);
}

$deptId = (int) $deptRow['id'];

try {
    $enc = encryptSecret($globalKey);
} catch (Throwable $e) {
    fwrite(STDERR, 'Encryption failed: ' . $e->getMessage() . "\n");
    exit(1);
}

$last4 = secretLast4($globalKey);
$stmt = $mysqli->prepare(
    'UPDATE tbldepartment
        SET gemini_key_cipher = ?, gemini_key_nonce = ?, gemini_key_last4 = ?
      WHERE id = ?'
);
$stmt->bind_param('sssi', $enc['cipher'], $enc['nonce'], $last4, $deptId);

if (!$stmt->execute()) {
    fwrite(STDERR, 'Update failed: ' . $stmt->error . "\n");
    exit(1);
}

echo "Seeded encrypted Gemini key for department #{$deptId} (General). Key ends in ...{$last4}\n";
echo "You may now remove geminiApiKey from api/.config.json once all departments have their own keys.\n";
$stmt->close();
$mysqli->close();
?>
