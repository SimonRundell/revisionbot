
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u2440325118_aibot`
--
-- Schema version: 0.5.0 (June 2026) - multi-school / multi-tenant
--

-- --------------------------------------------------------

--
-- Table structure for table `tblschool`
--

CREATE TABLE `tblschool` (
  `id` int(11) NOT NULL,
  `school_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tbldepartment`
--
-- Each department supplies its own Gemini API key, stored encrypted at rest.
--

CREATE TABLE `tbldepartment` (
  `id` int(11) NOT NULL,
  `school_id` int(11) NOT NULL,
  `department_name` varchar(255) NOT NULL,
  `gemini_key_cipher` longtext DEFAULT NULL COMMENT 'base64 sodium ciphertext of the department Gemini API key',
  `gemini_key_nonce` varchar(64) DEFAULT NULL COMMENT 'base64 sodium nonce for gemini_key_cipher',
  `gemini_key_last4` varchar(8) DEFAULT NULL COMMENT 'last 4 chars of plaintext key, for admin display only',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tblpasswordreset`
--

CREATE TABLE `tblpasswordreset` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `token` varchar(128) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

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
  `question_order` int(11) DEFAULT 0,
  `owner_department_id` int(11) DEFAULT NULL COMMENT 'Owning department; NULL = super-owned. Reads ignore this; only edits/deletes check it (add-only shared tree).'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Table structure for table `tblresponse`
--

CREATE TABLE `tblresponse` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL COMMENT 'Denormalised from owning user for tenant filtering',
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
  `estimated_grade` varchar(10) DEFAULT NULL COMMENT 'AI-suggested RAG rating (R/A/G), extracted from ai_feedback HTML on assessment. Used in analytics when teacher_rating is absent.',
  `completion_status` enum('started','submitted','assessed') DEFAULT 'started',
  `session_id` varchar(100) DEFAULT NULL,
  `attempt_number` int(11) DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `teacher_comment` text DEFAULT NULL,
  `teacher_rating` enum('R','A','G') DEFAULT NULL COMMENT 'R=Red, A=Amber, G=Green',
  `teacher_feedback_timestamp` timestamp NULL DEFAULT NULL,
  `teacher_id` int(11) DEFAULT NULL COMMENT 'ID of teacher who provided feedback'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Table structure for table `tblsubject`
--

CREATE TABLE `tblsubject` (
  `id` int(11) NOT NULL,
  `subject` varchar(255) NOT NULL,
  `owner_department_id` int(11) DEFAULT NULL COMMENT 'Owning department; NULL = super-owned. Reads ignore this; only edits/deletes check it.'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Table structure for table `tbltopic`
--

CREATE TABLE `tbltopic` (
  `id` int(11) NOT NULL,
  `subjectid` int(11) NOT NULL,
  `topic` varchar(255) DEFAULT NULL,
  `owner_department_id` int(11) DEFAULT NULL COMMENT 'Owning department; NULL = super-owned. Reads ignore this; only edits/deletes check it.'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Table structure for table `tbluser`
--

CREATE TABLE `tbluser` (
  `id` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `userName` varchar(255) DEFAULT NULL,
  `userClass` varchar(255) DEFAULT NULL,
  `department_id` int(11) DEFAULT NULL COMMENT 'Department the user belongs to; NULL only for super-admin',
  `userAccess` longtext NOT NULL COMMENT '{"1":"all"}',
  `userStatus` varchar(255) DEFAULT NULL,
  `userLocale` varchar(255) DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `admin` tinyint(4) NOT NULL DEFAULT 0 COMMENT '1 = department admin',
  `is_super_admin` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = overall admin over all schools/departments',
  `userEmailValidated` tinyint(4) NOT NULL DEFAULT 0 COMMENT '1 = validated, 0 = default',
  `is_active` tinyint(1) NOT NULL DEFAULT 1 COMMENT '0 = deactivated, 1 = active',
  `force_pw_change` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = user must change password on next login',
  `last_pw_change` datetime DEFAULT NULL COMMENT 'Timestamp of last successful password change'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- --------------------------------------------------------

--
-- Table structure for table `tbluser_stats`
--

CREATE TABLE `tbluser_stats` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `department_id` int(11) DEFAULT NULL COMMENT 'Denormalised from owning user for tenant filtering',
  `subject_id` int(11) NOT NULL,
  `topic_id` int(11) DEFAULT NULL,
  `total_questions_attempted` int(11) DEFAULT 0,
  `total_questions_completed` int(11) DEFAULT 0,
  `average_grade` decimal(3,2) DEFAULT NULL,
  `total_time_spent` int(11) DEFAULT 0,
  `last_activity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tblpasswordreset`
--
ALTER TABLE `tblpasswordreset`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_token` (`token`),
  ADD KEY `idx_user_id` (`user_id`);

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

ALTER TABLE `tblpasswordreset`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tblquestion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tblresponse`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tblsubject`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbltopic`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbluser`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbluser_stats`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `tblpasswordreset`
--
ALTER TABLE `tblpasswordreset`
  ADD CONSTRAINT `fk_pwr_user` FOREIGN KEY (`user_id`) REFERENCES `tbluser` (`id`) ON DELETE CASCADE;

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

--
-- Multi-school: keys, AUTO_INCREMENT and constraints for the new tables/columns
--

ALTER TABLE `tblschool`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_school_name` (`school_name`);

ALTER TABLE `tbldepartment`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_dept_per_school` (`school_id`,`department_name`),
  ADD KEY `idx_dept_school` (`school_id`);

ALTER TABLE `tblschool`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbldepartment`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `tbldepartment`
  ADD CONSTRAINT `fk_dept_school` FOREIGN KEY (`school_id`) REFERENCES `tblschool` (`id`) ON DELETE CASCADE;

ALTER TABLE `tbluser`
  ADD KEY `idx_user_department` (`department_id`),
  ADD CONSTRAINT `fk_user_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tblsubject`
  ADD KEY `idx_subject_owner` (`owner_department_id`),
  ADD CONSTRAINT `fk_subject_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tbltopic`
  ADD KEY `idx_topic_owner` (`owner_department_id`),
  ADD CONSTRAINT `fk_topic_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tblquestion`
  ADD KEY `idx_question_owner` (`owner_department_id`),
  ADD CONSTRAINT `fk_question_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tblresponse`
  ADD KEY `idx_response_department` (`department_id`),
  ADD CONSTRAINT `fk_response_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tbluser_stats`
  ADD KEY `idx_stats_department` (`department_id`),
  ADD CONSTRAINT `fk_stats_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
