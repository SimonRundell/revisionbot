# AIRevision Bot Educational Assessment System
by Simon Rundell for CodeMonkey.design

**Version 0.4.4** — May 2026

A comprehensive web-based educational revision platform featuring AI-powered feedback, student practice interfaces, teacher review dashboards, advanced analytics, and a student reward/badge system.

## Features

- **Student Interface**: Interactive question answering with AI feedback and randomized question selection; previously answered questions visually marked with a green ✓ badge while remaining retryable
- **Rich Text Editing**: Questions, mark schemes, student answers, and teacher feedback support bold, italic, underline, ordered/unordered lists, code, blockquotes, undo, redo, and Tab-key indentation
- **AI Assessment**: Integration with Google's Gemini 2.5 Flash for intelligent immediate feedback
- **Multimodal Student Responses**: Students can upload graphics (PNG/JPG/GIF/BMP) as part of their answers
- **Past Answers Review**: Students can review their previous responses, graphics, and feedback
- **Admin Dashboard**: Teachers can review all student responses including uploaded graphics and add ratings/comments; auto-refreshes every 30 or 60 seconds with a manual Refresh Now button
- **RAG Rating System**: Teachers can rate responses with Red/Amber/Green
- **Student Reward System**: Badge achievements earned from RAG-rated performance across four tracks (Green %, Amber/Green %, No-Red streak, Green streak); displayed in the nav bar and on a dedicated My Progress page
- **User Management**: Registration, login, role-based access control, admin-only account-state management, and class assignment; students cannot edit their own name/email/class (admin only)
- **Session Persistence**: Login sessions survive page refreshes and tab restores for up to 2 hours via `localStorage`; a countdown banner appears in the final 5 minutes
- **Password Recovery**: Self-service password reset with one-time tokens, expiry enforcement, reset email templates, and bcrypt password storage
- **Forced Password Change**: Admins can require a password reset on the next login and the app blocks access until the user sets a new password
- **Account Deactivation**: Admins can deactivate accounts without deleting student data; inactive accounts are blocked at login
- **Account Reactivation**: Admins can restore inactive accounts from the same management interface
- **Class Management**: Admins can maintain a central `tblClass` list for manual class allocation, with safe delete checks and confirmation prompts
- **Bulk Student Upload**: Import multiple student accounts from CSV files with automatic email notifications
- **Email Notifications**: Automated welcome emails and password change notifications with professional templates
- **Advanced Analytics**: Time-based progress tracking, improvement analysis, comprehensive student statistics, and per-student badge display
- **Security**: Protected API endpoints with role-based access control and directory browsing prevention

## Setup Instructions

### Backend Configuration

1. Copy the example configuration file:
   ```bash
   cp api/.config.example.json api/.config.json
   ```

2. Edit `api/.config.json` with your actual values:
   - Database credentials (MySQL)
   - SMTP server details for email functionality
   - Google Gemini API key
   - API base URL

3. Set up your MySQL database using the SQL template in `data/database_template.sql`

4. Install PHP dependencies:
   ```bash
   cd api
   composer install
   ```

5. Create `api/.htaccess` to prevent Apache from applying any inherited authentication to the API directory:
   ```apache
   # RevisionBot API
   # Explicitly disable any inherited auth config for this directory.

   AuthType None

   <IfModule mod_authz_core.c>
       Require all granted
   </IfModule>

   <IfModule mod_authz_host.c>
       Order allow,deny
       Allow from all
   </IfModule>
   ```
   > **Note:** Without this file, Apache may inherit Basic Auth from a parent directory config, causing all API endpoints to return `401 Unauthorized`. This file is not committed to the repository because it can vary per environment.

### Frontend Configuration

1. Copy the example configuration file:
   ```bash
   cp src/.config.example.json src/.config.json
   ```

2. Edit `src/.config.json` with your API base URL

3. Install Node.js dependencies:
   ```bash
   npm install
   ```

  This installs the Tiptap editor packages used for rich text editing in the admin question editor, student answer modal, and teacher feedback form.

4. Start the development server:
   ```bash
   npm run dev
   ```

### Rich Text Notes

