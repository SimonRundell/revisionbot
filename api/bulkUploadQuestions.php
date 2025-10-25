<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to admin bulk functions
requireAuth();

if (empty($receivedData) && $_SERVER['REQUEST_METHOD'] === 'POST' && !empty($_POST)) {
    $receivedData = [];
    foreach ($_POST as $key => $value) {
        $receivedData[$key] = is_string($value) ? trim($value) : $value;
    }
}

if (!isset($_FILES['csvFile'])) {
    send_response('No CSV file found in request.', 400);
    exit;
}

if ($_FILES['csvFile']['error'] !== UPLOAD_ERR_OK) {
    $errorMessage = 'File upload error: ';
    switch ($_FILES['csvFile']['error']) {
        case UPLOAD_ERR_INI_SIZE:
            $errorMessage .= 'File size exceeds the server limit.';
            break;
        case UPLOAD_ERR_FORM_SIZE:
            $errorMessage .= 'File size exceeds the form limit.';
            break;
        case UPLOAD_ERR_PARTIAL:
            $errorMessage .= 'File was only partially uploaded.';
            break;
        case UPLOAD_ERR_NO_FILE:
            $errorMessage .= 'No file was uploaded.';
            break;
        case UPLOAD_ERR_NO_TMP_DIR:
            $errorMessage .= 'Missing temporary folder.';
            break;
        case UPLOAD_ERR_CANT_WRITE:
            $errorMessage .= 'Failed to write file to disk.';
            break;
        case UPLOAD_ERR_EXTENSION:
            $errorMessage .= 'File upload stopped by an extension.';
            break;
        default:
            $errorMessage .= 'Unknown upload error.';
            break;
    }
    send_response($errorMessage, 400);
    exit;
}

$topicId = isset($receivedData['topicId']) ? (int) $receivedData['topicId'] : 0;
if ($topicId <= 0) {
    send_response('Topic ID is required for bulk upload.', 400);
    exit;
}

$topicCheckStmt = $mysqli->prepare("SELECT id FROM tbltopic WHERE id = ?");
$topicCheckStmt->bind_param('i', $topicId);
$topicCheckStmt->execute();
$topicResult = $topicCheckStmt->get_result();
if ($topicResult->num_rows === 0) {
    $topicCheckStmt->close();
    send_response('Topic not found. Please refresh and try again.', 404);
    exit;
}
$topicCheckStmt->close();

$csvFile = $_FILES['csvFile']['tmp_name'];
if (!is_readable($csvFile)) {
    send_response('Could not read CSV file.', 400);
    exit;
}

if (($handle = fopen($csvFile, 'r')) === false) {
    send_response('Could not open CSV file.', 400);
    exit;
}

$header = fgetcsv($handle);
if ($header === false) {
    fclose($handle);
    send_response('CSV file is empty.', 400);
    exit;
}

$normalizeHeader = static function ($value) {
    if ($value === null) {
        return '';
    }
    $value = preg_replace('/^\xEF\xBB\xBF/', '', $value);
    $value = preg_replace('/^\xFF\xFE/', '', $value);
    $value = preg_replace('/^\xFE\xFF/', '', $value);
    return strtolower(trim($value));
};

$normalizedHeader = array_map($normalizeHeader, $header);

$questionIndex = array_search('question', $normalizedHeader, true);
if ($questionIndex === false) {
    fclose($handle);
    send_response('Missing required column: question', 400);
    exit;
}

$markschemeIndex = array_search('markscheme', $normalizedHeader, true);

$rows = [];
$errors = [];
$skippedCount = 0;
$rowNumber = 1;

while (($data = fgetcsv($handle)) !== false) {
    $rowNumber++;

    $questionText = isset($data[$questionIndex]) ? trim($data[$questionIndex]) : '';
    if ($questionText === '') {
        $errors[] = "Row $rowNumber: Question text is required";
        $skippedCount++;
        continue;
    }

    $markschemeText = '';
    if ($markschemeIndex !== false && isset($data[$markschemeIndex])) {
        $markschemeText = trim($data[$markschemeIndex]);
    }

    $rows[] = [
        'row' => $rowNumber,
        'question' => $questionText,
        'markscheme' => $markschemeText
    ];
}

fclose($handle);

if (empty($rows)) {
    $message = 'No valid rows found in CSV file.';
    if (!empty($errors)) {
        $message .= ' ' . implode(' | ', $errors);
    }
    send_response($message, 400);
    exit;
}

$mysqli->begin_transaction();

try {
    $orderStmt = $mysqli->prepare('SELECT COALESCE(MAX(question_order), 0) FROM tblquestion WHERE topicid = ?');
    $orderStmt->bind_param('i', $topicId);
    $orderStmt->execute();
    $orderStmt->bind_result($currentOrderValue);
    $orderStmt->fetch();
    $orderStmt->close();

    $currentOrderValue = (int) $currentOrderValue;

    $insertStmt = $mysqli->prepare('INSERT INTO tblquestion (question, topicid, attachments, markscheme, question_order) VALUES (?, ?, ?, ?, ?)');
    if (!$insertStmt) {
        throw new Exception('Question insert prepare failed: ' . $mysqli->error);
    }

    $questionText = '';
    $topicIdParam = $topicId;
    $attachmentsJson = json_encode([]);
    $markschemeText = '';
    $orderValue = 0;

    $insertStmt->bind_param('sissi', $questionText, $topicIdParam, $attachmentsJson, $markschemeText, $orderValue);

    $createdCount = 0;

    foreach ($rows as $row) {
        $questionText = $row['question'];
        $markschemeText = $row['markscheme'];
        $orderValue = ++$currentOrderValue;

        if ($insertStmt->execute()) {
            $createdCount++;
        } else {
            $errors[] = 'Row ' . $row['row'] . ': ' . $insertStmt->error;
            $skippedCount++;
        }
    }

    $insertStmt->close();

    $mysqli->commit();

    $response = [
        'message' => 'Bulk question upload completed.',
        'created_count' => $createdCount,
        'skipped_count' => $skippedCount,
    ];

    if (!empty($errors)) {
        $response['warnings'] = $errors;
    }

    send_response($response, 200);
} catch (Exception $e) {
    $mysqli->rollback();
    send_response('Bulk question upload failed: ' . $e->getMessage(), 500);
}
?>
