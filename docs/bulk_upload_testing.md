# Bulk Upload Testing Guide

## Pre-Test Setup

1. **Admin Account**: Ensure you have an admin account to access the bulk upload feature
2. **SMTP Configuration**: Verify SMTP settings in `.config.json` for email functionality
3. **Test CSV File**: Use the provided `data/sample_students.csv` or create your own

## Test Scenarios

### Scenario 1: Successful Bulk Upload

**Test Data** (`test_students.csv`):
```csv
email,name,department,locale
test1@example.com,Test Student One,Mathematics,en-US
test2@example.com,Test Student Two,Science,en-US
test3@example.com,Test Student Three,History,fr-FR
```

Note: the CSV header remains `department` for compatibility, but successful imports now populate `tbluser.userClass`.

**Expected Results**:
- 3 users created in `tbluser` table
- All users have `admin = 0` and `userEmailValidated = 0`
- Imported class values are stored in `userClass`
- Welcome emails sent to all 3 addresses
- Success message shows "3 users created, 3 emails sent"

### Scenario 2: Duplicate Email Handling

**Test**: Upload CSV with an email that already exists in the database

**Expected Results**:
- Existing user skipped with warning message
- New users still created successfully
- Partial success message displayed

### Scenario 3: Invalid Data Handling

**Test Data** (`invalid_students.csv`):
```csv
email,name,department,locale
invalid-email,Missing Email Test,,
valid@test.com,,Department Without Name,
,Test Name Without Email,Valid Department,
```

**Expected Results**:
- Invalid rows skipped with specific error messages
- No users created from invalid data
- Detailed error report displayed

### Scenario 4: CSV Format Validation

**Test**: Upload non-CSV file or CSV with wrong headers

**Expected Results**:
- File type validation error
- Clear message about required CSV format
- No database changes made

### Scenario 5: Large File Handling

**Test**: Upload CSV with 50+ student records

**Expected Results**:
- All valid users processed
- Database transaction handles bulk insert
- Progress indicator shows processing status
- Email sending works for large batches

## Verification Steps

### Database Verification
```sql
-- Check created users
SELECT id, email, userName, userClass, userLocale, admin 
FROM tbluser 
WHERE admin = 0 
ORDER BY id DESC 
LIMIT 10;

-- Check managed classes seeded or used by uploaded users
SELECT id, className
FROM tblClass
ORDER BY className;

-- Verify password hashing
SELECT id, email, passwordHash 
FROM tbluser 
WHERE email LIKE 'test%@example.com';
```

### Email Verification
- Check if welcome emails are received
- Verify email content includes correct login credentials
- Confirm password reset instructions are clear

### UI/UX Verification
- Modal opens and closes properly
- File selection works correctly
- Progress messages display appropriately
- Error handling provides clear feedback
- Users list refreshes after successful upload

## Common Issues & Solutions

### Issue: "Access denied" error
**Solution**: Ensure you're logged in as an admin user (admin = 1)

### Issue: Email sending fails
**Solution**: Verify SMTP configuration in `.config.json`

### Issue: Database connection errors
**Solution**: Check database credentials and connection

### Issue: File upload fails
**Solution**: Verify PHP upload limits and file permissions

## Security Considerations

1. **Input Validation**: All email addresses are validated
2. **SQL Injection Prevention**: Prepared statements used
3. **Transaction Safety**: Database rollback on errors
4. **Access Control**: Admin-only functionality
5. **Password Security**: Default passwords are hashed
6. **Email Security**: PHPMailer with SMTP authentication
7. **API Protection**: blockDirectAccess() prevents direct browser access

## Database Schema Updates (November 2025)

### New Column: student_graphic

The `tblresponse` table now includes support for student-uploaded graphics:

```sql
ALTER TABLE tblresponse 
ADD COLUMN student_graphic LONGTEXT NULL 
COMMENT 'Base64-encoded student uploaded image';
```

**Field Details:**
- **Type**: LONGTEXT (supports up to ~4GB of base64 data)
- **Nullable**: YES (graphics are optional)
- **Format**: Base64-encoded data URL (e.g., `data:image/png;base64,...`)
- **Supported Formats**: PNG, JPG, GIF, BMP
- **Max Size**: 5MB (enforced client-side)

**Purpose:**
Students can now upload diagrams, sketches, screenshots, or other visual content as part of their answers. The AI analyzes both text and images together for comprehensive multimodal assessment.

**Storage Considerations:**
- Base64 encoding increases data size by ~33%
- 5MB image → ~6.7MB base64 data
- Monitor database growth with large-scale usage
- Consider implementing periodic cleanup of old graphics

## Performance Notes

- Batch processing handles up to 1000+ users efficiently
- Database transaction ensures data integrity
- Email sending may take time for large batches
- Progress indicators provide user feedback
- Student graphic uploads add minimal overhead (<1s for 5MB images)