- Rich text content is stored as HTML and rendered in question review, student marking, and past-answer screens.
- Existing plain-text content still displays correctly; new formatting is available when content is edited through the UI.
- The supported formatting toolbar includes normal paragraph text, bold, italic, underline, ordered list, unordered list, inline code, blockquote, undo, and redo.

### API Endpoints

- `getLogin.php` - User authentication with signed bearer tokens and legacy-hash upgrade
- `register.php` - User registration
- `requestPasswordReset.php` - Start a password reset flow
- `validateResetToken.php` - Validate a password reset token
- `resetPassword.php` - Complete a password reset
- `forcePasswordChange.php` - Admin: Require password change on next login
- `deactivateUser.php` - Admin: Deactivate an account without deleting it
- `reactivateUser.php` - Admin: Reactivate an inactive account
- `getClasses.php` - Admin: List managed classes with assigned-user counts
- `createClass.php` - Admin: Create a managed class entry
- `updateClass.php` - Admin: Rename a managed class and cascade assignments
- `deleteClass.php` - Admin: Delete an unused class after confirmation and assignment checks
- `getUserResponses.php` - Get user's past responses
- `getAllStudentResponses.php` - Admin: Get all student responses
- `saveTeacherFeedback.php` - Admin: Save teacher feedback and ratings
- `bulkUploadUsers.php` - Admin: Bulk upload student accounts from CSV
- `getStudentRewards.php` - Compute badge achievements and stats for a student
- `sendAdminMessage.php` - Admin: Send a custom personalised email to one or more users

### Security Notes

- Never commit `.config.json` files to version control
- Use environment variables for production deployments
- Ensure proper database user permissions
- Use HTTPS in production environments

## Technology Stack

- **Frontend**: React 18.3.1, Vite, Ant Design
- **Backend**: PHP, MySQL
- **AI Integration**: Google Gemini 2.5 Flash API
- **Email System**: PHPMailer with SMTP support
- **Security**: Protected API endpoints with content-type validation
- **Styling**: Custom CSS with responsive design and steampunk theme

## 🛡️ API Security Status - FULLY SECURED

All API endpoints are now protected against direct browser access while maintaining full functionality for the React application.

### Security Levels Applied

#### 🔴 **HIGH SECURITY (requireAuth)**
*Complete protection - requires POST + JSON content-type*

**User Data Endpoints:**
- `getUsers.php` - All user data (emails, hashes, etc.)
- `getAllStudentResponses.php` - All student response data
- `getUserResponses.php` - Individual user response data
- `getUserStats.php` - User statistics and analytics
- `exportData.php` - Data export functionality

**Admin Functions:**
- `createQuestion.php` - Create new questions
- `createSubject.php` - Create new subjects  
- `createTopic.php` - Create new topics
- `updateQuestion.php` - Modify questions
- `updateUser.php` - Modify user data
- `deleteQuestion.php` - Delete questions
- `deleteSubject.php` - Delete subjects
- `deleteTopic.php` - Delete topics
- `deleteUser.php` - Delete users
- `bulkUploadQuestions.php` - Bulk question import
- `bulkUploadUsers.php` - Bulk user import
- `sendPasswordChangeNotification.php` - Password change notifications
- `requestPasswordReset.php` - Self-service password reset request
- `validateResetToken.php` - Password reset token validation
- `resetPassword.php` - Password reset completion
- `forcePasswordChange.php` - Admin: require password change on next login
- `deactivateUser.php` - Admin: deactivate accounts without deleting work
- `reactivateUser.php` - Admin: reactivate inactive accounts
- `getClasses.php` - Admin: retrieve managed classes for assignment workflows
- `createClass.php` - Admin: create class records in `tblClass`
- `updateClass.php` - Admin: rename classes and migrate assigned users
- `deleteClass.php` - Admin: delete unassigned classes from `tblClass`
- `sendAdminMessage.php` - Admin: send personalised email to selected users

#### 🟡 **BASIC SECURITY (blockDirectAccess)**
*Blocks casual browsing but allows legitimate API calls*

