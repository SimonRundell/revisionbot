<?php
/****************************************************************************
 * Get System Statistics Endpoint
 * 
 * Retrieves comprehensive system-wide statistics:
 * - Total counts: subjects, topics, questions
 * - Questions with attachments count
 * - Subject breakdown with topic/question counts
 * - Recent activity (last 10 questions created)
 * 
 * Used for:
 * - Admin dashboard overview
 * - System health monitoring
 * - Content management insights
 * 
 * Security:
 * - No security protection (should add requireAuth())
 * - Returns aggregate data only (not sensitive)
 * - Consider adding admin-only restriction
 * 
 * Returns:
 * {
 *   subjects: 5,
 *   topics: 20,
 *   questions: 150,
 *   questionsWithAttachments: 45,
 *   subjectBreakdown: [{subject, topic_count, question_count}],
 *   recentActivity: [{question, created_at, subject, topic}]
 * }
 * 
 * @requires setup.php - Database connection
 * @output JSON object with system statistics
 * 
 * @version 1.0
 * @todo Add requireAuth() for admin-only access
 ****************************************************************************/

include 'setup.php';

try {
    // Get overall statistics
    $stats = array();

    // Count subjects
    $subjectQuery = "SELECT COUNT(*) as count FROM tblsubject";
    $subjectResult = $mysqli->query($subjectQuery);
    $stats['subjects'] = $subjectResult->fetch_assoc()['count'];

    // Count topics
    $topicQuery = "SELECT COUNT(*) as count FROM tbltopic";
    $topicResult = $mysqli->query($topicQuery);
    $stats['topics'] = $topicResult->fetch_assoc()['count'];

    // Count questions
    $questionQuery = "SELECT COUNT(*) as count FROM tblquestion";
    $questionResult = $mysqli->query($questionQuery);
    $stats['questions'] = $questionResult->fetch_assoc()['count'];

    // Count questions with attachments
    $attachmentQuery = "SELECT COUNT(*) as count FROM tblquestion WHERE attachments IS NOT NULL AND attachments != '' AND attachments != '[]'";
    $attachmentResult = $mysqli->query($attachmentQuery);
    $stats['questionsWithAttachments'] = $attachmentResult->fetch_assoc()['count'];

    // Get subject breakdown
    $subjectBreakdownQuery = "
        SELECT 
            s.subject,
            s.id as subject_id,
            COUNT(DISTINCT t.id) as topic_count,
            COUNT(q.id) as question_count
        FROM tblsubject s
        LEFT JOIN tbltopic t ON s.id = t.subjectid
        LEFT JOIN tblquestion q ON t.id = q.topicid
        GROUP BY s.id, s.subject
        ORDER BY s.subject";
    
    $subjectBreakdownResult = $mysqli->query($subjectBreakdownQuery);
    $stats['subjectBreakdown'] = array();
    
    while ($row = $subjectBreakdownResult->fetch_assoc()) {
        $stats['subjectBreakdown'][] = $row;
    }

    // Get recent activity (last 10 questions created)
    $recentQuery = "
        SELECT 
            q.id,
            q.question,
            t.topic,
            s.subject
        FROM tblquestion q
        JOIN tbltopic t ON q.topicid = t.id
        JOIN tblsubject s ON t.subjectid = s.id
        ORDER BY q.id DESC
        LIMIT 10";
    
    $recentResult = $mysqli->query($recentQuery);
    $stats['recentQuestions'] = array();
    
    if ($recentResult) {
        while ($row = $recentResult->fetch_assoc()) {
            $stats['recentQuestions'][] = $row;
        }
    }

    log_info("Statistics retrieved successfully");
    send_response(json_encode($stats), 200);

} catch (Exception $e) {
    log_info("Statistics error: " . $e->getMessage());
    send_response("Statistics error: " . $e->getMessage(), 500);
}

?>