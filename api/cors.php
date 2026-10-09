<?php
/****************************************************************************
 * Shared CORS Handler
 *
 * Include at the very top of every endpoint (setup.php and simple_security.php
 * already do this, so any endpoint using either is covered):
 *
 *     require_once __DIR__ . '/cors.php';  // always first
 *     require_once __DIR__ . '/db.php';
 *
 * Behaviour:
 * - Reflects the request Origin back when it is localhost on any port, so the
 *   Vite dev server is accepted whatever port it picks.
 * - Also reflects origins listed in the optional "allowedOrigins" array in
 *   api/.config.json (exact match, e.g. "https://revision.example.com").
 *   With no list, production is same-origin only.
 * - Never sends a wildcard Access-Control-Allow-Origin.
 * - Answers OPTIONS preflight with HTTP 200 and exits.
 *
 * @license CC BY-NC-SA 4.0
 ****************************************************************************/

if (!defined('REVISIONBOT_CORS_LOADED')) {
    define('REVISIONBOT_CORS_LOADED', true);

    /**
     * Decide whether a request Origin may be reflected back.
     *
     * @param string $origin Value of the Origin request header.
     * @return bool True when the origin is localhost (any port) or allow-listed.
     */
    function isAllowedOrigin($origin) {
        if ($origin === '') {
            return false;
        }

        if (preg_match('#^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$#i', $origin)) {
            return true;
        }

        $configPath = __DIR__ . '/.config.json';
        if (!file_exists($configPath)) {
            return false;
        }

        $config = json_decode((string) file_get_contents($configPath), true);
        $allowed = is_array($config) && isset($config['allowedOrigins']) && is_array($config['allowedOrigins'])
            ? $config['allowedOrigins']
            : [];

        return in_array(rtrim($origin, '/'), array_map(fn($o) => rtrim((string) $o, '/'), $allowed), true);
    }

    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

    header('Vary: Origin');
    if (isAllowedOrigin($requestOrigin)) {
        header('Access-Control-Allow-Origin: ' . $requestOrigin);
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}
