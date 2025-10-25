<?php
require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to analytics data
requireAuth();

/**
 * Advanced Analytics API for Teaching Dashboard
 * Provides comprehensive statistics for teachers to track student progress
 */

$requestType = $receivedData['type'] ?? $_GET['type'] ?? '';

log_info("Analytics request: " . json_encode($receivedData));
log_info("Request type: " . $requestType);
log_info("Raw input: " . file_get_contents('php://input'));

switch ($requestType) {
    case 'departments':
        getDepartments();
        break;
    case 'all_questions':
        getAllQuestions();
        break;
    case 'departmentStats':
        getDepartmentStats($receivedData['department']);
        break;
    case 'studentStats':
        log_info("Routing to getStudentStats with studentId: " . $receivedData['studentId']);
        getStudentStats($receivedData['studentId']);
        break;
    case 'questionStats':
        getQuestionStats($receivedData['questionId']);
        break;
    case 'studentProgress':
        getStudentProgressOverTime($receivedData['studentId']);
        break;
    case 'improvementAnalysis':
        getImprovementAnalysis($receivedData['studentId']);
        break;
    default:
        log_info("Invalid request type: " . $requestType);
        send_response("Invalid request type: " . $requestType, 400);
}

function getDepartments() {
    global $mysqli;
    
    $query = "SELECT DISTINCT userLocation as department 
              FROM tbluser 
              WHERE userLocation IS NOT NULL 
              AND userLocation != '' 
              AND admin != 1 
              ORDER BY userLocation";
    
    $result = $mysqli->query($query);
    
    if ($result) {
        $departments = [];
        while ($row = $result->fetch_assoc()) {
            $departments[] = $row['department'];
        }
        send_response(json_encode($departments), 200);
    } else {
        send_response("Error fetching departments: " . $mysqli->error, 500);
    }
}

function getAllQuestions() {
    global $mysqli;
    
    $query = "SELECT q.id, q.question, t.topic, s.subject 
              FROM tblquestion q
              JOIN tbltopic t ON q.topicid = t.id
              JOIN tblsubject s ON t.subjectid = s.id
              ORDER BY s.subject, t.topic, q.id";
    
    $result = $mysqli->query($query);
    
    if ($result) {
        $questions = [];
        while ($row = $result->fetch_assoc()) {
            $questions[] = $row;
        }
        send_response(json_encode($questions), 200);
    } else {
        send_response("Error fetching questions: " . $mysqli->error, 500);
    }
}

