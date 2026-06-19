<?php
/****************************************************************************
 * Crypto Helper - Symmetric encryption for secrets at rest
 *
 * Used to store per-department Gemini API keys encrypted in the database.
 * Primary implementation uses libsodium's secretbox (XSalsa20-Poly1305,
 * authenticated). Falls back to OpenSSL AES-256-GCM if sodium is unavailable.
 *
 * The master key lives in api/.config.json under "dataEncryptionKey" as a
 * base64-encoded 32-byte string. Generate one with:
 *     php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
 *
 * SECURITY: losing dataEncryptionKey makes every stored secret unrecoverable.
 * Back it up separately from the database. Rotating it requires re-encrypting
 * all stored secrets.
 *
 * @requires .config.json - must contain "dataEncryptionKey"
 * @author Simon Rundell for CodeMonkey Design Ltd.
 * @version 1.0
 ****************************************************************************/

/**
 * Load and decode the 32-byte master encryption key from config.
 *
 * @return string Raw 32-byte key.
 * @throws RuntimeException if the key is missing or malformed.
 */
function getDataEncryptionKey() {
    static $key = null;

    if ($key !== null) {
        return $key;
    }

    $configPath = __DIR__ . '/.config.json';
    $config = file_exists($configPath)
        ? json_decode(file_get_contents($configPath), true)
        : [];

    $encoded = $config['dataEncryptionKey'] ?? '';
    if ($encoded === '') {
        throw new RuntimeException('dataEncryptionKey is not configured.');
    }

    $decoded = base64_decode($encoded, true);
    if ($decoded === false || strlen($decoded) !== 32) {
        throw new RuntimeException('dataEncryptionKey must be a base64-encoded 32-byte value.');
    }

    $key = $decoded;
    return $key;
}

/**
 * Encrypt a plaintext secret.
 *
 * @param string $plaintext The secret to protect (e.g. a Gemini API key).
 * @return array{cipher:string, nonce:string} Both base64-encoded for DB storage.
 * @throws RuntimeException on key or crypto failure.
 */
function encryptSecret($plaintext) {
    $key = getDataEncryptionKey();

    if (function_exists('sodium_crypto_secretbox')) {
        $nonce = random_bytes(SODIUM_CRYPTO_SECRETBOX_NONCEBYTES);
        $cipher = sodium_crypto_secretbox($plaintext, $nonce, $key);

        return [
            'cipher' => base64_encode($cipher),
            'nonce'  => base64_encode($nonce),
        ];
    }

    // Fallback: OpenSSL AES-256-GCM. Store the GCM tag appended to the ciphertext.
    if (function_exists('openssl_encrypt')) {
        $nonce = random_bytes(12); // 96-bit nonce recommended for GCM
        $tag = '';
        $cipher = openssl_encrypt($plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($cipher === false) {
            throw new RuntimeException('Encryption failed (OpenSSL).');
        }

        return [
            'cipher' => base64_encode($cipher . $tag), // last 16 bytes = tag
            'nonce'  => base64_encode($nonce),
        ];
    }

    throw new RuntimeException('No encryption backend available (need sodium or openssl).');
}

/**
 * Decrypt a secret previously produced by encryptSecret().
 *
 * @param string $cipherB64 Base64 ciphertext from the database.
 * @param string $nonceB64  Base64 nonce from the database.
 * @return string Plaintext secret.
 * @throws RuntimeException on key, format, or authentication failure.
 */
function decryptSecret($cipherB64, $nonceB64) {
    $key = getDataEncryptionKey();

    $cipher = base64_decode((string) $cipherB64, true);
    $nonce = base64_decode((string) $nonceB64, true);
    if ($cipher === false || $nonce === false) {
        throw new RuntimeException('Stored secret is malformed.');
    }

    if (function_exists('sodium_crypto_secretbox_open')
        && strlen($nonce) === SODIUM_CRYPTO_SECRETBOX_NONCEBYTES) {
        $plain = sodium_crypto_secretbox_open($cipher, $nonce, $key);
        if ($plain === false) {
            throw new RuntimeException('Secret failed authentication (sodium).');
        }
        return $plain;
    }

    if (function_exists('openssl_decrypt')) {
        // Fallback format: ciphertext with the 16-byte GCM tag appended.
        $tag = substr($cipher, -16);
        $body = substr($cipher, 0, -16);
        $plain = openssl_decrypt($body, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag);
        if ($plain === false) {
            throw new RuntimeException('Secret failed authentication (OpenSSL).');
        }
        return $plain;
    }

    throw new RuntimeException('No decryption backend available (need sodium or openssl).');
}

/**
 * Convenience: last 4 characters of a key for non-sensitive admin display.
 *
 * @param string $plaintext
 * @return string
 */
function secretLast4($plaintext) {
    return substr($plaintext, -4);
}
?>
