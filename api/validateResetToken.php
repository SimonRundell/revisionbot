<?php
/****************************************************************************
 * Validate Reset Token Endpoint
 *
 * Validates that a password reset token exists, is unused, and unexpired.
 *
 * @requires simple_security.php - Request validation
 * @input token - Reset token
 * @output Token validity and masked email (when valid)
 * @version 0.4.1
 ****************************************************************************/

require_once 'simple_security.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Access-Control-Allow-Origin, Authorization, X-Requested-With');
header('Content-Type: application/json');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

blockDirectAccess();

/**
 * Write endpoint errors to the local API log file.
 *
 * @param string $message
 * @return void
 */
function logEndpointError($message) {
    error_log(date('[d-M-Y H:i:s T] ') . $message . PHP_EOL, 3, __DIR__ . '/php_errors.log');
}

/**
 * Create a PDO connection from the local API config.
 *
 * @param array $config
 * @return PDO
 */
function createPdoConnection($config) {
    return new PDO(
        sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config['servername'],
            (int) ($config['port'] ?? 3306),
            $config['dbname']
        ),
        $config['username'],
        $config['password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}

/**
 * Mask an email address for token validation UX.
 *
 * @param string $email
 * @return string
 */
function maskEmail($email) {
    $parts = explode('@', $email, 2);
    if (count($parts) !== 2) {
        return '***';
    }

    $local = $parts[0];
    $prefix = substr($local, 0, 2);
    return $prefix . '***@' . $parts[1];
}

try {
    $config = json_decode(file_get_contents(__DIR__ . '/.config.json'), true);
    $request = json_decode(file_get_contents('php://input'), true) ?: [];

    if (empty($request['token']) || !preg_match('/^[a-f0-9]{64}$/', $request['token'])) {
        echo json_encode(['valid' => false, 'message' => 'Token invalid or expired.']);
        exit;
    }

    $pdo = createPdoConnection($config);
    $stmt = $pdo->prepare(
        'SELECT u.email
         FROM tblpasswordreset pr
         INNER JOIN tbluser u ON u.id = pr.user_id
         WHERE pr.token = :token AND pr.used = 0 AND pr.expires_at > NOW()
         LIMIT 1'
    );
    $stmt->execute(['token' => $request['token']]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['valid' => false, 'message' => 'Token invalid or expired.']);
        exit;
    }

    echo json_encode(['valid' => true, 'email' => maskEmail($row['email'])]);
} catch (Throwable $throwable) {
    logEndpointError('validateResetToken failed: ' . $throwable->getMessage());
    echo json_encode(['valid' => false, 'message' => 'Token invalid or expired.']);
}
?>