- `getLogin.php` - User authentication
- `getSubjects.php` - Subject listings
- `getTopics.php` - Topic listings
- `getQuestions.php` - Question data
- `submitResponse.php` - Student answer submission (supports multimodal with graphics)
- `geminiAPI.php` - AI assessment (supports multimodal text + image analysis)
- `InsertUser.php` - User registration

### Protection Features

#### ✅ **What's Blocked:**
- Direct browser GET requests to any endpoint
- Casual browsing/scraping of API data
- Directory listings of /api folder (via index.php)
- Unauthorized access to sensitive user data
- Direct access to admin functions
- Prompt injection attacks in AI prompts

#### ✅ **What Still Works:**
- All React app functionality
- Legitimate POST requests with JSON content-type
- Multimodal submissions (text + images)
- Normal login and registration flows
- All admin panel operations
- Student quiz functionality with graphic uploads

### Security Implementation

**Simple Security Helper:** `simple_security.php`
- `blockDirectAccess()` - Basic protection
- `requireAuth()` - Signed bearer-token validation
- `requireAdmin()` - Admin-only signed bearer-token validation
- `isLegitimateApiCall()` - Validation logic

### Password and Account-State Notes

- Password reset tokens are stored in `tblpasswordreset`, expire after 60 minutes, and are marked single-use once redeemed.
- New passwords are stored with `password_hash(..., PASSWORD_BCRYPT)` in `tbluser.passwordHash`.
- Legacy MD5 hashes are still accepted at login for backwards compatibility and are automatically upgraded to bcrypt after a successful plaintext login.
- `force_pw_change`, `last_pw_change`, and `is_active` are now part of the live user-account workflow.

**Directory Protection:** `api/index.php`
- Returns 403 Forbidden for directory browsing
- Prevents file/folder listing of /api directory
- Does not interfere with endpoint access

**Protection Method:**
- Requires POST method (not GET)
- Requires `application/json` or `multipart/form-data` content-type
- Blocks browser address bar access
- Allows all React app requests
- Prevents prompt injection in AI interactions

## Bulk Student Upload

The system supports bulk upload of student accounts via CSV files. This is perfect for schools to quickly create multiple student accounts.

### CSV Format

Create a CSV file with the following columns:

```csv
email,name,department,locale
john.doe@school.edu,John Doe,Mathematics,en-US
jane.smith@school.edu,Jane Smith,Science,en-US
```

The CSV header remains `department` for backwards compatibility, but imported values are stored in `tbluser.userClass` and can be aligned to managed classes in `tblClass`.

**Required columns:**
- `email`: Student's email address (used for login)
- `name`: Full name of the student

**Optional columns:**
- `department`: Class, tutor group, department, or grade level; saved to `userClass`
- `locale`: Language preference (defaults to en-US)

### How it works:

1. **Admin Access**: Only admin users can perform bulk uploads
2. **CSV Processing**: Upload your CSV file through the Admin Manager
3. **Account Creation**: System creates user accounts with a default password
4. **Class Storage**: The uploaded `department` value is stored in `userClass` for admin filtering and manual class management
5. **Email Notifications**: Automatic welcome emails sent to all new students with login credentials
6. **Security**: Students are prompted to change their password on first login

**Sample file**: Use `data/sample_students.csv` as a template

## Admin Manager Workflows

The Admin Manager is the main operational screen for staff who maintain users and classes.

### Account-State Actions

Admins can manage account status directly from the user table:

1. Use `Edit` to update user details, assigned class, locale, avatar, admin level, and access permissions.
2. Use `Require Password Change` to force a password reset on the user’s next login.
3. Use `Deactivate` to block login without deleting the user’s work.
4. Use `Reactivate` to restore access for previously inactive accounts.
5. Use `Delete` only when the account should be permanently removed.

Destructive or security-sensitive actions use confirmation prompts before changes are applied.

### Managed Classes

Use `Manage Classes` from the Admin Manager toolbar to maintain the shared class list stored in `tblClass`.

1. Create a class by entering a class name and selecting `Create Class`.
2. Rename a class by selecting `Edit`, changing the name, and selecting `Update Class`.
3. Delete a class by selecting `Delete` and confirming the deletion in the follow-up modal.

Class deletion is intentionally protected:

- Classes with assigned users cannot be deleted until those users are reassigned.
- The UI shows the assigned user count for each class.
- Delete always requires a second confirmation step.

### Class Assignment Notes

- User records now store class values in `tbluser.userClass`.
- The legacy CSV column name `department` is still accepted during bulk upload for compatibility.
- When managed classes exist, the user edit form offers them as a dropdown for consistent allocation.

## Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `api/.config.json` file

## 🎨 Multimodal Student Responses

The system supports multimodal student responses, allowing students to upload graphics alongside their text answers for comprehensive AI assessment.

### Feature Overview

**Students can:**
- Upload images (PNG, JPG, GIF, BMP) as part of their answers
- Preview images before submission
- Remove and replace images if needed
- Submit text-only, image-only, or combined responses

**Teachers see:**
- Student text answers
- Uploaded graphics in admin dashboard
- Graphics in past answers review
- All content together in AI feedback modal

**AI analyzes:**
- Text responses with traditional NLP
- Visual content (diagrams, sketches, screenshots)
- Combined multimodal understanding
- Provides feedback on both text and visual elements

### Technical Implementation

#### Client-Side (StudentInterface.jsx)
```javascript
// File validation: PNG/JPG/GIF/BMP, max 5MB
const handleGraphicSelect = (event) => {
  const file = event.target.files[0];
  // Validation logic
  // Convert to base64 data URL
  // Set preview and state
};
```

#### Database Schema
```sql
ALTER TABLE tblresponse 
ADD COLUMN student_graphic LONGTEXT NULL 
COMMENT 'Base64-encoded student uploaded image';
```

#### API Endpoints

**submitResponse.php:**
- Accepts `studentGraphic` parameter (optional)
- Stores base64 data URL in database
- Type: LONGTEXT (supports up to ~4GB)

**geminiAPI.php:**
- Extracts MIME type from data URL
- Sends multimodal request to Gemini API
- Format: `{parts: [{text: "..."}, {inline_data: {...}}]}`

### Usage Example

**Student workflow:**
1. Select question to answer
2. Type text response
3. Click "Upload Graphic" (optional)
4. Select image file from device
5. Preview shows thumbnail
6. Submit for AI assessment
7. View feedback with question, answer, graphic, and AI assessment

**Data flow:**
```
StudentInterface → submitResponse.php → Database (tblresponse.student_graphic)
                ↓
              geminiAPI.php → Gemini 2.5 Flash (multimodal analysis)
                ↓
              AI Feedback Modal (displays all content)
```

### Security Considerations

**Client-side:**
- File type validation (image formats only)
- File size limit (5MB maximum)
- Preview before submission

**Server-side:**
- POST-only requests
- Content-type validation
- Base64 encoding prevents script injection
- LONGTEXT storage for large images

**AI Protection:**
- Prompt engineering prevents AI from revealing graphics in text output
- Instruction: "do not include any images that I have uploaded" in prompt
- Ensures AI feedback focuses on assessment, not data leakage

## 📧 Email System

The system includes a comprehensive email notification system with professional templates:

### Email Templates
- **Welcome Email**: Sent to new users with login credentials
- **Password Change Notification**: Sent when passwords are changed by user or admin
- **Templates Location**: `/public/templates/`
  - `welcome_email.html` / `welcome_email.txt`
  - `password_change_notification.html` / `password_change_notification.txt`

### Email Features
- **Professional Design**: Exeter College branding with logo
- **Responsive Templates**: Work across all email clients
- **Security Notifications**: Automatic alerts for password changes
- **Multi-format**: Both HTML and plain text versions
- **Template Variables**: Dynamic content with placeholder replacement

### SMTP Configuration
Configure in `api/.config.json`:
```json
{
  "smtpServer": "smtp.dreamhost.com",
  "smtpPort": 587,
  "smtpUser": "your-email@domain.com",
  "smtpPass": "your-password",
  "smtpFromEmail": "noreply@domain.com",
  "smtpFrom": "AI Revision Bot"
}
```

## 📈 Advanced Analytics & Improvement Metrics

The system provides comprehensive analytics beyond basic response tracking:

