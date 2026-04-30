<?php
/****************************************************************************
 * Request Password Reset Endpoint
 *
 * Creates a one-time password reset token and sends reset email if the account exists.
 * Returns a generic response to avoid account enumeration.
 *
 * @requires simple_security.php - Request validation
 * @requires vendor/autoload.php - PHPMailer
 * @input email - Account email address
 * @output Generic success response
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

use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;

require __DIR__ . '/vendor/autoload.php';

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
 * Replace template placeholders with provided values.
 *
 * @param string $templatePath
 * @param array $variables
 * @return string
 */
function renderTemplate($templatePath, $variables) {
    $content = file_get_contents($templatePath);
    foreach ($variables as $key => $value) {
        $content = str_replace('{{' . $key . '}}', $value, $content);
    }

    return $content;
}

/**
 * Send the password reset email.
 *
 * @param array $config
 * @param array $user
 * @param string $resetLink
 * @return bool
 */
function sendPasswordResetEmail($config, $user, $resetLink, $logoUrl) {
    try {
        $mail = new PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $config['smtpServer'];
        $mail->SMTPAuth = true;
        $mail->Username = $config['smtpUser'];
        $mail->Password = $config['smtpPass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = (int) $config['smtpPort'];
        $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
        $mail->addAddress($user['email'], $user['userName']);
        $mail->isHTML(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';
        $mail->Subject = 'RevisionBot - Password Reset Request';

        $variables = [
            'name' => htmlspecialchars($user['userName'] ?: 'Student', ENT_QUOTES, 'UTF-8'),
            'resetLink' => htmlspecialchars($resetLink, ENT_QUOTES, 'UTF-8'),
            'expiryMinutes' => '60',
            'logoUrl' => htmlspecialchars($logoUrl, ENT_QUOTES, 'UTF-8')
        ];

        $mail->Body = renderTemplate(dirname(__DIR__) . '/public/templates/password_reset.html', $variables);

        $textVariables = [
            'name' => $user['userName'] ?: 'Student',
            'resetLink' => $resetLink,
            'expiryMinutes' => '60'
        ];
        $mail->AltBody = renderTemplate(dirname(__DIR__) . '/public/templates/password_reset.txt', $textVariables);
        $mail->send();

        return true;
    } catch (Exception $exception) {
        logEndpointError('Password reset email failed: ' . $exception->getMessage());
        return false;
    }
}

$genericMessage = 'If that email exists, a reset link has been sent.';

try {
    $config = json_decode(file_get_contents(__DIR__ . '/.config.json'), true);
    $publicConfig = json_decode(file_get_contents(dirname(__DIR__) . '/public/.config.json'), true);
    $request = json_decode(file_get_contents('php://input'), true) ?: [];

    if (empty($request['email']) || !filter_var($request['email'], FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => true, 'message' => $genericMessage]);
        exit;
    }

    $pdo = createPdoConnection($config);
    $stmt = $pdo->prepare('SELECT id, email, userName, is_active FROM tbluser WHERE LOWER(email) = LOWER(:email) LIMIT 1');
    $stmt->execute(['email' => $request['email']]);
    $user = $stmt->fetch();

    if (!$user || (int) ($user['is_active'] ?? 1) === 0) {
        echo json_encode(['success' => true, 'message' => $genericMessage]);
        exit;
    }

    $token = bin2hex(random_bytes(32));
    $pdo->prepare('DELETE FROM tblpasswordreset WHERE user_id = :user_id AND used = 0 AND expires_at > NOW()')
        ->execute(['user_id' => $user['id']]);

    $pdo->prepare('INSERT INTO tblpasswordreset (user_id, token, expires_at, used) VALUES (:user_id, :token, DATE_ADD(NOW(), INTERVAL 1 HOUR), 0)')
        ->execute([
            'user_id' => $user['id'],
            'token' => $token,
        ]);

    $requestOrigin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    $isValidOrigin = filter_var($requestOrigin, FILTER_VALIDATE_URL)
        && preg_match('/^https?:\/\//i', $requestOrigin);

    $appBaseUrl = rtrim($publicConfig['appBaseUrl'] ?? '', '/');
    $resetBaseUrl = $isValidOrigin ? rtrim($requestOrigin, '/') : $appBaseUrl;

    if ($resetBaseUrl !== '') {
        $resetLink = $resetBaseUrl . '/reset-password?token=' . urlencode($token);
        $logoUrl = $resetBaseUrl . '/title_bw.png';
        sendPasswordResetEmail($config, $user, $resetLink, $logoUrl);
    } else {
        logEndpointError('Password reset skipped email send because appBaseUrl is missing.');
    }

    echo json_encode(['success' => true, 'message' => $genericMessage]);
} catch (Throwable $throwable) {
    logEndpointError('requestPasswordReset failed: ' . $throwable->getMessage());
    echo json_encode(['success' => true, 'message' => $genericMessage]);
}
?>