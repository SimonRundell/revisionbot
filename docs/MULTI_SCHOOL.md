# Multi-School Architecture and Migration Guide

Schema version 0.5.0 turns revisionBot from a single-tenant app into a
multi-school, multi-tenant platform. This document explains the model and gives
the exact steps to migrate an existing 0.4.x database.

## The model

```
School  (e.g. "Exeter College")
  └── Department  (e.g. "Computing")        <-- supplies its own Gemini API key
        ├── Department admin(s)              admin = 1
        └── Students                          admin = 0
```

- A **super-admin** (user id 1, `is_super_admin = 1`) sits above everything.
  They onboard schools, create departments, and create each department's first
  admin account. They do not manage department API keys and cannot see them.
- A **department admin** manages only their own department: its users, classes,
  responses, analytics, and its own Gemini API key.
- **Students** belong to exactly one department.
- Departments are insulated from one another. A department admin never sees
  another department's users, responses, statistics, or classes.

### The shared subject/topic/question tree (add-only)

The subject, topic, and question tree is a **collective resource**: every
department can read and use all of it. Editing is "add-only":

- Any department admin can create new subjects, topics, and questions.
- Each node records an `owner_department_id`.
- A department admin can edit or delete only the nodes their own department
  owns. The super-admin can edit anything. Content with a NULL owner is treated
  as super-owned.
- Cascade deletes (deleting a subject or topic) are refused for a department
  admin if any descendant belongs to another department.

The backend enforces all of this (HTTP 403); the Quiz Builder UI also shows a
lock icon and disables the controls for content owned by another department.

### Per-department Gemini API keys

AI assessment runs against, and is billed to, each department's own Gemini key.

- Keys are stored **encrypted at rest** in `tbldepartment.gemini_key_cipher`
  using libsodium secretbox (with an OpenSSL AES-256-GCM fallback). See
  `api/crypto.php`.
- Encryption uses a master key in `api/.config.json` under `dataEncryptionKey`
  (a base64-encoded 32-byte value). **Back this up separately from the
  database. If it is lost, every stored key must be re-entered.**
- The key is write-only from the UI. Only `hasGeminiKey` and the last four
  characters are ever returned.
- A department with no key configured cannot run AI assessment (the endpoint
  returns a clear 503) until its admin adds one. There is no global fallback.

## Configuration changes

Add to `api/.config.json` (server side, never shipped to the browser):

```json
"dataEncryptionKey": "base64-encoded-32-byte-key"
```

Generate one with:

```bash
php -r "echo base64_encode(random_bytes(32)), PHP_EOL;"
```

The legacy global `geminiApiKey` is no longer used by the app for assessment
once departments have their own keys, but keep it in place until after the
migration so the seeding step below can encrypt it into the first department.

## Migration runbook (0.4.x -> 0.5.0)

The migration script `data/migrations/0.5.0_multi_school.sql` is **idempotent**
and runs on both MariaDB 10.4+ (Hostinger production) and MySQL 8.4 (local
dev). Every column, index, and foreign key is guarded with an
`information_schema` check, so re-running it is safe.

**1. Back up the database first.** Export a full dump (phpMyAdmin or
`mysqldump`).

**2. Add `dataEncryptionKey`** to `api/.config.json` (see above) and back it up.

**3. Apply the migration.**

- phpMyAdmin: open the database, Import tab, choose
  `data/migrations/0.5.0_multi_school.sql`, Go.
- Command line:
  ```bash
  mysql -u <user> -p <database> < data/migrations/0.5.0_multi_school.sql
  ```

This creates `tblschool` and `tbldepartment`, adds the tenant columns, seeds a
school named "Exeter College" with a department named "General", assigns every
existing non-super user and all existing content to that department, marks user
id 1 as the super-admin, and backfills responses, statistics, and classes.

**4. Encrypt the existing Gemini key into the seeded department** so AI keeps
working immediately:

```bash
php api/tools/seedDepartmentKey.php
```

**5. Verify** (optional but recommended):

```sql
-- One school, one department:
SELECT s.school_name, d.department_name FROM tbldepartment d
  JOIN tblschool s ON s.id = d.school_id;

-- Exactly one super-admin, and it is user 1:
SELECT id, is_super_admin FROM tbluser WHERE is_super_admin = 1;

-- No orphaned content (all owners populated):
SELECT
  (SELECT COUNT(*) FROM tblsubject  WHERE owner_department_id IS NULL) AS s_null,
  (SELECT COUNT(*) FROM tbltopic    WHERE owner_department_id IS NULL) AS t_null,
  (SELECT COUNT(*) FROM tblquestion WHERE owner_department_id IS NULL) AS q_null;

-- The General department has a key configured:
SELECT department_name, gemini_key_cipher IS NOT NULL AS has_key, gemini_key_last4
  FROM tbldepartment;
```

**6. Rename or split** the "General" department afterwards as needed, and create
additional schools/departments from the super-admin "Schools" console.

### Dry-run result

This migration was dry-run against a clone of the production data (144 users,
3 subjects, 24 topics, 1486 questions, 825 responses, 2193 stats, 9 classes) on
MySQL 8.4:

- Row counts unchanged (no data loss).
- School + department seeded; user 1 the sole super-admin with a NULL
  department; all other users assigned to General.
- All content owners, response/stat/class department ids backfilled with zero
  NULLs and zero mismatches.
- All six foreign keys created.
- Re-running the migration was a clean no-op (idempotent), and the seeded
  Gemini key was preserved.

## Onboarding a new school (super-admin)

1. Log in as the super-admin and open **Schools**.
2. Add the school, then add one or more departments under it.
3. For each department, click **Add Admin** and create the department's admin
   account (name, email, password). The new admin receives a welcome email.
4. The department admin logs in, opens **Department**, and adds their own Gemini
   API key. AI assessment for that department is then live.

Account creation is admin-only throughout. Self-registration is disabled
because AI assessment incurs per-use cost, so schools administer their own
accounts.

## New API endpoints (0.5.0)

| Endpoint | Who | Purpose |
| --- | --- | --- |
| `getSchools.php` | super | List schools |
| `createSchool.php` / `updateSchool.php` / `deleteSchool.php` | super | Manage schools |
| `getDepartments.php` | super (all) / dept admin (own) | List departments (no key returned) |
| `createDepartment.php` / `updateDepartment.php` / `deleteDepartment.php` | super | Manage departments |
| `setDepartmentGeminiKey.php` | dept admin (own only) | Store the department's encrypted key |

All existing data endpoints are now scoped to the caller's department, with the
super-admin seeing across all departments.