### Analytics Endpoints

#### 1. **Student Progress Over Time** (`type: "studentProgress"`)
```json
{
  "type": "studentProgress",
  "studentId": 2
}
```

**Returns:**
- Time-based RAG progression (perfect for graphing!)
- Individual responses with timestamps
- Cumulative average trending
- Weekly/monthly performance summaries

#### 2. **Comprehensive Improvement Analysis** (`type: "improvementAnalysis"`)
```json
{
  "type": "improvementAnalysis", 
  "studentId": 2
}
```

**Returns multiple improvement metrics:**

##### **A) Retry Improvements** (Original metric)
- Count of same-question improvements
- List of specific questions improved

##### **B) Overall Performance Trend**
- Compares first half vs second half of all responses
- Shows if student is improving over time
- More meaningful than retry-only improvements

##### **C) Subject-Specific Performance**
- Average RAG rating per subject
- Shows strengths and areas for improvement

### Understanding Improvement Metrics

#### **Why Some Users Show 0 Improvement**

The **current improvement column (0)** reflects a very specific type of improvement:

**Current "Improvement" Definition:**
- **Only counts when a student retries the SAME question and gets a better rating**
- Example: Student answers Question 123, gets 'R', then retries Question 123 and gets 'A' or 'G'

**Typical Scenario:**
- User has **1 Red + 4 Green** responses  
- But if these are **5 different questions** (no retries), improvement = 0
- This is why improvement shows 0 despite good overall performance

### Time-Based RAG Graph Data Structure

The `studentProgress` endpoint returns data perfect for graphing:

```json
{
  "progressData": [
    {
      "date": "2025-01-15 10:30:00",
      "rating": "R", 
      "ragValue": 1,
      "question": "Question text...",
      "topic": "Arrays",
      "subject": "Computing",
      "cumulativeAverage": 1.5
    },
    {
      "date": "2025-01-16 14:20:00", 
      "rating": "G",
      "ragValue": 3,
      "cumulativeAverage": 2.0
    }
  ],
  "weeklyAverages": [
    {
      "week": "2025-03",
      "averageRag": 2.1,
      "responseCount": 5
    }
  ]
}
```

### Recommended Graph Visualizations

#### **1. RAG Progress Over Time**
- **X-axis:** Date/Time
- **Y-axis:** RAG Value (1=Red, 2=Amber, 3=Green)
- **Data points:** Individual responses with color coding
- **Trend line:** Cumulative average

#### **2. Weekly Performance Trend**
- **X-axis:** Week numbers
- **Y-axis:** Average RAG score
- **Bars:** Response count per week

#### **3. Subject Performance Radar**
- **Radial chart** showing average performance per subject
- Easy to spot strengths and weaknesses

### Usage in React Component

```javascript
// Get time-based progress data
const response = await axios.post(`${config.api}/getAdvancedStatistics.php`, {
  type: "studentProgress",
  studentId: studentId
});

const progressData = response.data.progressData;

// Perfect for Chart.js, D3, or any graphing library
const chartData = progressData.map(entry => ({
  x: new Date(entry.date),
  y: entry.ragValue,
  label: `${entry.topic}: ${entry.rating}`
}));
```

## 📈 Interactive Student Progress Graphs

### ✨ **Visual Analytics Features**

#### **Interactive Student Names**
- **Student names in the department performance table are now clickable**
- **Hover effect**: Blue underline with background highlight
- **Click action**: Opens progress modal with time-based RAG graph

#### **Student Progress Modal**
- **Canvas-based chart** showing RAG progression over time
- **Individual data points** color-coded by RAG rating:
  - 🔴 **Red (R)** = Rating 1
  - 🟡 **Amber (A)** = Rating 2  
  - 🟢 **Green (G)** = Rating 3
- **Cumulative trend line** showing overall progress direction
- **Rich metadata** including dates, questions, topics, subjects

### 🔧 **Technical Implementation**

#### **Frontend Features:**
```jsx
// Clickable student names
<span 
  className="clickable-student-name"
  onClick={() => loadStudentProgress(studentId, studentName)}
>
  {student.name}
</span>

// Modal with custom canvas chart
<Modal title={`Progress Over Time - ${studentName}`}>
  <StudentProgressChart data={progressData} />
</Modal>
```

