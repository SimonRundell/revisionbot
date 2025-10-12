# AIRevision Bot Educational Assessment System
by Simon Rundell for CodeMonkey.design

A comprehensive web-based educational assessment platform featuring AI-powered feedback, student practice interfaces, and teacher review dashboards.

## Features

- **Student Interface**: Interactive question answering with AI feedback
- **AI Assessment**: Integration with Google's Gemini 2.5 Flash for intelligent immediate feedback
- **Past Answers Review**: Students can review their previous responses and feedback
- **Admin Dashboard**: Teachers can review all student responses and add ratings/comments
- **RAG Rating System**: Teachers can rate responses with Relevant, Adequate, Good scale
- **User Management**: Registration, login, and role-based access control
- **Bulk Student Upload**: Import multiple student accounts from CSV files with automatic email notifications

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

4. Start the development server:
   ```bash
   npm run dev
   ```

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

- **Frontend**: React, Vite, Ant Design
- **Backend**: PHP, MySQL
- **AI Integration**: Google Gemini 2.5 Flash API
- **Authentication**: JWT Bearer tokens

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
