<?php
/****************************************************************************
 * Get User Statistics Endpoint
 * 
 * Retrieves detailed statistics for a specific user including:
 * - Questions attempted and completed per subject/topic
 * - Average grades
 * - Total time spent
 * - Last activity timestamp
 * 
 * Used for:
 * - Student progress dashboards
 * - Analytics and reporting
 * - Teacher review of individual students
 * 
 * Security:
 * - Protected by requireAuth()
 * - Uses GET method (different from other endpoints)
 * - Validates user ID parameter
 * 
 * @requires simple_security.php - Security validation
 * @requires setup.php - Database connection
 * @input $_GET['userId'] - User ID to retrieve stats for
 * @output JSON object with statistics keyed by subject_topic
 * 
 * @version 1.0
 * @note Uses GET instead of POST - consider standardizing to POST
 ****************************************************************************/

require_once 'simple_security.php';
include 'setup.php';

// Block direct browser access to user statistics
requireAuth();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Get database connection
    
    try {
        $userId = $_GET['userId'] ?? null;
        
        if (!$userId) {
            echo json_encode([
                "error" => "User ID is required"
            ]);
            exit;
        }
        
        // Get user statistics
        $stmt = $conn->prepare("
            SELECT 
                subject_id,
                topic_id,
                total_questions_attempted,
                total_questions_completed,
                average_grade,
                total_time_spent,
                last_activity
            FROM tbluser_stats 
            WHERE user_id = ?
        ");
        
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $stats = [];
        while ($row = $result->fetch_assoc()) {
            $key = $row['topic_id'] ? $row['subject_id'] . '_' . $row['topic_id'] : $row['subject_id'];
            $stats[$key] = [
                'attempted' => (int)$row['total_questions_attempted'],
                'completed' => (int)$row['total_questions_completed'],
                'averageGrade' => $row['average_grade'],
                'timeSpent' => (int)$row['total_time_spent'],
                'lastActivity' => $row['last_activity']
            ];
        }
        
        echo json_encode($stats);
        
    } catch (Exception $e) {
        echo json_encode([
            "error" => "Database error: " . $e->getMessage()
        ]);
    }
} else {
    echo json_encode([
        "error" => "Invalid request method"
    ]);
}
?>