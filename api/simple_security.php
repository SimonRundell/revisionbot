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
 * Check whether a column exists on a table.
 *
 * Used to keep this auth layer runnable both before and after the
 * 0.5.0 multi-school migration (department_id / is_super_admin may be absent
 * on an un-migrated database).
 *
 * @param mysqli|PDO $connection
 * @param string $table  Literal table name (not user input).
 * @param string $column Literal column name (not user input).
 * @return bool
 */
function tableColumnExists($connection, $table, $column) {
    $sql = "SHOW COLUMNS FROM `" . $table . "` LIKE '" . $column . "'";

    if ($connection instanceof mysqli) {
        $result = $connection->query($sql);
        return $result && $result->num_rows > 0;
    }

    if ($connection instanceof PDO) {
        $stmt = $connection->query($sql);
        return $stmt && $stmt->fetch(PDO::FETCH_ASSOC) ? true : false;
    }

    return false;
}

/**
 * Fetch the currently authenticated user from a database connection.
 *
 * After the multi-school migration the returned array also carries
 * `department_id`, `is_super_admin`, and (resolved) `school_id`. On an
 * un-migrated database those default to null/0 so callers can rely on the keys.
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

    // Legacy column rename support: userClass vs userLocation.
    $userClassColumn = tableColumnExists($connection, 'tbluser', 'userClass')
        ? 'userClass'
        : 'userLocation';

    // Multi-school columns are only present after the 0.5.0 migration.
    $hasMultiSchool = tableColumnExists($connection, 'tbluser', 'department_id');

    $columns = 'id, email, userName, ' . $userClassColumn . ' AS userClass, '
        . 'admin, is_active, force_pw_change, last_pw_change';
    if ($hasMultiSchool) {
        $columns .= ', department_id, is_super_admin';
    }

    $user = null;

    if ($connection instanceof mysqli) {
        $stmt = $connection->prepare('SELECT ' . $columns . ' FROM tbluser WHERE id = ? LIMIT 1');
        if (!$stmt) {
            return null;
        }
        $stmt->bind_param('i', $userId);
        if (!$stmt->execute()) {
            return null;
        }
        $result = $stmt->get_result();
        $user = $result ? $result->fetch_assoc() : null;
    } elseif ($connection instanceof PDO) {
        $stmt = $connection->prepare('SELECT ' . $columns . ' FROM tbluser WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    if (!$user) {
        return null;
    }

    // Normalise the tenancy fields so every caller can trust the keys exist.
    $user['department_id'] = isset($user['department_id']) && $user['department_id'] !== null
        ? (int) $user['department_id']
        : null;
    $user['is_super_admin'] = (int) ($user['is_super_admin'] ?? 0);
    $user['school_id'] = null;

    // Resolve the owning school from the department (best effort).
    if ($hasMultiSchool && $user['department_id'] !== null) {
        $deptId = $user['department_id'];

        if ($connection instanceof mysqli) {
            $schoolStmt = $connection->prepare('SELECT school_id FROM tbldepartment WHERE id = ? LIMIT 1');
            if ($schoolStmt) {
                $schoolStmt->bind_param('i', $deptId);
                if ($schoolStmt->execute()) {
                    $schoolRow = $schoolStmt->get_result()->fetch_assoc();
                    if ($schoolRow) {
                        $user['school_id'] = (int) $schoolRow['school_id'];
                    }
                }
            }
        } elseif ($connection instanceof PDO) {
            $schoolStmt = $connection->prepare('SELECT school_id FROM tbldepartment WHERE id = :id LIMIT 1');
            $schoolStmt->execute(['id' => $deptId]);
            $schoolRow = $schoolStmt->fetch(PDO::FETCH_ASSOC);
            if ($schoolRow) {
                $user['school_id'] = (int) $schoolRow['school_id'];
            }
        }
    }

    return $user;
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
 * A department admin (admin = 1) or the super-admin both pass.
 * Call immediately after requireAuth().
 * Exits with HTTP 403 if the caller is not an admin.
 *
 * @param mysqli|PDO $connection Active database connection
 * @return int The authenticated admin's user id.
 */
function requireAdmin($connection) {
    $user = getAuthenticatedUser($connection);
    $isAdmin = $user && (
        (int) ($user['admin'] ?? 0) === 1 ||
        (int) ($user['is_super_admin'] ?? 0) === 1
    );

    if (!$isAdmin) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Admin access required.']);
        exit;
    }

    return (int) $user['id'];
}

/**
 * Verifies the current session belongs to the overall super-admin.
 * Use for cross-tenant operations (managing schools, departments, keys).
 * Exits with HTTP 403 if the caller is not a super-admin.
 *
 * @param mysqli|PDO $connection Active database connection
 * @return array The authenticated super-admin user record.
 */
function requireSuperAdmin($connection) {
    $user = getAuthenticatedUser($connection);
    if (!$user || (int) ($user['is_super_admin'] ?? 0) !== 1) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Super-admin access required.']);
        exit;
    }

    return $user;
}

/**
 * Return the authenticated caller's department id, or null for the super-admin.
 *
 * Tenant-scoped endpoints must derive the department from the token using this
 * helper and must NEVER trust a department_id supplied in the request body.
 *
 * @param mysqli|PDO $connection Active database connection
 * @return int|null Department id, or null if caller is super-admin / department-less.
 */
function getCallerDepartmentId($connection) {
    $user = getAuthenticatedUser($connection);
    if (!$user) {
        return null;
    }

    return $user['department_id'] ?? null;
}

/**
 * Convenience guard: returns the caller's department id, or exits 403 if the
 * caller is a department-less account (e.g. super-admin) calling an endpoint
 * that requires a concrete department context.
 *
 * @param mysqli|PDO $connection Active database connection
 * @return int A non-null department id.
 */
function requireDepartment($connection) {
    $departmentId = getCallerDepartmentId($connection);
    if ($departmentId === null) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No department context for this account.']);
        exit;
    }

    return (int) $departmentId;
}
?>