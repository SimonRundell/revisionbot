<?php
/****************************************************************************
 * Get Student Rewards Endpoint
 *
 * Returns student-facing reward analytics and badge achievements.
 * Calculations are based on the latest attempt per question for the student.
 *
 * Stats returned:
 * - questionsAnswered (unique questions attempted)
 * - retries (extra attempts beyond first attempts)
 * - pendingRag (unique questions whose latest attempt is unrated)
 * - redCount / amberCount / greenCount (latest rated attempts only)
 * - greenPercentOverall
 * - amberOrGreenPercentOverall
 * - noRedStreak (consecutive rated answers from latest backward without Red)
 * - greenStreak (consecutive rated answers from latest backward with Green)
 *
 * Badge tracks:
 * 1) Green % overall            => G-25 ... G-90
 * 2) Amber+Green % overall      => GA-25 ... GA-90
 * 3) No Red streak              => 0-2 ... 0-20
 * 4) Green streak               => 100-2 ... 100-20
 *
 * Security:
 * - Protected by requireAuth()
 * - Uses POST JSON payload: { userId: number }
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

requireAuth();

$userId = isset($receivedData['userId']) ? (int)$receivedData['userId'] : 0;
if ($userId <= 0) {
    send_response('Valid userId is required', 400);
}

$latestAttemptsQuery = "
    SELECT
        r.question_id,
        r.attempt_number,
        r.teacher_rating,
        r.created_at
    FROM tblresponse r
    INNER JOIN (
        SELECT question_id, MAX(attempt_number) AS max_attempt
        FROM tblresponse
        WHERE user_id = ?
        GROUP BY question_id
    ) latest
        ON latest.question_id = r.question_id
       AND latest.max_attempt = r.attempt_number
    WHERE r.user_id = ?
    ORDER BY r.created_at DESC
";

$latestStmt = $mysqli->prepare($latestAttemptsQuery);
if (!$latestStmt) {
    send_response('Failed to prepare latest attempts query: ' . $mysqli->error, 500);
}

$latestStmt->bind_param('ii', $userId, $userId);
if (!$latestStmt->execute()) {
    send_response('Failed to execute latest attempts query: ' . $latestStmt->error, 500);
}

$latestResult = $latestStmt->get_result();
$latestAttempts = [];
while ($row = $latestResult->fetch_assoc()) {
    $latestAttempts[] = [
        'questionId' => (int)$row['question_id'],
        'attemptNumber' => (int)$row['attempt_number'],
        'teacherRating' => $row['teacher_rating'],
        'createdAt' => $row['created_at']
    ];
}
$latestStmt->close();

$questionsAnswered = count($latestAttempts);
$retries = 0;
$pendingRag = 0;
$redCount = 0;
$amberCount = 0;
$greenCount = 0;

foreach ($latestAttempts as $attempt) {
    $retries += max(0, $attempt['attemptNumber'] - 1);

    $rating = $attempt['teacherRating'];
    if ($rating === null || $rating === '') {
        $pendingRag++;
        continue;
    }

    if ($rating === 'R') {
        $redCount++;
    } elseif ($rating === 'A') {
        $amberCount++;
    } elseif ($rating === 'G') {
        $greenCount++;
    }
}

$greenPercentOverall = 0;
$amberOrGreenPercentOverall = 0;
if ($questionsAnswered > 0) {
    $greenPercentOverall = round(($greenCount / $questionsAnswered) * 100, 1);
    $amberOrGreenPercentOverall = round((($amberCount + $greenCount) / $questionsAnswered) * 100, 1);
}

// Streaks ignore unrated responses and evaluate from latest rated backward.
$noRedStreak = 0;
$greenStreak = 0;

$ratedAttempts = array_values(array_filter($latestAttempts, function ($attempt) {
    return $attempt['teacherRating'] !== null && $attempt['teacherRating'] !== '';
}));

foreach ($ratedAttempts as $attempt) {
    if ($attempt['teacherRating'] === 'R') {
        break;
    }
    $noRedStreak++;
}

foreach ($ratedAttempts as $attempt) {
    if ($attempt['teacherRating'] !== 'G') {
        break;
    }
    $greenStreak++;
}

$percentageThresholds = [25, 30, 40, 50, 60, 70, 80, 90];
$streakThresholds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 20];

function earnedPercentageBadges($percent, $thresholds, $prefix) {
    $earned = [];
    foreach ($thresholds as $threshold) {
        if ($percent >= $threshold) {
            $earned[] = [
                'threshold' => $threshold,
                'filename' => $prefix . '-' . $threshold . '.png',
                'src' => '/' . $prefix . '-' . $threshold . '.png'
            ];
        }
    }
    return $earned;
}

function earnedStreakBadges($streak, $thresholds, $prefix) {
    $earned = [];
    foreach ($thresholds as $threshold) {
        if ($streak >= $threshold) {
            $earned[] = [
                'threshold' => $threshold,
                'filename' => $prefix . '-' . $threshold . '.png',
                'src' => '/' . $prefix . '-' . $threshold . '.png'
            ];
        }
    }
    return $earned;
}

$greenPercentBadges = earnedPercentageBadges($greenPercentOverall, $percentageThresholds, 'G');
$amberGreenPercentBadges = earnedPercentageBadges($amberOrGreenPercentOverall, $percentageThresholds, 'GA');
$noRedStreakBadges = earnedStreakBadges($noRedStreak, $streakThresholds, '0');
$greenStreakBadges = earnedStreakBadges($greenStreak, $streakThresholds, '100');

$highestBadges = [
    'greenPercent' => count($greenPercentBadges) > 0 ? end($greenPercentBadges) : null,
    'amberOrGreenPercent' => count($amberGreenPercentBadges) > 0 ? end($amberGreenPercentBadges) : null,
    'noRedStreak' => count($noRedStreakBadges) > 0 ? end($noRedStreakBadges) : null,
    'greenStreak' => count($greenStreakBadges) > 0 ? end($greenStreakBadges) : null,
];

$responseData = [
    'questionsAnswered' => $questionsAnswered,
    'retries' => $retries,
    'pendingRag' => $pendingRag,
    'redCount' => $redCount,
    'amberCount' => $amberCount,
    'greenCount' => $greenCount,
    'greenPercentOverall' => $greenPercentOverall,
    'amberOrGreenPercentOverall' => $amberOrGreenPercentOverall,
    'noRedStreak' => $noRedStreak,
    'greenStreak' => $greenStreak,
    'badgeTracks' => [
        'greenPercent' => $greenPercentBadges,
        'amberOrGreenPercent' => $amberGreenPercentBadges,
        'noRedStreak' => $noRedStreakBadges,
        'greenStreak' => $greenStreakBadges,
    ],
    'highestBadges' => $highestBadges
];

send_response(json_encode($responseData), 200);
?>