### 📱 **User Experience**

#### **How to Use:**
1. Navigate to **Analytics Module**
2. Select **Department** view
3. Choose a department from dropdown
4. **Click on any student name** in the performance table
5. View their **progress graph over time**

#### **Chart Features:**
- **Time-based X-axis** showing progression over dates
- **RAG scale Y-axis** (1=Red, 2=Amber, 3=Green)
- **Individual points** for each response
- **Trend line** showing cumulative average
- **Legend** and **summary statistics**
- **Date range** information

### 🎨 **Visual Design**

#### **Student Name Styling:**
- **Blue underline** indicates clickability
- **Hover effect** with background highlight
- **Smooth transitions** for professional feel

#### **Chart Design:**
- **Clean canvas-based rendering**
- **Grid lines** for easy reading
- **Color-coded data points** matching RAG system
- **Professional layout** with proper margins
- **Responsive legend** and statistics

#### **Modal Styling:**
- **Dark theme** consistent with app
- **Proper spacing** and typography
- **Loading states** during data fetch
- **Error handling** for students with no data

### 🔍 **Data Requirements**

**For Graph to Display:**
- Student must have **completed responses**
- Responses must have **teacher ratings** (R/A/G)
- Need **timestamps** for chronological ordering

**Empty State:**
- Shows helpful message when no data available
- Explains requirements for progress tracking

### 📈 **Analytics Value**

#### **Teachers Can Now:**
- **Visualize student learning progress** over time
- **Identify improvement trends** at a glance
- **See detailed response context** (questions, topics)
- **Track cumulative performance** changes
- **Compare individual vs overall averages**

#### **Key Insights:**
- **Learning trajectory**: Is student improving over time?
- **Consistency**: Are ratings becoming more stable?
- **Subject performance**: Context of each response
- **Engagement level**: Frequency of responses
- **Progress velocity**: Rate of improvement

### Summary of Improvement Types

| Type | Current | Enhanced |
|------|---------|----------|
| **Retry Improvements** | ✅ Available | ✅ Still available |
| **Overall Trend** | ❌ Missing | ✅ **NEW** - First/second half comparison |
| **Time-based Progress** | ❌ Missing | ✅ **NEW** - Perfect for graphing |
| **Subject Analysis** | ❌ Missing | ✅ **NEW** - Per-subject performance |

## Database Setup

1. Import the SQL template from `data/database_template.sql` into your MySQL database:
   ```sql
   mysql -u your_username -p your_database_name < data/database_template.sql
   ```

2. **Default Admin Account** (CHANGE IMMEDIATELY):
   - Email: `admin@example.com`
   - Password: `admin123`
   - **⚠️ SECURITY WARNING**: Change this password immediately after first login!

3. The template includes:
   - All necessary tables for users, responses, and teacher feedback
   - A sample subject and topic for testing
   - Foreign key constraints for data integrity

## Recent Enhancements

### v0.4.4 — Session Persistence (May 2026)

- Login sessions survive page refreshes and browser restores for up to 2 hours via `localStorage`
- A session-expiry countdown banner appears in the final 5 minutes to prompt users to save work
- Sessions are validated on page load; expired or malformed sessions are discarded silently without a crash
- Session lifetime is controlled by `AUTH_TTL_MS` in `src/App.jsx` (default: 120 minutes); `AUTH_WARNING_MS` sets the warning threshold (default: 5 minutes)

### v0.4.3 — Improved Analytics for Students and Teachers (May 2026)

- **Student Progress chart**: The `My Progress` page now shows a canvas-rendered **Weekly RAG Distribution** bar chart grouping Red/Amber/Green response counts by ISO calendar week; the chart builds the week map client-side when the server does not return pre-aggregated `weeklyAverages`
- **Analytics Module rework**: The teacher-facing analytics view has been simplified and restructured for clarity; `getAdvancedStatistics.php` has been slimmed down with redundant or overlapping endpoints removed
- **Badge image optimisation**: All badge PNG assets have been recompressed at lower file sizes without visible quality loss

