<?php
/**
 * Simple API Security Helper
 * Blocks obvious direct browser access while allowing legitimate API calls
 */

/**
 * Build a stable signing secret from existing private config values.
 *
 * @return string
 */
function getAuthSigningSecret() {
    static $secret = null;

    if ($secret !== null) {
        return $secret;
    }

    $configPath = __DIR__ . '/.config.json';
    $config = file_exists($configPath)
        ? json_decode(file_get_contents($configPath), true)
        : [];

    $secretSeed = implode('|', [
        $config['dbname'] ?? '',
        $config['username'] ?? '',
        $config['password'] ?? '',
        $config['smtpPass'] ?? ''
    ]);

    $secret = hash('sha256', $secretSeed);
    return $secret;
}

/**
 * Encode a string using URL-safe Base64 without padding.
 *
 * @param string $value
 * @return string
 */
function base64UrlEncode($value) {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

/**
 * Decode a URL-safe Base64 string.
 *
 * @param string $value
 * @return string|false
 */
function base64UrlDecode($value) {
    $padding = 4 - (strlen($value) % 4);
    if ($padding < 4) {
        $value .= str_repeat('=', $padding);
    }

    return base64_decode(strtr($value, '-_', '+/'));
}

/**
 * Read the bearer token from the Authorization header.
 *
 * @return string|null
 */
function getBearerToken() {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return null;
    }

    return trim($matches[1]);
}

/**
 * Create a signed bearer token for a user.
 *
 * @param int $userId
 * @param int $ttlSeconds
 * @return string
 */
function generateAuthToken($userId, $ttlSeconds = 43200) {
    $payload = [
        'uid' => (int) $userId,
        'exp' => time() + $ttlSeconds
    ];

    $encodedPayload = base64UrlEncode(json_encode($payload));
    $signature = hash_hmac('sha256', $encodedPayload, getAuthSigningSecret());

    return $encodedPayload . '.' . $signature;
}

/**
 * Decode and verify a signed bearer token.
 *
 * @param string $token
 * @return array|null
 */
function decodeAuthToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 2) {
        return null;
    }

    [$encodedPayload, $signature] = $parts;
    $expectedSignature = hash_hmac('sha256', $encodedPayload, getAuthSigningSecret());
    if (!hash_equals($expectedSignature, $signature)) {
        return null;
    }

    $payloadJson = base64UrlDecode($encodedPayload);
    if ($payloadJson === false) {
        return null;
    }

    $payload = json_decode($payloadJson, true);
    if (!is_array($payload) || empty($payload['uid']) || empty($payload['exp'])) {
        return null;
    }

    if ((int) $payload['exp'] < time()) {
        return null;
    }

    return $payload;
}

/**
 * Fetch the currently authenticated user from a database connection.
 *
 * @param mysqli|PDO $connection
 * @return array|null
 */
function getAuthenticatedUser($connection) {
    $token = getBearerToken();
    if (!$token) {
        return null;
    }

    $payload = decodeAuthToken($token);
    if ($payload === null) {
        return null;
    }

    $userId = (int) $payload['uid'];

    $userClassColumn = 'userClass';

    if ($connection instanceof mysqli) {
        $columnLookupResult = $connection->query("SHOW COLUMNS FROM tbluser LIKE 'userClass'");
        if (!$columnLookupResult || $columnLookupResult->num_rows === 0) {
            $userClassColumn = 'userLocation';
        }
    }

    if ($connection instanceof PDO) {
        $columnLookupStmt = $connection->query("SHOW COLUMNS FROM tbluser LIKE 'userClass'");
        if (!$columnLookupStmt || !$columnLookupStmt->fetch(PDO::FETCH_ASSOC)) {
            $userClassColumn = 'userLocation';
        }
    }

    if ($connection instanceof mysqli) {
        $stmt = $connection->prepare('SELECT id, email, userName, ' . $userClassColumn . ' AS userClass, admin, is_active, force_pw_change, last_pw_change FROM tbluser WHERE id = ? LIMIT 1');
        if (!$stmt) {
            return null;
        }

        $stmt->bind_param('i', $userId);
        if (!$stmt->execute()) {
            return null;
        }

        $result = $stmt->get_result();
        return $result ? $result->fetch_assoc() : null;
    }

    if ($connection instanceof PDO) {
        $stmt = $connection->prepare('SELECT id, email, userName, ' . $userClassColumn . ' AS userClass, admin, is_active, force_pw_change, last_pw_change FROM tbluser WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        return $user ?: null;
    }

    return null;
}

/**
 * Check if this appears to be a legitimate API call
 */
function isLegitimateApiCall() {
    // Must be POST request (not GET from browser address bar)
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        return false;
    }
    
    // Must have JSON content type (set by axios/fetch) OR multipart form data (for file uploads)
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'application/json') === false && 
        strpos($contentType, 'multipart/form-data') === false) {
        return false;
    }
    
    return true;
}

/**
 * Block direct browser access
 */
function blockDirectAccess() {
    if (!isLegitimateApiCall()) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'API access only - direct browser access not allowed']);
        exit;
    }
}

/**
 * Enhanced security for sensitive endpoints.
 *
 * @param mysqli|PDO|null $connection
 * @return array
 */
function requireAuth($connection = null) {
    blockDirectAccess();

    if ($connection === null) {
        return ['token' => getBearerToken()];
    }

    $user = getAuthenticatedUser($connection);
    if (!$user) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Authentication required.']);
        exit;
    }

    return $user;
}

/**
 * Verifies the current session belongs to an admin user.
 * Call immediately after requireAuth().
 * Exits with HTTP 403 if the caller is not an admin.
 *
 * @param mysqli|PDO $connection Active database connection
 * @return int
 */
function requireAdmin($connection) {
    $user = getAuthenticatedUser($connection);
    if (!$user || (int) ($user['admin'] ?? 0) !== 1) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Admin access required.']);
        exit;
    }

    return (int) $user['id'];
}
?>