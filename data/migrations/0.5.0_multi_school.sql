-- ===========================================================================
-- revisionBot schema migration 0.4.9 -> 0.5.0
-- Multi-school / multi-tenant: School -> Department -> users
--
-- Target: MariaDB 10.4+ (Hostinger). Uses "IF NOT EXISTS" on columns/indexes
-- so the script is safe to re-run. Foreign keys are added once; re-running on a
-- DB that already has them will warn (harmless) -- comment the FK block out on
-- a second run if needed.
--
-- IMPORTANT: this script seeds schema + tenant assignment ONLY. It does NOT
-- populate tbldepartment.gemini_key_cipher, because the key must be encrypted
-- with sodium (see api/tools/seedDepartmentKey.php). Run that PHP one-shot
-- AFTER this migration so AI assessment keeps working for the seeded department.
--
-- @version 0.5.0
-- @date 2026-06-19
-- ===========================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1. New top-level tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tblschool` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_school_name` (`school_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `tbldepartment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `school_id` int(11) NOT NULL,
  `department_name` varchar(255) NOT NULL,
  -- Gemini key stored encrypted at rest (sodium secretbox). Never returned to clients.
  `gemini_key_cipher` longtext DEFAULT NULL COMMENT 'base64 sodium ciphertext of the department Gemini API key',
  `gemini_key_nonce` varchar(64) DEFAULT NULL COMMENT 'base64 sodium nonce for gemini_key_cipher',
  `gemini_key_last4` varchar(8) DEFAULT NULL COMMENT 'last 4 chars of plaintext key, for admin display only',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dept_per_school` (`school_id`,`department_name`),
  KEY `idx_dept_school` (`school_id`),
  CONSTRAINT `fk_dept_school` FOREIGN KEY (`school_id`) REFERENCES `tblschool` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- 2. Tenant columns on existing tables
-- ---------------------------------------------------------------------------

-- Users: belong to a department; super-admin is department-less.
ALTER TABLE `tbluser`
  ADD COLUMN IF NOT EXISTS `department_id` int(11) DEFAULT NULL COMMENT 'NULL only for super-admin' AFTER `userClass`,
  ADD COLUMN IF NOT EXISTS `is_super_admin` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = overall admin over all schools' AFTER `admin`,
  ADD KEY IF NOT EXISTS `idx_user_department` (`department_id`);

-- Shared tree: ownership drives the add-only edit rule. NULL = legacy/super-owned.
-- Reads ignore this column (the tree is a collective resource); only writes check it.
ALTER TABLE `tblsubject`
  ADD COLUMN IF NOT EXISTS `owner_department_id` int(11) DEFAULT NULL AFTER `subject`,
  ADD KEY IF NOT EXISTS `idx_subject_owner` (`owner_department_id`);

ALTER TABLE `tbltopic`
  ADD COLUMN IF NOT EXISTS `owner_department_id` int(11) DEFAULT NULL AFTER `topic`,
  ADD KEY IF NOT EXISTS `idx_topic_owner` (`owner_department_id`);

ALTER TABLE `tblquestion`
  ADD COLUMN IF NOT EXISTS `owner_department_id` int(11) DEFAULT NULL AFTER `question_order`,
  ADD KEY IF NOT EXISTS `idx_question_owner` (`owner_department_id`);

-- Per-department, denormalised for leak-proof, indexed tenant filtering.
ALTER TABLE `tblresponse`
  ADD COLUMN IF NOT EXISTS `department_id` int(11) DEFAULT NULL AFTER `user_id`,
  ADD KEY IF NOT EXISTS `idx_response_department` (`department_id`);

ALTER TABLE `tbluser_stats`
  ADD COLUMN IF NOT EXISTS `department_id` int(11) DEFAULT NULL AFTER `user_id`,
  ADD KEY IF NOT EXISTS `idx_stats_department` (`department_id`);

-- Classes are per-department. (tblClass is created by api/createClass.php on
-- first use and is not in database_template.sql; guard in case it exists.)
ALTER TABLE `tblClass`
  ADD COLUMN IF NOT EXISTS `department_id` int(11) DEFAULT NULL,
  ADD KEY IF NOT EXISTS `idx_class_department` (`department_id`);

-- ---------------------------------------------------------------------------
-- 3. Seed: Exeter College -> General, and assign existing data
-- ---------------------------------------------------------------------------

INSERT INTO `tblschool` (`school_name`)
SELECT 'Exeter College'
WHERE NOT EXISTS (SELECT 1 FROM `tblschool` WHERE `school_name` = 'Exeter College');

INSERT INTO `tbldepartment` (`school_id`, `department_name`)
SELECT s.id, 'General'
FROM `tblschool` s
WHERE s.school_name = 'Exeter College'
  AND NOT EXISTS (
    SELECT 1 FROM `tbldepartment` d
    WHERE d.school_id = s.id AND d.department_name = 'General'
  );

-- Capture the seeded department id for the assignments below.
SET @general_dept := (
  SELECT d.id FROM `tbldepartment` d
  JOIN `tblschool` s ON s.id = d.school_id
  WHERE s.school_name = 'Exeter College' AND d.department_name = 'General'
  LIMIT 1
);

-- Super-admin = user ID 1; everyone else lands in General.
UPDATE `tbluser` SET `is_super_admin` = 1 WHERE `id` = 1;
UPDATE `tbluser`
  SET `department_id` = @general_dept
  WHERE `id` <> 1 AND `department_id` IS NULL;

-- Existing content authored by Exeter -> owned by General so they keep edit rights.
UPDATE `tblsubject`  SET `owner_department_id` = @general_dept WHERE `owner_department_id` IS NULL;
UPDATE `tbltopic`    SET `owner_department_id` = @general_dept WHERE `owner_department_id` IS NULL;
UPDATE `tblquestion` SET `owner_department_id` = @general_dept WHERE `owner_department_id` IS NULL;

-- Backfill denormalised department on existing rows from the owning user.
UPDATE `tblresponse` r
  JOIN `tbluser` u ON u.id = r.user_id
  SET r.department_id = u.department_id
  WHERE r.department_id IS NULL;

UPDATE `tbluser_stats` st
  JOIN `tbluser` u ON u.id = st.user_id
  SET st.department_id = u.department_id
  WHERE st.department_id IS NULL;

UPDATE `tblClass` SET `department_id` = @general_dept WHERE `department_id` IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Foreign keys (run once; comment out on re-run if they already exist)
-- ---------------------------------------------------------------------------

ALTER TABLE `tbluser`
  ADD CONSTRAINT `fk_user_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tblsubject`
  ADD CONSTRAINT `fk_subject_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tbltopic`
  ADD CONSTRAINT `fk_topic_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tblquestion`
  ADD CONSTRAINT `fk_question_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tblresponse`
  ADD CONSTRAINT `fk_response_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

ALTER TABLE `tbluser_stats`
  ADD CONSTRAINT `fk_stats_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL;

COMMIT;

-- NEXT STEP: run `php api/tools/seedDepartmentKey.php` to encrypt the existing
-- global Gemini key into the General department so AI assessment keeps working.
