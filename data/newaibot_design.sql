
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u240325118_aibot`
--

-- --------------------------------------------------------

--
-- Table structure for table `tblquestion`
--

CREATE TABLE `tblquestion` (
  `id` int(11) NOT NULL,
  `topicid` int(11) DEFAULT NULL,
  `question` longtext DEFAULT NULL,
  `markscheme` longtext DEFAULT NULL COMMENT 'Answer, from which the AI should work',
  `attachments` longtext DEFAULT NULL COMMENT 'json list of base64 encoded files (images, etc) for attachment to the question',
  `question_order` int(11) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;



--
-- Table structure for table `tblresponse`
--

CREATE TABLE `tblresponse` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `topic_id` int(11) NOT NULL,
  `student_answer` text NOT NULL,
  `student_graphic` longtext DEFAULT NULL,
  `response_timestamp` timestamp NULL DEFAULT current_timestamp(),
  `time_taken` int(11) DEFAULT NULL,
  `ai_feedback` text DEFAULT NULL,
  `ai_processed` tinyint(1) DEFAULT 0,
  `ai_timestamp` timestamp NULL DEFAULT NULL,
  `ai_error` text DEFAULT NULL,
  `estimated_grade` varchar(10) DEFAULT NULL,
  `completion_status` enum('started','submitted','assessed') DEFAULT 'started',
  `session_id` varchar(100) DEFAULT NULL,
  `attempt_number` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `teacher_comment` text DEFAULT NULL,
  `teacher_rating` enum('R','A','G') DEFAULT NULL COMMENT 'R=Red, A=Amber, G=Green',
  `teacher_feedback_timestamp` timestamp NULL DEFAULT NULL,
  `teacher_id` int(11) DEFAULT NULL COMMENT 'ID of teacher who provided feedback'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;


--
-- Table structure for table `tblsubject`
--

CREATE TABLE `tblsubject` (
  `id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

--
-- Table structure for table `tbltopic`
--

CREATE TABLE `tbltopic` (
  `id` int(11) NOT NULL,
  `subjectid` int(11) NOT NULL,
  `topic` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

--
-----

--
-- Table structure for table `tbluser`
--

CREATE TABLE `tbluser` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `userLocation` varchar(255) DEFAULT NULL,
  `userAccess` longtext NOT NULL COMMENT '{"1":"all"}',
  `userStatus` varchar(255) DEFAULT NULL,
  `userLocale` varchar(255) DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `admin` tinyint(4) NOT NULL DEFAULT 0 COMMENT '1 = admin',
  `userEmailValidated` tinyint(4) NOT NULL DEFAULT 0 COMMENT '1 = validated default = 0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;


--
-- Table structure for table `tbluser_stats`
--

CREATE TABLE `tbluser_stats` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subject_id` int(11) NOT NULL,
  `topic_id` int(11) DEFAULT NULL,
  `total_questions_attempted` int(11) DEFAULT 0,
  `total_questions_completed` int(11) DEFAULT 0,
  `average_grade` decimal(3,2) DEFAULT NULL,
  `total_time_spent` int(11) DEFAULT 0,
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tblquestion`
--
ALTER TABLE `tblquestion`
  ADD PRIMARY KEY (`id`) USING BTREE,
  ADD KEY `idx_question_order` (`topicid`,`question_order`) USING BTREE;

--
-- Indexes for table `tblresponse`
--
ALTER TABLE `tblresponse`
  ADD PRIMARY KEY (`id`) USING BTREE,
  ADD UNIQUE KEY `unique_user_question_attempt` (`user_id`,`question_id`,`attempt_number`) USING BTREE,
  ADD KEY `idx_user_responses` (`user_id`,`response_timestamp`) USING BTREE,
  ADD KEY `idx_question_responses` (`question_id`) USING BTREE,
  ADD KEY `idx_subject_topic` (`subject_id`,`topic_id`) USING BTREE,
  ADD KEY `idx_session` (`session_id`) USING BTREE,
  ADD KEY `idx_completion_status` (`completion_status`) USING BTREE,
  ADD KEY `fk_response_topic` (`topic_id`,`subject_id`) USING BTREE;

--
-- Indexes for table `tblsubject`
--
ALTER TABLE `tblsubject`
  ADD PRIMARY KEY (`id`) USING BTREE;

--
-- Indexes for table `tbltopic`
--
ALTER TABLE `tbltopic`
  ADD PRIMARY KEY (`id`,`subjectid`) USING BTREE;

--
-- Indexes for table `tbluser`
--
ALTER TABLE `tbluser`
  ADD PRIMARY KEY (`id`) USING BTREE;

--
-- Indexes for table `tbluser_stats`
--
ALTER TABLE `tbluser_stats`
  ADD PRIMARY KEY (`id`) USING BTREE,
  ADD UNIQUE KEY `unique_user_subject_topic` (`user_id`,`subject_id`,`topic_id`) USING BTREE,
  ADD KEY `fk_stats_subject` (`subject_id`) USING BTREE,
  ADD KEY `fk_stats_topic` (`topic_id`,`subject_id`) USING BTREE;

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tblquestion`
--
ALTER TABLE `tblquestion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1146;

--
-- AUTO_INCREMENT for table `tblresponse`
--
ALTER TABLE `tblresponse`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1726;

--
-- AUTO_INCREMENT for table `tblsubject`
--
ALTER TABLE `tblsubject`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `tbltopic`
--
ALTER TABLE `tbltopic`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `tbluser`
--
ALTER TABLE `tbluser`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=170;

--
-- AUTO_INCREMENT for table `tbluser_stats`
--
ALTER TABLE `tbluser_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3450;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tblresponse`
--
ALTER TABLE `tblresponse`
  ADD CONSTRAINT `fk_response_question` FOREIGN KEY (`question_id`) REFERENCES `tblquestion` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_response_subject` FOREIGN KEY (`subject_id`) REFERENCES `tblsubject` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_response_topic` FOREIGN KEY (`topic_id`,`subject_id`) REFERENCES `tbltopic` (`id`, `subjectid`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_response_user` FOREIGN KEY (`user_id`) REFERENCES `tbluser` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tbluser_stats`
--
ALTER TABLE `tbluser_stats`
  ADD CONSTRAINT `fk_stats_subject` FOREIGN KEY (`subject_id`) REFERENCES `tblsubject` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_stats_topic` FOREIGN KEY (`topic_id`,`subject_id`) REFERENCES `tbltopic` (`id`, `subjectid`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_stats_user` FOREIGN KEY (`user_id`) REFERENCES `tbluser` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
