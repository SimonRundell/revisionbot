-- ===========================================================================
-- revisionBot schema migration 0.4.9 -> 0.5.0
-- Multi-school / multi-tenant: School -> Department -> users
--
-- Portable + idempotent on BOTH MySQL 8.4 and MariaDB 10.4+.
-- Instead of MariaDB-only "ADD COLUMN IF NOT EXISTS", every column / index /
-- foreign key is guarded with an information_schema check and applied via a
-- prepared statement. This needs no DELIMITER and no stored procedures, so it
-- runs identically through the mysql CLI, phpMyAdmin, or a mysqli script, and
-- is safe to re-run.
--
-- NOTE: DDL auto-commits on both engines, so there is no surrounding
-- transaction. Re-running is safe because of the guards.
--
-- AFTER this script, run `php api/tools/seedDepartmentKey.php` to encrypt the
-- existing global Gemini key into the seeded department (AI keeps working).
--
-- @version 0.5.0
-- @date 2026-06-19
-- ===========================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ---------------------------------------------------------------------------
-- 1. New top-level tables (CREATE TABLE IF NOT EXISTS is portable)
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
-- 2. Tenant columns (guarded so re-running is a no-op)
-- ---------------------------------------------------------------------------

-- tbluser.department_id
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbluser' AND COLUMN_NAME = 'department_id');
SET @s := IF(@c = 0, "ALTER TABLE `tbluser` ADD COLUMN `department_id` int(11) DEFAULT NULL COMMENT 'NULL only for super-admin'", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- tbluser.is_super_admin
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbluser' AND COLUMN_NAME = 'is_super_admin');
SET @s := IF(@c = 0, "ALTER TABLE `tbluser` ADD COLUMN `is_super_admin` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = overall admin over all schools'", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- tblsubject.owner_department_id
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblsubject' AND COLUMN_NAME = 'owner_department_id');
SET @s := IF(@c = 0, "ALTER TABLE `tblsubject` ADD COLUMN `owner_department_id` int(11) DEFAULT NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- tbltopic.owner_department_id
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbltopic' AND COLUMN_NAME = 'owner_department_id');
SET @s := IF(@c = 0, "ALTER TABLE `tbltopic` ADD COLUMN `owner_department_id` int(11) DEFAULT NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- tblquestion.owner_department_id
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblquestion' AND COLUMN_NAME = 'owner_department_id');
SET @s := IF(@c = 0, "ALTER TABLE `tblquestion` ADD COLUMN `owner_department_id` int(11) DEFAULT NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- tblresponse.department_id
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblresponse' AND COLUMN_NAME = 'department_id');
SET @s := IF(@c = 0, "ALTER TABLE `tblresponse` ADD COLUMN `department_id` int(11) DEFAULT NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- tbluser_stats.department_id
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbluser_stats' AND COLUMN_NAME = 'department_id');
SET @s := IF(@c = 0, "ALTER TABLE `tbluser_stats` ADD COLUMN `department_id` int(11) DEFAULT NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- tblClass.department_id (tblClass may not exist on a fresh install)
SET @t := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblClass');
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblClass' AND COLUMN_NAME = 'department_id');
SET @s := IF(@t = 1 AND @c = 0, "ALTER TABLE `tblClass` ADD COLUMN `department_id` int(11) DEFAULT NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------------
-- 3. Indexes (guarded)
-- ---------------------------------------------------------------------------

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbluser' AND INDEX_NAME = 'idx_user_department');
SET @s := IF(@c = 0, "ALTER TABLE `tbluser` ADD KEY `idx_user_department` (`department_id`)", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblsubject' AND INDEX_NAME = 'idx_subject_owner');
SET @s := IF(@c = 0, "ALTER TABLE `tblsubject` ADD KEY `idx_subject_owner` (`owner_department_id`)", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbltopic' AND INDEX_NAME = 'idx_topic_owner');
SET @s := IF(@c = 0, "ALTER TABLE `tbltopic` ADD KEY `idx_topic_owner` (`owner_department_id`)", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblquestion' AND INDEX_NAME = 'idx_question_owner');
SET @s := IF(@c = 0, "ALTER TABLE `tblquestion` ADD KEY `idx_question_owner` (`owner_department_id`)", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblresponse' AND INDEX_NAME = 'idx_response_department');
SET @s := IF(@c = 0, "ALTER TABLE `tblresponse` ADD KEY `idx_response_department` (`department_id`)", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbluser_stats' AND INDEX_NAME = 'idx_stats_department');
SET @s := IF(@c = 0, "ALTER TABLE `tbluser_stats` ADD KEY `idx_stats_department` (`department_id`)", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @t := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblClass');
SET @c := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblClass' AND INDEX_NAME = 'idx_class_department');
SET @s := IF(@t = 1 AND @c = 0, "ALTER TABLE `tblClass` ADD KEY `idx_class_department` (`department_id`)", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------------
-- 4. Seed: Exeter College -> General, and assign existing data
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

-- tblClass backfill (guarded; table may be absent on a fresh install).
SET @t := (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblClass');
SET @s := IF(@t = 1, CONCAT('UPDATE `tblClass` SET `department_id` = ', @general_dept, ' WHERE `department_id` IS NULL'), 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- ---------------------------------------------------------------------------
-- 5. Foreign keys (guarded)
-- ---------------------------------------------------------------------------

SET @c := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbluser' AND CONSTRAINT_NAME = 'fk_user_department' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @s := IF(@c = 0, "ALTER TABLE `tbluser` ADD CONSTRAINT `fk_user_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblsubject' AND CONSTRAINT_NAME = 'fk_subject_owner' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @s := IF(@c = 0, "ALTER TABLE `tblsubject` ADD CONSTRAINT `fk_subject_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbltopic' AND CONSTRAINT_NAME = 'fk_topic_owner' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @s := IF(@c = 0, "ALTER TABLE `tbltopic` ADD CONSTRAINT `fk_topic_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblquestion' AND CONSTRAINT_NAME = 'fk_question_owner' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @s := IF(@c = 0, "ALTER TABLE `tblquestion` ADD CONSTRAINT `fk_question_owner` FOREIGN KEY (`owner_department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tblresponse' AND CONSTRAINT_NAME = 'fk_response_department' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @s := IF(@c = 0, "ALTER TABLE `tblresponse` ADD CONSTRAINT `fk_response_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

SET @c := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tbluser_stats' AND CONSTRAINT_NAME = 'fk_stats_department' AND CONSTRAINT_TYPE = 'FOREIGN KEY');
SET @s := IF(@c = 0, "ALTER TABLE `tbluser_stats` ADD CONSTRAINT `fk_stats_department` FOREIGN KEY (`department_id`) REFERENCES `tbldepartment` (`id`) ON DELETE SET NULL", 'DO 0');
PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

-- NEXT STEP: run `php api/tools/seedDepartmentKey.php` to encrypt the existing
-- global Gemini key into the General department so AI assessment keeps working.
