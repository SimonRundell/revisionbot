/*
 Navicat Premium Data Transfer

 Source Server         : LOCALHOST
 Source Server Type    : MySQL
 Source Server Version : 80403 (8.4.3)
 Source Host           : localhost:3306
 Source Schema         : newaibot

 Target Server Type    : MySQL
 Target Server Version : 80403 (8.4.3)
 File Encoding         : 65001

 Date: 17/11/2025 20:46:03
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for tblquestion
-- ----------------------------
DROP TABLE IF EXISTS `tblquestion`;
CREATE TABLE `tblquestion`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `topicid` int NULL DEFAULT NULL,
  `question` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `markscheme` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT 'Answer, from which the AI should work',
  `attachments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT 'json list of base64 encoded files (images, etc) for attachment to the question',
  `question_order` int NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_question_order`(`topicid` ASC, `question_order` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 35 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for tblresponse
-- ----------------------------
DROP TABLE IF EXISTS `tblresponse`;
CREATE TABLE `tblresponse`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `question_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `topic_id` int NOT NULL,
  `student_answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `student_graphic` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL COMMENT 'base64 encoded graphic uploaded by student',
  `response_timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `time_taken` int NULL DEFAULT NULL,
  `ai_feedback` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `ai_processed` tinyint(1) NULL DEFAULT 0,
  `ai_timestamp` timestamp NULL DEFAULT NULL,
  `ai_error` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `estimated_grade` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `completion_status` enum('started','submitted','assessed') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT 'started',
  `session_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `attempt_number` int NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `teacher_comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
  `teacher_rating` enum('R','A','G') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'R=Red, A=Amber, G=Green',
  `teacher_feedback_timestamp` timestamp NULL DEFAULT NULL,
  `teacher_id` int NULL DEFAULT NULL COMMENT 'ID of teacher who provided feedback',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_user_question_attempt`(`user_id` ASC, `question_id` ASC, `attempt_number` ASC) USING BTREE,
  INDEX `idx_user_responses`(`user_id` ASC, `response_timestamp` ASC) USING BTREE,
  INDEX `idx_question_responses`(`question_id` ASC) USING BTREE,
  INDEX `idx_subject_topic`(`subject_id` ASC, `topic_id` ASC) USING BTREE,
  INDEX `idx_session`(`session_id` ASC) USING BTREE,
  INDEX `idx_completion_status`(`completion_status` ASC) USING BTREE,
  INDEX `fk_response_topic`(`topic_id` ASC, `subject_id` ASC) USING BTREE,
  CONSTRAINT `fk_response_question` FOREIGN KEY (`question_id`) REFERENCES `tblquestion` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_response_subject` FOREIGN KEY (`subject_id`) REFERENCES `tblsubject` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_response_topic` FOREIGN KEY (`topic_id`, `subject_id`) REFERENCES `tbltopic` (`id`, `subjectid`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_response_user` FOREIGN KEY (`user_id`) REFERENCES `tbluser` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for tblsubject
-- ----------------------------
DROP TABLE IF EXISTS `tblsubject`;
CREATE TABLE `tblsubject`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for tbltopic
-- ----------------------------
DROP TABLE IF EXISTS `tbltopic`;
CREATE TABLE `tbltopic`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `subjectid` int NOT NULL,
  `topic` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  PRIMARY KEY (`id`, `subjectid`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 11 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for tbluser
-- ----------------------------
DROP TABLE IF EXISTS `tbluser`;
CREATE TABLE `tbluser`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `passwordHash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `userName` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `userLocation` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `userStatus` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `userLocale` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `userAccess` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `avatar` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `admin` tinyint NOT NULL DEFAULT 0 COMMENT '1 = admin',
  `userEmailValidated` tinyint NOT NULL DEFAULT 0 COMMENT '1 = validated default = 0',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 124 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Table structure for tbluser_stats
-- ----------------------------
DROP TABLE IF EXISTS `tbluser_stats`;
CREATE TABLE `tbluser_stats`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `topic_id` int NULL DEFAULT NULL,
  `total_questions_attempted` int NULL DEFAULT 0,
  `total_questions_completed` int NULL DEFAULT 0,
  `average_grade` decimal(3, 2) NULL DEFAULT NULL,
  `total_time_spent` int NULL DEFAULT 0,
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `unique_user_subject_topic`(`user_id` ASC, `subject_id` ASC, `topic_id` ASC) USING BTREE,
  INDEX `fk_stats_subject`(`subject_id` ASC) USING BTREE,
  INDEX `fk_stats_topic`(`topic_id` ASC, `subject_id` ASC) USING BTREE,
  CONSTRAINT `fk_stats_subject` FOREIGN KEY (`subject_id`) REFERENCES `tblsubject` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_stats_topic` FOREIGN KEY (`topic_id`, `subject_id`) REFERENCES `tbltopic` (`id`, `subjectid`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `fk_stats_user` FOREIGN KEY (`user_id`) REFERENCES `tbluser` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 41 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci ROW_FORMAT = DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
