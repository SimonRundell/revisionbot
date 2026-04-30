<?php
/****************************************************************************
 * Reset Password Endpoint
 *
 * Redeems a valid reset token, updates the password hash, and marks token as used.
 *
 * @requires simple_security.php - Request validation
 * @requires vendor/autoload.php - PHPMailer
 * @input token - Reset token
 * @input password - New plaintext password
 * @input confirmPassword - Confirmation password
 * @output Success or failure response
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
 * Send a password change notification email.
 *
 * @param array $config
 * @param array $user
 * @param string $changedBy
 * @return bool
 */
function sendPasswordChangeNotificationEmail($config, $user, $changedBy, $logoUrl) {
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
        $mail->Subject = 'Password Changed - AI Revision Bot';

        $htmlVariables = [
            'NAME' => htmlspecialchars($user['userName'] ?: 'Student', ENT_QUOTES, 'UTF-8'),
            'EMAIL' => htmlspecialchars($user['email'], ENT_QUOTES, 'UTF-8'),
            'DATETIME' => htmlspecialchars(date('F j, Y \a\t g:i A T'), ENT_QUOTES, 'UTF-8'),
            'CHANGED_BY' => htmlspecialchars($changedBy, ENT_QUOTES, 'UTF-8'),
            'logoUrl' => htmlspecialchars($logoUrl, ENT_QUOTES, 'UTF-8')
        ];
        $mail->Body = renderTemplate(dirname(__DIR__) . '/public/templates/password_change_notification.html', $htmlVariables);

        $textVariables = [
            'NAME' => $user['userName'] ?: 'Student',
            'EMAIL' => $user['email'],
            'DATETIME' => date('F j, Y \a\t g:i A T'),
            'CHANGED_BY' => $changedBy
        ];
        $mail->AltBody = renderTemplate(dirname(__DIR__) . '/public/templates/password_change_notification.txt', $textVariables);
        $mail->send();

        return true;
    } catch (Exception $exception) {
        logEndpointError('Password change notification failed: ' . $exception->getMessage());
        return false;
    }
}

try {
    $config = json_decode(file_get_contents(__DIR__ . '/.config.json'), true);
    $publicConfig = json_decode(file_get_contents(dirname(__DIR__) . '/public/.config.json'), true);
    $request = json_decode(file_get_contents('php://input'), true) ?: [];

    if (empty($request['token']) || !preg_match('/^[a-f0-9]{64}$/', $request['token'])) {
        echo json_encode(['success' => false, 'message' => 'Token invalid or expired.']);
        exit;
    }

    if (($request['password'] ?? '') !== ($request['confirmPassword'] ?? '')) {
        echo json_encode(['success' => false, 'message' => 'Passwords do not match.']);
        exit;
    }

    if (strlen($request['password'] ?? '') < 8) {
        echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters long.']);
        exit;
    }

    $pdo = createPdoConnection($config);
    $stmt = $pdo->prepare(
        'SELECT pr.user_id, u.email, u.userName
         FROM tblpasswordreset pr
         INNER JOIN tbluser u ON u.id = pr.user_id
         WHERE pr.token = :token AND pr.used = 0 AND pr.expires_at > NOW()
         LIMIT 1'
    );
    $stmt->execute(['token' => $request['token']]);
    $row = $stmt->fetch();

    if (!$row) {
        echo json_encode(['success' => false, 'message' => 'Token invalid or expired.']);
        exit;
    }

    $passwordHash = password_hash($request['password'], PASSWORD_BCRYPT);
    $pdo->beginTransaction();
    $pdo->prepare('UPDATE tbluser SET passwordHash = :password_hash, force_pw_change = 0, last_pw_change = NOW() WHERE id = :id')
        ->execute([
            'password_hash' => $passwordHash,
            'id' => $row['user_id'],
        ]);
    $pdo->prepare('UPDATE tblpasswordreset SET used = 1 WHERE token = :token')
        ->execute(['token' => $request['token']]);
    $pdo->commit();

    $logoBaseUrl = rtrim((string) ($publicConfig['appBaseUrl'] ?? ''), '/');
    $logoUrl = $logoBaseUrl !== ''
        ? $logoBaseUrl . '/title_bw.png'
        : 'https://exe-coll.ac.uk/wp-content/themes/exeter-college/assets/images/logo.png';

    sendPasswordChangeNotificationEmail($config, $row, 'You (self-service)', $logoUrl);
    echo json_encode(['success' => true, 'message' => 'Password updated.']);
} catch (Throwable $throwable) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }

    logEndpointError('resetPassword failed: ' . $throwable->getMessage());
    echo json_encode(['success' => false, 'message' => 'Unable to update password right now.']);
}
?>