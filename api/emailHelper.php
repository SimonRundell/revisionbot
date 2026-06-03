<?php
/**
 * Email Helper
 *
 * Shared utilities for all email-sending endpoints.
 * Require this file after vendor/autoload.php has already been included.
 *
 * Functions:
 *   getLogoUrl()                                    — builds the app logo URL
 *   createMailer(array $config): PHPMailer          — configured SMTP mailer instance
 *   renderEmailTemplate(string $path, array $vars)  — replaces {{KEY}} placeholders
 */

use PHPMailer\PHPMailer\PHPMailer;

/**
 * Build the absolute URL for the app logo used in email templates.
 * Reads appBaseUrl from public/.config.json; falls back to the hosted Exeter College logo.
 *
 * @return string
 */
function getLogoUrl(): string {
    $publicConfigPath = dirname(__DIR__) . '/public/.config.json';
    $publicConfig = file_exists($publicConfigPath)
        ? json_decode(file_get_contents($publicConfigPath), true)
        : [];

    $appBaseUrl = rtrim((string) ($publicConfig['appBaseUrl'] ?? ''), '/');
    return $appBaseUrl !== ''
        ? $appBaseUrl . '/images/title_bw.png'
        : 'https://exe-coll.ac.uk/wp-content/themes/exeter-college/assets/images/logo.png';
}

/**
 * Create and return a configured PHPMailer instance ready for recipient and body assignment.
 * Conditionally enables SMTP auth/TLS if smtpSecure is set in config (omit for local Mailpit).
 *
 * @param array $config  App config array (smtpServer, smtpPort, smtpUser, smtpPass,
 *                        smtpSecure, smtpFromEmail, smtpFrom)
 * @return PHPMailer
 */
function createMailer(array $config): PHPMailer {
    $mail = new PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $config['smtpServer'];
    $mail->Port = (int) $config['smtpPort'];

    if (!empty($config['smtpSecure'])) {
        $mail->SMTPAuth   = true;
        $mail->Username   = $config['smtpUser'];
        $mail->Password   = $config['smtpPass'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPAuth = false;
    }

    $mail->setFrom($config['smtpFromEmail'], $config['smtpFrom']);
    $mail->isHTML(true);
    $mail->CharSet  = 'UTF-8';
    $mail->Encoding = 'base64';

    return $mail;
}

/**
 * Load a template file and replace {{KEY}} placeholders with the supplied values.
 *
 * @param string $templatePath  Absolute path to the template file
 * @param array  $variables     Associative array: key (without braces) => replacement value
 * @return string               Rendered template content, or empty string if file not found
 */
function renderEmailTemplate(string $templatePath, array $variables): string {
    if (!file_exists($templatePath)) {
        return '';
    }

    $content = file_get_contents($templatePath);
    foreach ($variables as $key => $value) {
        $content = str_replace('{{' . $key . '}}', $value, $content);
    }

    return $content;
}