### v0.4.2 — Welcome Emails and Achievement Awards in My Profile (May 2026)

- **Welcome email on account creation**: New `sendWelcomeEmail.php` sends an HTML/plain-text email with login credentials when an account is created, whether by manual admin creation or bulk CSV upload; triggered from `InsertUser.php` and `bulkUploadUsers.php`
- **Student achievement badges in My Profile**: The Account Manager now shows the student's highest earned badge per track with hover tooltips describing the achievement (e.g. `Green %: 72.5% → G-70 badge`); admin users see no badge section
- **Class management in Admin Manager**: Full CRUD modal for `tblClass`; admins can create, rename, and delete managed classes; deletion is blocked when users are still assigned and always requires a second confirmation step
- **User status filter**: The Admin Manager user table has an All / Active / Inactive toggle for quick filtering of account states
- **Add user modal**: Admins can create individual user accounts directly from the Admin Manager without using the bulk-upload flow
- **Deactivate/Reactivate confirmation modals**: Dedicated two-step confirmation dialogs for both deactivate and reactivate account-state changes
- **Client-side MD5 hashing removed**: Passwords are now sent as plaintext over HTTPS and hashed server-side with bcrypt; the CryptoJS MD5 call in `accountManager.jsx` has been removed
- **`sendValidateEmail.php` updated**: Validation emails now use the shared template infrastructure and consistent branding

### v0.4.1 — Password, Auth and Account-State Update (April 2026)

- Self-service password reset flow with one-time, expiring reset tokens (`requestPasswordReset.php`, `validateResetToken.php`, `resetPassword.php`)
- New reset email templates and notification updates for password-change events
- Signed bearer token login/session support via shared auth helper (`simple_security.php`)
- Plaintext login compatibility for bcrypt hashes with automatic legacy MD5-to-bcrypt hash upgrade
- Forced password change support (`force_pw_change`) with admin action and in-app forced change screen
- Non-destructive account deactivation support (`is_active`) with admin action and login enforcement
- Account reactivation support with dedicated admin action and confirmation workflow
- `userLocation` to `userClass` migration for clearer class allocation semantics, with compatibility handling during transition
- Managed class CRUD via `tblClass`, including admin modal workflows, assignment counts, and protected deletion rules
- SPA reset-link routing support for direct `/reset-password?token=...` access
- CORS/preflight handling for new password and account-state endpoints

### v0.4.0 — Student Rewards, Dashboard UX & Analytics Badges (April 2026)

#### Student Reward & Badge System
- **Four badge tracks** computed from RAG-rated latest attempts per question:
  - *Green %* — percentage of latest attempts rated Green (thresholds 25–90%)
  - *Amber/Green %* — percentage rated Amber or Green (thresholds 25–90%)
  - *No-Red streak* — consecutive latest-attempt questions without a Red (lengths 2–20)
  - *Green streak* — consecutive latest-attempt questions all Green (lengths 2–20)
- **My Progress page** — new student-facing page (`StudentProgress.jsx`) showing 10 stat tiles and all earned badges per track
- **Nav bar badges** — highest badge from each earned track shown as icons beneath the username with rich hover tooltips (e.g. `Green %: 72.5% → G-70 badge`); auto-refreshes every 30 seconds
- **Analytics badge display** — per-student badges visible in the Teaching Analytics Dashboard: a badge strip in the department breakdown table and a full Earned Badges section in the individual student view
- **Backend API** — `getStudentRewards.php` computes all stats and badge tracks server-side using latest-attempt-per-question logic

#### Admin Dashboard UX
- **Auto-refresh** — configurable interval (30 s / 60 s) with a toggle switch; responses reload in the background without a full-page spinner
- **Manual Refresh Now** button with last-refreshed timestamp
- **Tidied header layout** — stats and refresh controls separated into a clean toolbar

#### Student Interface
- **Answered question markers** — questions the student has previously submitted are highlighted with a darker background and a green ✓ badge; they remain fully retryable
- **Profile field locking** — name, email, and class fields are read-only for students; only password and avatar remain editable

#### Rich Text Editor
- **Tab-key indentation** — pressing Tab in the TipTap editor inserts a tab character in both blockPaste and standard modes