function getDepartmentStats($department) {
    global $mysqli;
    
    if (empty($department)) {
        send_response("Department parameter required", 400);
        return;
    }
    
    log_info("getDepartmentStats called with department: " . $department);
    
    // Get basic department statistics
    $statsQuery = "
        SELECT 
            COUNT(DISTINCT r.topic_id) as topicsAnswered,
            COUNT(DISTINCT r.question_id) as questionsAnswered,
            COUNT(DISTINCT r.user_id) as totalStudents,
            ROUND(AVG(r.attempt_number), 2) as avgAttempts
        FROM tblresponse r
        JOIN tbluser u ON r.user_id = u.id
        WHERE u.userLocation = ? AND u.admin != 1
    ";
    
    $stmt = $mysqli->prepare($statsQuery);
    $stmt->bind_param("s", $department);
    $stmt->execute();
    $statsResult = $stmt->get_result();
    $stats = $statsResult->fetch_assoc();
    log_info("Stats query result: " . json_encode($stats));
    
    // Get student breakdown for the department
    $studentQuery = "
        SELECT 
            u.userName as name,
            COUNT(DISTINCT r.topic_id) as topicsAnswered,
            COUNT(DISTINCT r.question_id) as questionsAnswered,
            SUM(CASE WHEN r.teacher_rating = 'R' THEN 1 ELSE 0 END) as redCount,
            SUM(CASE WHEN r.teacher_rating = 'A' THEN 1 ELSE 0 END) as amberCount,
            SUM(CASE WHEN r.teacher_rating = 'G' THEN 1 ELSE 0 END) as greenCount,
            COUNT(*) as totalResponses,
            (SELECT COUNT(*) FROM tblresponse r2 
             WHERE r2.user_id = u.id AND r2.attempt_number > 1 
             AND (
                 CASE 
                     WHEN r2.teacher_rating = 'G' THEN 3
                     WHEN r2.teacher_rating = 'A' THEN 2
                     WHEN r2.teacher_rating = 'R' THEN 1
                     ELSE 0
                 END
             ) > (
                 SELECT CASE 
                     WHEN r3.teacher_rating = 'G' THEN 3
                     WHEN r3.teacher_rating = 'A' THEN 2
                     WHEN r3.teacher_rating = 'R' THEN 1
                     ELSE 0
                 END
                 FROM tblresponse r3 
                 WHERE r3.user_id = r2.user_id 
                 AND r3.question_id = r2.question_id 
                 AND r3.attempt_number = r2.attempt_number - 1
             )) as improvementCount
        FROM tbluser u
        LEFT JOIN tblresponse r ON u.id = r.user_id
        WHERE u.userLocation = ? AND u.admin != 1
        GROUP BY u.id, u.userName
        ORDER BY u.userName
    ";
    
    $stmt = $mysqli->prepare($studentQuery);
    $stmt->bind_param("s", $department);
    $stmt->execute();
    $studentResult = $stmt->get_result();
    
    $students = [];
    while ($row = $studentResult->fetch_assoc()) {
        if ($row['totalResponses'] > 0) {
            $row['redPercent'] = round(($row['redCount'] / $row['totalResponses']) * 100, 1);
            $row['amberPercent'] = round(($row['amberCount'] / $row['totalResponses']) * 100, 1);
            $row['greenPercent'] = round(($row['greenCount'] / $row['totalResponses']) * 100, 1);
        } else {
            $row['redPercent'] = $row['amberPercent'] = $row['greenPercent'] = 0;
        }
        $studentBreakdown[] = $row;
    }
    
    $stats['studentBreakdown'] = $studentBreakdown;
    
    send_response(json_encode($stats), 200);
}

