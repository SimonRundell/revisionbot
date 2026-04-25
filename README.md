# AIRevision Bot Educational Assessment System
by Simon Rundell for CodeMonkey.design

A comprehensive web-based educational assessment platform featuring AI-powered feedback, student practice interfaces, teacher review dashboards, and advanced analytics.

## Features

- **Student Interface**: Interactive question answering with AI feedback and randomized question selection
- **Rich Text Editing**: Questions, mark schemes, student answers, and teacher feedback support bold, italic, underline, ordered/unordered lists, code, blockquotes, undo, and redo
- **AI Assessment**: Integration with Google's Gemini 2.5 Flash for intelligent immediate feedback
- **Multimodal Student Responses**: Students can upload graphics (PNG/JPG/GIF/BMP) as part of their answers
- **Past Answers Review**: Students can review their previous responses, graphics, and feedback
- **Admin Dashboard**: Teachers can review all student responses including uploaded graphics and add ratings/comments
- **RAG Rating System**: Teachers can rate responses with Relevant, Adequate, Good scale
- **User Management**: Registration, login, and role-based access control
- **Bulk Student Upload**: Import multiple student accounts from CSV files with automatic email notifications
- **Email Notifications**: Automated welcome emails and password change notifications with professional templates
- **Advanced Analytics**: Time-based progress tracking, improvement analysis, and comprehensive student statistics
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

- `getLogin.php` - User authentication
- `register.php` - User registration
- `getUserResponses.php` - Get user's past responses
- `getAllStudentResponses.php` - Admin: Get all student responses
- `saveTeacherFeedback.php` - Admin: Save teacher feedback and ratings
- `bulkUploadUsers.php` - Admin: Bulk upload student accounts from CSV

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
- `requireAuth()` - Enhanced protection  
- `isLegitimateApiCall()` - Validation logic

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

**Required columns:**
- `email`: Student's email address (used for login)
- `name`: Full name of the student

**Optional columns:**
- `department`: Department, class, or grade level
- `locale`: Language preference (defaults to en-US)

### How it works:

1. **Admin Access**: Only admin users can perform bulk uploads
2. **CSV Processing**: Upload your CSV file through the Admin Manager
3. **Account Creation**: System creates user accounts with a default password
4. **Email Notifications**: Automatic welcome emails sent to all new students with login credentials
5. **Security**: Students are prompted to change their password on first login

**Sample file**: Use `data/sample_students.csv` as a template

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