### Multimodal Assessment (November 2025)
- **Student Graphic Uploads**: Students can attach images (PNG/JPG/GIF/BMP, max 5MB) to answers
- **AI Image Analysis**: Gemini AI analyzes both text and uploaded graphics together
- **Base64 Storage**: Graphics stored as LONGTEXT base64 data in database (student_graphic column)
- **Display Integration**: Graphics shown in AI feedback, past answers, and admin review
- **File Validation**: Client-side validation for file type and size
- **Preview Feature**: Real-time preview of uploaded images before submission
- **Database Schema**: New student_graphic LONGTEXT column in tblresponse table

### UI/UX Improvements
- **Question Randomization**: Students get randomized question order for varied practice
- **Random Question Button**: Quick access to random questions with professional styling
- **Consistent Login Design**: Unified styling between login container and MOTD sections
- **Enhanced Student Interface**: Improved navigation and visual feedback with graphic upload
- **Interactive Student Progress**: Clickable student names with visual progress graphs
- **Graphic Preview**: Real-time preview of uploaded images with remove functionality
- **Responsive Image Display**: Graphics scale appropriately in all viewing contexts

### Security Enhancements
- **Comprehensive API Protection**: All endpoints secured against direct browser access
- **Content-Type Validation**: Strict validation of request formats
- **Role-Based Access Control**: Different security levels for different endpoint types
- **Password Change Notifications**: Automatic security alerts for password changes
- **Directory Browsing Prevention**: index.php blocks /api folder listings
- **Prompt Injection Protection**: AI prompts engineered to prevent security bypasses

### Email System
- **Template-Based Architecture**: Centralized email templates for easy maintenance
- **Professional Branding**: Exeter College logo and consistent styling
- **Multi-Format Support**: HTML and plain text versions for all emails
- **Security Notifications**: Automated alerts for account changes

### Analytics Improvements
- **Advanced Statistics API**: New endpoints for comprehensive analytics
- **Time-Based Progress Tracking**: Perfect for graphing student improvement over time
- **Multiple Improvement Metrics**: Beyond simple retry improvements
- **Subject-Specific Analysis**: Detailed breakdown by topic and subject areas
- **Interactive Progress Graphs**: Canvas-based charts with clickable student names
- **Visual RAG Progression**: Color-coded data points showing learning trajectories
- **Cumulative Trend Analysis**: Professional charts with rich metadata and context
- **Per-Student Badge Display**: Highest badges per track shown in department table and individual student analytics view

## Next Steps for Further Enhancement

### Optional Security Improvements
- JWT token validation in `requireAuth()`
- Rate limiting per IP address
- Logging of blocked access attempts
- HTTPS enforcement in production

### Potential UI Enhancements
- Real-time progress dashboards
- Mobile-responsive improvements
- Dark mode theme option
- Advanced chart interactions (zoom, pan, filtering)

### Analytics Extensions
- Predictive performance modeling
- Peer comparison analytics
- Learning path recommendations
- Export capabilities for detailed reports
- Class-wide performance comparisons
- Time-based cohort analysis

## ✅ **Implementation Status**

### **Completed Features:**
- ✅ Interactive student name clicking in department performance tables
- ✅ Time-based RAG progress graphs with canvas rendering
- ✅ Professional modal interface with loading states
- ✅ Color-coded data points matching RAG system
- ✅ Cumulative trend line analysis
- ✅ Rich metadata display (dates, questions, topics, subjects)
- ✅ Comprehensive error handling and empty states
- ✅ Responsive design matching app theme
- ✅ Secure API endpoints with proper authentication
- ✅ Full integration with existing Analytics Module

### **Ready for Production:**
- 🎯 **Teachers can click any student name** to view progress over time
- 📊 **Visual learning trajectories** with detailed context
- 🔍 **Improvement tracking** beyond simple retry metrics
- 🎨 **Professional UI/UX** with consistent theming
- 🛡️ **Secure architecture** with protected endpoints

**Your AI Revision Bot is now a comprehensive, secure, and feature-rich educational platform with advanced visual analytics! 🚀📈**