function getStudentStats($studentId) {
    global $mysqli;
    
    if (empty($studentId)) {
        send_response("Student ID parameter required", 400);
        return;
    }
        
        // Now let's get the actual stats using the same structure as getUserResponses.php
        $statsQuery = "
            SELECT 
                COUNT(DISTINCT r.topic_id) as topicsAnswered,
                COUNT(DISTINCT r.question_id) as questionsAnswered,
                COUNT(*) as totalAttempts,
                SUM(CASE WHEN r.teacher_rating = 'R' THEN 1 ELSE 0 END) as redCount,
                SUM(CASE WHEN r.teacher_rating = 'A' THEN 1 ELSE 0 END) as amberCount,
                SUM(CASE WHEN r.teacher_rating = 'G' THEN 1 ELSE 0 END) as greenCount,
                SUM(CASE WHEN r.teacher_rating IS NULL THEN 1 ELSE 0 END) as unratedCount
            FROM tblresponse r
            WHERE r.user_id = ?
        ";
        
        $stmt = $mysqli->prepare($statsQuery);
        $stmt->bind_param("i", $studentId);
        $stmt->execute();
        $result = $stmt->get_result();
        $stats = $result->fetch_assoc();
        
        log_info("Raw stats from database: " . json_encode($stats));
        
        // Calculate percentages
        if ($stats['totalAttempts'] > 0) {
            $stats['redPercent'] = round(($stats['redCount'] / $stats['totalAttempts']) * 100, 1);
            $stats['amberPercent'] = round(($stats['amberCount'] / $stats['totalAttempts']) * 100, 1);
            $stats['greenPercent'] = round(($stats['greenCount'] / $stats['totalAttempts']) * 100, 1);
            $stats['unratedPercent'] = round(($stats['unratedCount'] / $stats['totalAttempts']) * 100, 1);
        } else {
            $stats['redPercent'] = $stats['amberPercent'] = $stats['greenPercent'] = $stats['unratedPercent'] = 0;
        }
        
        // Get question attempts breakdown
        $questionQuery = "
            SELECT 
                q.question,
                t.topic as topicName,
                r.attempt_number as attemptCount,
                r.teacher_rating as latestRag
            FROM tblresponse r
            LEFT JOIN tblquestion q ON r.question_id = q.id
            LEFT JOIN tbltopic t ON r.topic_id = t.id
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
        ";
        
        $stmt = $mysqli->prepare($questionQuery);
        $stmt->bind_param("i", $studentId);
        $stmt->execute();
        $questionResult = $stmt->get_result();
        
        $questionAttempts = [];
        while ($row = $questionResult->fetch_assoc()) {
            $questionAttempts[] = $row;
        }
        
        $stats['questionAttempts'] = $questionAttempts;
        
        // Calculate improvements (simple count of questions with multiple attempts)
        $improvementQuery = "
            SELECT COUNT(DISTINCT r.question_id) as improvements
            FROM tblresponse r
            WHERE r.user_id = ? AND r.attempt_number > 1
        ";
        
        $stmt = $mysqli->prepare($improvementQuery);
        $stmt->bind_param("i", $studentId);
        $stmt->execute();
        $improvementResult = $stmt->get_result();
        $improvementData = $improvementResult->fetch_assoc();
        
        $stats['improvementCount'] = (int)$improvementData['improvements'];
        
        log_info("Final stats to send: " . json_encode($stats));
        send_response(json_encode($stats), 200);
    
    // First check if student has any responses at all
    $checkQuery = "SELECT COUNT(*) as total FROM tblresponse WHERE user_id = ?";
    $checkStmt = $mysqli->prepare($checkQuery);
    if (!$checkStmt) {
        log_info("Failed to prepare check query: " . $mysqli->error);
        send_response("Database error: " . $mysqli->error, 500);
        return;
    }
    
    $checkStmt->bind_param("i", $studentId);
    if (!$checkStmt->execute()) {
        log_info("Failed to execute check query: " . $checkStmt->error);
        send_response("Database error: " . $checkStmt->error, 500);
        return;
    }
    
    $checkResult = $checkStmt->get_result();
    $checkData = $checkResult->fetch_assoc();
    log_info("Student has " . $checkData['total'] . " total responses in tblresponse");
    
    // Check if student has any responses with teacher ratings
    $ratingQuery = "SELECT COUNT(*) as with_ratings FROM tblresponse WHERE user_id = ? AND teacher_rating IS NOT NULL";
    $ratingStmt = $mysqli->prepare($ratingQuery);
    if (!$ratingStmt) {
        log_info("Failed to prepare rating query: " . $mysqli->error);
        send_response("Database error: " . $mysqli->error, 500);
        return;
    }
    
    $ratingStmt->bind_param("i", $studentId);
    if (!$ratingStmt->execute()) {
        log_info("Failed to execute rating query: " . $ratingStmt->error);
        send_response("Database error: " . $ratingStmt->error, 500);
        return;
    }
    
    $ratingResult = $ratingStmt->get_result();
    $ratingData = $ratingResult->fetch_assoc();
    log_info("Student has " . $ratingData['with_ratings'] . " responses with teacher ratings");
    
    // Check if student exists in tbluser
    $userQuery = "SELECT userName FROM tbluser WHERE id = ?";
    $userStmt = $mysqli->prepare($userQuery);
    if (!$userStmt) {
        log_info("Failed to prepare user query: " . $mysqli->error);
        send_response("Database error: " . $mysqli->error, 500);
        return;
    }
    
    $userStmt->bind_param("i", $studentId);
    if (!$userStmt->execute()) {
        log_info("Failed to execute user query: " . $userStmt->error);
        send_response("Database error: " . $userStmt->error, 500);
        return;
    }
    
    $userResult = $userStmt->get_result();
    $userData = $userResult->fetch_assoc();
    log_info("Student info: " . json_encode($userData));
    
    // Get basic student statistics
    $statsQuery = "
        SELECT 
            COUNT(DISTINCT r.topic_id) as topicsAnswered,
            COUNT(DISTINCT r.question_id) as questionsAnswered,
            COUNT(*) as totalAttempts,
            SUM(CASE WHEN r.teacher_rating = 'R' THEN 1 ELSE 0 END) as redCount,
            SUM(CASE WHEN r.teacher_rating = 'A' THEN 1 ELSE 0 END) as amberCount,
            SUM(CASE WHEN r.teacher_rating = 'G' THEN 1 ELSE 0 END) as greenCount,
            SUM(CASE WHEN r.teacher_rating IS NULL THEN 1 ELSE 0 END) as unratedCount,
            (SELECT COUNT(*) FROM tblresponse r2 
             WHERE r2.user_id = ? AND r2.attempt_number > 1 
             AND r2.teacher_rating IS NOT NULL
             AND (
                 CASE 
                     WHEN r2.teacher_rating = 'G' THEN 3
                     WHEN r2.teacher_rating = 'A' THEN 2
                     WHEN r2.teacher_rating = 'R' THEN 1
                     ELSE 0
                 END
             ) > (
                 SELECT CASE 
                     WHEN r3.teacher_rating = 'G' THEN 3
                     WHEN r3.teacher_rating = 'A' THEN 2
                     WHEN r3.teacher_rating = 'R' THEN 1
                     ELSE 0
                 END
                 FROM tblresponse r3 
                 WHERE r3.user_id = r2.user_id 
                 AND r3.question_id = r2.question_id 
                 AND r3.attempt_number = r2.attempt_number - 1
                 AND r3.teacher_rating IS NOT NULL
             )) as improvementCount
        FROM tblresponse r
        WHERE r.user_id = ?
    ";
    
    $stmt = $mysqli->prepare($statsQuery);
    if (!$stmt) {
        log_info("Error preparing student stats query: " . $mysqli->error);
        send_response("Database error: " . $mysqli->error, 500);
        return;
    }
    
    log_info("Executing student stats query for studentId: " . $studentId);
    $stmt->bind_param("ii", $studentId, $studentId);
    if (!$stmt->execute()) {
        log_info("Error executing student stats query: " . $stmt->error);
        send_response("Database error: " . $stmt->error, 500);
        return;
    }
    
    $statsResult = $stmt->get_result();
    $stats = $statsResult->fetch_assoc();
    log_info("Student stats raw result: " . json_encode($stats));
    
    if (!$stats) {
        log_info("No stats found for student ID: " . $studentId);
        // Return empty stats instead of error
        $stats = [
            'topicsAnswered' => 0,
            'questionsAnswered' => 0,
            'totalAttempts' => 0,
            'redCount' => 0,
            'amberCount' => 0,
            'greenCount' => 0,
            'improvementCount' => 0
        ];
    }
    
    // Calculate percentages
    if ($stats['totalAttempts'] > 0) {
        $stats['redPercent'] = round(($stats['redCount'] / $stats['totalAttempts']) * 100, 1);
        $stats['amberPercent'] = round(($stats['amberCount'] / $stats['totalAttempts']) * 100, 1);
        $stats['greenPercent'] = round(($stats['greenCount'] / $stats['totalAttempts']) * 100, 1);
        $stats['unratedPercent'] = round(($stats['unratedCount'] / $stats['totalAttempts']) * 100, 1);
    } else {
        $stats['redPercent'] = $stats['amberPercent'] = $stats['greenPercent'] = $stats['unratedPercent'] = 0;
    }
    
    // Get question attempts breakdown
    $questionQuery = "
        SELECT 
            q.question,
            t.topic as topicName,
            MAX(r.attempt_number) as attemptCount,
            (SELECT r2.teacher_rating FROM tblresponse r2 
             WHERE r2.user_id = r.user_id AND r2.question_id = r.question_id 
             ORDER BY r2.attempt_number DESC LIMIT 1) as latestRag,
            (CASE WHEN MAX(r.attempt_number) > 1 THEN 
                (SELECT COUNT(*) > 0 FROM tblresponse r3 
                 WHERE r3.user_id = r.user_id AND r3.question_id = r.question_id 
                 AND r3.attempt_number > 1 
                 AND (
                     CASE 
                         WHEN r3.teacher_rating = 'G' THEN 3
                         WHEN r3.teacher_rating = 'A' THEN 2
                         WHEN r3.teacher_rating = 'R' THEN 1
                         ELSE 0
                     END
                 ) > (
                     SELECT CASE 
                         WHEN r4.teacher_rating = 'G' THEN 3
                         WHEN r4.teacher_rating = 'A' THEN 2
                         WHEN r4.teacher_rating = 'R' THEN 1
                         ELSE 0
                     END
                     FROM tblresponse r4 
                     WHERE r4.user_id = r3.user_id 
                     AND r4.question_id = r3.question_id 
                     AND r4.attempt_number = r3.attempt_number - 1
                 ))
             ELSE 0 END) as improved
        FROM tblresponse r
        JOIN tblquestion q ON r.question_id = q.id
        JOIN tbltopic t ON q.topicid = t.id
        WHERE r.user_id = ?
        GROUP BY r.question_id, q.question, t.topic
        ORDER BY MAX(r.attempt_number) DESC, t.topic
    ";
    
    $stmt = $mysqli->prepare($questionQuery);
    $stmt->bind_param("i", $studentId);
    $stmt->execute();
    $questionResult = $stmt->get_result();
    
    $questionAttempts = [];
    while ($row = $questionResult->fetch_assoc()) {
        $questionAttempts[] = $row;
    }
    
    $stats['questionAttempts'] = $questionAttempts;
    
        send_response(json_encode($stats), 200);
}function getQuestionStats($questionId) {
    global $mysqli;
    
    if (empty($questionId)) {
        send_response("Question ID parameter required", 400);
        return;
    }
    
    // Get basic question statistics
    $statsQuery = "
        SELECT 
            COUNT(*) as totalAttempts,
            COUNT(DISTINCT r.user_id) as uniqueStudents,
            COUNT(DISTINCT u.userLocation) as classesAttempted,
            ROUND(AVG(
                CASE 
                    WHEN r.teacher_rating = 'R' THEN 1
                    WHEN r.teacher_rating = 'A' THEN 2
                    WHEN r.teacher_rating = 'G' THEN 3
                    ELSE 0
                END
            ), 2) as avgRagScore
        FROM tblresponse r
        JOIN tbluser u ON r.user_id = u.id
        WHERE r.question_id = ? AND u.admin != 1
    ";
    
    $stmt = $mysqli->prepare($statsQuery);
    $stmt->bind_param("i", $questionId);
    $stmt->execute();
    $statsResult = $stmt->get_result();
    $stats = $statsResult->fetch_assoc();
    
    // Get department breakdown
    $deptQuery = "
        SELECT 
            u.userLocation as department,
            COUNT(DISTINCT r.user_id) as studentCount,
            COUNT(*) as attempts,
            SUM(CASE WHEN r.teacher_rating = 'R' THEN 1 ELSE 0 END) as redCount,
            SUM(CASE WHEN r.teacher_rating = 'A' THEN 1 ELSE 0 END) as amberCount,
            SUM(CASE WHEN r.teacher_rating = 'G' THEN 1 ELSE 0 END) as greenCount,
            ROUND((SUM(CASE WHEN r.teacher_rating = 'G' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as successRate
        FROM tblresponse r
        JOIN tbluser u ON r.user_id = u.id
        WHERE r.question_id = ? AND u.admin != 1 AND u.userLocation IS NOT NULL
        GROUP BY u.userLocation
        ORDER BY u.userLocation
    ";
    
    $stmt = $mysqli->prepare($deptQuery);
    $stmt->bind_param("i", $questionId);
    $stmt->execute();
    $deptResult = $stmt->get_result();
    
    $departmentBreakdown = [];
    while ($row = $deptResult->fetch_assoc()) {
        $departmentBreakdown[] = $row;
    }
    
    $stats['departmentBreakdown'] = $departmentBreakdown;
    
    send_response(json_encode($stats), 200);
}

function getRagValue($rating) {
    switch (strtoupper($rating)) {
        case 'R': return 1;
        case 'A': return 2;
        case 'G': return 3;
        default: return 0;
    }
}

/**
 * Get student progress over time for graphing
 * Returns RAG ratings with timestamps for visualization
 */
function getStudentProgressOverTime($studentId) {
    global $mysqli;
    
    if (empty($studentId)) {
        send_response("Student ID parameter required", 400);
        return;
    }
    
    // Get all responses with timestamps, ordered by date
    $progressQuery = "
        SELECT 
            r.created_at,
            r.teacher_rating,
            q.question,
            t.topic,
            s.subject,
            r.attempt_number,
            CASE 
                WHEN r.teacher_rating = 'G' THEN 3
                WHEN r.teacher_rating = 'A' THEN 2
                WHEN r.teacher_rating = 'R' THEN 1
                ELSE 0
            END as rag_value
        FROM tblresponse r
        JOIN tblquestion q ON r.question_id = q.id
        JOIN tbltopic t ON q.topicid = t.id
        JOIN tblsubject s ON t.subjectid = s.id
        WHERE r.user_id = ? AND r.teacher_rating IS NOT NULL
        ORDER BY r.created_at ASC
    ";
    
    $stmt = $mysqli->prepare($progressQuery);
    $stmt->bind_param("i", $studentId);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $progressData = [];
    $cumulativeAverage = [];
    $totalRagValue = 0;
    $count = 0;
    
    while ($row = $result->fetch_assoc()) {
        $count++;
        $totalRagValue += $row['rag_value'];
        $cumulativeAvg = $totalRagValue / $count;
        
        $progressData[] = [
            'date' => $row['created_at'],
            'rating' => $row['teacher_rating'],
            'ragValue' => (int)$row['rag_value'],
            'question' => $row['question'],
            'topic' => $row['topic'],
            'subject' => $row['subject'],
            'attemptNumber' => (int)$row['attempt_number'],
            'cumulativeAverage' => round($cumulativeAvg, 2)
        ];
    }
    
    // Calculate weekly/monthly averages for smoother trending
    $weeklyAverages = [];
    $currentWeek = null;
    $weekData = [];
    
    foreach ($progressData as $entry) {
        $week = date('Y-W', strtotime($entry['date']));
        
        if ($currentWeek !== $week) {
            if (!empty($weekData)) {
                $weeklyAverages[] = [
                    'week' => $currentWeek,
                    'averageRag' => round(array_sum($weekData) / count($weekData), 2),
                    'responseCount' => count($weekData)
                ];
            }
            $currentWeek = $week;
            $weekData = [$entry['ragValue']];
        } else {
            $weekData[] = $entry['ragValue'];
        }
    }
    
    // Add the last week
    if (!empty($weekData)) {
        $weeklyAverages[] = [
            'week' => $currentWeek,
            'averageRag' => round(array_sum($weekData) / count($weekData), 2),
            'responseCount' => count($weekData)
        ];
    }
    
    $response = [
        'progressData' => $progressData,
        'weeklyAverages' => $weeklyAverages,
        'totalResponses' => count($progressData),
        'overallAverage' => $count > 0 ? round($totalRagValue / $count, 2) : 0
    ];
    
    send_response(json_encode($response), 200);
}

/**
 * Analyze different types of improvement for a student
 */
function getImprovementAnalysis($studentId) {
    global $mysqli;
    
    if (empty($studentId)) {
        send_response("Student ID parameter required", 400);
        return;
    }
    
    // Type 1: Same question retry improvements
    $retryImprovementQuery = "
        SELECT 
            COUNT(*) as retryImprovements,
            GROUP_CONCAT(DISTINCT q.question SEPARATOR '; ') as improvedQuestions
        FROM tblresponse r1
        JOIN tblresponse r2 ON r1.user_id = r2.user_id AND r1.question_id = r2.question_id
        JOIN tblquestion q ON r1.question_id = q.id
        WHERE r1.user_id = ? 
        AND r1.attempt_number < r2.attempt_number
        AND r1.teacher_rating IS NOT NULL 
        AND r2.teacher_rating IS NOT NULL
        AND (
            CASE 
                WHEN r2.teacher_rating = 'G' THEN 3
                WHEN r2.teacher_rating = 'A' THEN 2
                WHEN r2.teacher_rating = 'R' THEN 1
                ELSE 0
            END
        ) > (
            CASE 
                WHEN r1.teacher_rating = 'G' THEN 3
                WHEN r1.teacher_rating = 'A' THEN 2
                WHEN r1.teacher_rating = 'R' THEN 1
                ELSE 0
            END
        )
    ";
    
    $stmt = $mysqli->prepare($retryImprovementQuery);
    $stmt->bind_param("i", $studentId);
    $stmt->execute();
    $retryResult = $stmt->get_result();
    $retryData = $retryResult->fetch_assoc();
    
    // Type 2: Overall performance trend (comparing first half vs second half of responses)
    $trendQuery = "
        SELECT 
            AVG(CASE 
                WHEN r.teacher_rating = 'G' THEN 3
                WHEN r.teacher_rating = 'A' THEN 2
                WHEN r.teacher_rating = 'R' THEN 1
                ELSE 0
            END) as overallAverage,
            COUNT(*) as totalRated
        FROM tblresponse r
        WHERE r.user_id = ? AND r.teacher_rating IS NOT NULL
    ";
    
    $stmt = $mysqli->prepare($trendQuery);
    $stmt->bind_param("i", $studentId);
    $stmt->execute();
    $trendResult = $stmt->get_result();
    $trendData = $trendResult->fetch_assoc();
    
    // Get first half vs second half performance - using simpler approach
    $countQuery = "SELECT COUNT(*) as total FROM tblresponse WHERE user_id = ? AND teacher_rating IS NOT NULL";
    $countStmt = $mysqli->prepare($countQuery);
    $countStmt->bind_param("i", $studentId);
    $countStmt->execute();
    $countResult = $countStmt->get_result();
    $totalCount = $countResult->fetch_assoc()['total'];
    $halfPoint = ceil($totalCount / 2);
    
    // Simplified approach - get all responses and calculate in PHP
    $allResponsesQuery = "
        SELECT 
            CASE 
                WHEN teacher_rating = 'G' THEN 3
                WHEN teacher_rating = 'A' THEN 2
                WHEN teacher_rating = 'R' THEN 1
                ELSE 0
            END as rag_value
        FROM tblresponse
        WHERE user_id = ? AND teacher_rating IS NOT NULL
        ORDER BY created_at
    ";
    
    $stmt = $mysqli->prepare($allResponsesQuery);
    $stmt->bind_param("i", $studentId);
    $stmt->execute();
    $allResult = $stmt->get_result();
    
    $allResponses = [];
    while ($row = $allResult->fetch_assoc()) {
        $allResponses[] = (int)$row['rag_value'];
    }
    
    $firstHalfAvg = 0;
    $secondHalfAvg = 0;
    
    if (count($allResponses) > 0) {
        $firstHalf = array_slice($allResponses, 0, $halfPoint);
        $secondHalf = array_slice($allResponses, $halfPoint);
        
        $firstHalfAvg = count($firstHalf) > 0 ? array_sum($firstHalf) / count($firstHalf) : 0;
        $secondHalfAvg = count($secondHalf) > 0 ? array_sum($secondHalf) / count($secondHalf) : 0;
    }
    
    // Calculate improvement trend
    $improvementTrend = $secondHalfAvg - $firstHalfAvg;
    
    // Type 3: Subject-specific improvements
    $subjectQuery = "
        SELECT 
            s.subject,
            AVG(CASE 
                WHEN r.teacher_rating = 'G' THEN 3
                WHEN r.teacher_rating = 'A' THEN 2
                WHEN r.teacher_rating = 'R' THEN 1
                ELSE 0
            END) as subject_average,
            COUNT(*) as attempts
        FROM tblresponse r
        JOIN tblquestion q ON r.question_id = q.id
        JOIN tbltopic t ON q.topicid = t.id
        JOIN tblsubject s ON t.subjectid = s.id
        WHERE r.user_id = ? AND r.teacher_rating IS NOT NULL
        GROUP BY s.subject
        ORDER BY subject_average DESC
    ";
    
    $stmt = $mysqli->prepare($subjectQuery);
    $stmt->bind_param("i", $studentId);
    $stmt->execute();
    $subjectResult = $stmt->get_result();
    
    $subjectPerformance = [];
    while ($row = $subjectResult->fetch_assoc()) {
        $subjectPerformance[] = [
            'subject' => $row['subject'],
            'average' => round($row['subject_average'], 2),
            'attempts' => (int)$row['attempts']
        ];
    }
    
    $response = [
        'retryImprovements' => (int)$retryData['retryImprovements'],
        'improvedQuestions' => $retryData['improvedQuestions'] ?? '',
        'overallTrend' => round($improvementTrend, 2),
        'firstHalfAverage' => round($firstHalfAvg, 2),
        'secondHalfAverage' => round($secondHalfAvg, 2),
        'subjectPerformance' => $subjectPerformance,
        'totalRatedResponses' => (int)($trendData['totalRated'] ?? 0),
        'overallAverage' => round($trendData['overallAverage'] ?? 0, 2),
        'totalCount' => $totalCount,
        'halfPoint' => $halfPoint
    ];
    
    send_response(json_encode($response), 200);
}

?>