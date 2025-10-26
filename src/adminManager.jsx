import {useState, useEffect} from 'react'
import axios from 'axios'
import {Drawer, Spin} from 'antd'
import CryptoJS from 'crypto-js'
import SelectLocale from './SelectLocale'
import AvatarManager from './AvatarManager'
import AccessControlTree from './AccessControlTree'
import { handleApiCall } from './utils/apiHelpers'

/****************************************************************************
 * AdminManager Component
 * Admin management interface for managing user accounts, including
 * creating, editing, deleting, and bulk uploading users.
 * Provides comprehensive user management with access control and filtering.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Object} props.currentUser - Current user object with authentication token and admin details
 * @param {Function} props.setSendSuccessMessage - Function to set success messages in parent component
 * @param {Function} props.setSendErrorMessage - Function to set error messages in parent component
 * @param {Function} props.setShowAdminManager - Function to control admin manager visibility
 * @param {boolean} props.showAdminManager - Boolean indicating if admin manager should be visible
 * @returns {JSX.Element} The AdminManager component
****************************************************************************/

function AdminManager({config, currentUser, setSendSuccessMessage, setSendErrorMessage,
                        setShowAdminManager, showAdminManager}) {

    const [isLoading, setIsLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [userToEdit, setUserToEdit] = useState(null);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        password: '',
        department: '',
        locale: '',
        avatar: '',
        avatarPreview: '',
        admin: false,
        userAccess: {} // For storing access control permissions
    });
    const [bulkUploadModalVisible, setBulkUploadModalVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [bulkUploadProgress, setBulkUploadProgress] = useState('');
    const [defaultPassword, setDefaultPassword] = useState('student123');
    const [bulkUploadUserAccess, setBulkUploadUserAccess] = useState({"1": "all"}); // Default access to subject 1
    
    // Filter states
    const [userFilter, setUserFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [selectedFilterType, setSelectedFilterType] = useState('all'); // all, students, admins
    
    // Filter users function
    const filteredUsers = users.filter(user => {
        const matchesName = user.userName?.toLowerCase().includes(userFilter.toLowerCase()) || 
                           user.email?.toLowerCase().includes(userFilter.toLowerCase());
        const matchesDepartment = user.userLocation?.toLowerCase().includes(departmentFilter.toLowerCase());
        const matchesType = selectedFilterType === 'all' || 
                           (selectedFilterType === 'admins' && user.admin) ||
                           (selectedFilterType === 'students' && !user.admin);
        
        return matchesName && matchesDepartment && matchesType;
    });

  useEffect(() => {
    const apiCall = () => axios.post(
      config.api + '/getUsers.php',
      {},
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    handleApiCall(
      apiCall,
      setUsers,
      setIsLoading,
      setSendSuccessMessage,
      setSendErrorMessage,
      'Users loaded',
      'Users not found'
    );
  }, []);

    const onClose = () => {
        setShowAdminManager(false);
    }

    /**
     * Show delete confirmation modal for selected user
     * Sets up the user to be deleted and displays confirmation dialog
     * 
     * @param {Object} user - User object to be deleted
     */
    const showDeleteConfirmation = (user) => {
        setUserToDelete(user);
        setDeleteModalVisible(true);
    };

    /**
     * Handle confirmed user deletion
     * Sends delete request to API and updates local state
     * Manages loading states and error handling
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when deletion is complete
     */
    const handleDeleteConfirm = async () => {
        if (!userToDelete) return;

        setDeleteModalVisible(false);
        setIsLoading(true);

        const jsonData = { id: userToDelete.id };
        // console.log ("Deleting user with ", jsonData)
        
        try {
            const response = await axios.post(
                config.api + '/deleteUser.php',
                jsonData,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = response.data;
            // console.log('Delete User Response:', data);

            if (data.status_code === 200) {
                setUsers(users.filter(user => user.id !== userToDelete.id));
                setSendSuccessMessage('User deleted');
            } else {
                setSendErrorMessage('User not found');
            }
        } catch (error) {
            console.error('Error:', error);
            setSendErrorMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
            setUserToDelete(null);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModalVisible(false);
        setUserToDelete(null);
    };

    const showEditModal = (user) => {
        setUserToEdit(user);
        
        // Parse userAccess from JSON string if it exists
        let userAccess = {};
        if (user.userAccess) {
            try {
                userAccess = JSON.parse(user.userAccess);
            } catch (error) {
                console.error('Error parsing userAccess JSON:', error);
                userAccess = {};
            }
        }
        
        setEditForm({
            name: user.userName,
            email: user.email,
            password: '',
            department: user.userLocation,
            locale: user.userLocale,
            avatar: user.avatar,
            avatarPreview: user.avatar || '/default_avatar.png',
            admin: Boolean(user.admin), // Convert to proper boolean (handles 0, 1, null, undefined)
            userAccess: userAccess
        });
        setEditModalVisible(true);
    };

    const handleEditCancel = () => {
        setEditModalVisible(false);
        setUserToEdit(null);
        setEditForm({
            name: '',
            email: '',
            password: '',
            department: '',
            locale: '',
            avatar: '',
            avatarPreview: '',
            admin: false,
            userAccess: {}
        });
    };

    /**
     * Handle avatar change from AvatarManager component
     * Updates the edit form with new avatar data and preview
     * 
     * @param {string} newAvatar - Base64 encoded avatar data or avatar path
     */
    const handleAvatarChange = (newAvatar) => {
        setEditForm(prev => ({
            ...prev,
            avatar: newAvatar,
            avatarPreview: newAvatar || '/default_avatar.png'
        }));
    };

    /**
     * Handle access control change from AccessControlTree component
     * Updates the edit form with new user access permissions
     * 
     * @param {Object} newUserAccess - Access control object with subject/topic permissions
     */
    const handleAccessControlChange = (newUserAccess) => {
        setEditForm(prev => ({
            ...prev,
            userAccess: newUserAccess
        }));
    };

    /**
     * Handle user update submission
     * Validates form data, hashes password if changed, and submits to API
     * Updates local user list on success
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when user update is complete
     */
    const handleUpdateUser = async () => {
        if (!userToEdit) return;

        setIsLoading(true);

        // Hash new password if provided
        let new_password = '';
        if (editForm.password.trim() !== '') {
            new_password = CryptoJS.MD5(editForm.password).toString();
        } else {
            new_password = userToEdit.passwordHash; // Keep existing hash if no new password
        }

        const jsonData = {
            id: userToEdit.id,
            userName: editForm.name,
            passwordHash: new_password,
            email: editForm.email,
            userLocation: editForm.department,
            userLocale: editForm.locale,
            avatar: editForm.avatar,
            admin: editForm.admin ? 1 : 0,
            userAccess: JSON.stringify(editForm.userAccess)
        };
        // console.log("updating user with ", jsonData);
        // console.log("editForm.admin type:", typeof editForm.admin, "value:", editForm.admin);
        // console.log("admin conversion result:", editForm.admin ? 1 : 0);

        try {
            const response = await axios.post(config.api + '/updateUser.php', jsonData, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.status_code === 200) {
                setSendSuccessMessage('User details updated.');
                
                // Send password change notification if password was changed
                if (editForm.password.trim() !== '') {
                    try {
                        await axios.post(config.api + '/sendPasswordChangeNotification.php', {
                            email: editForm.email,
                            userName: editForm.name,
                            changedBy: 'administrator'
                        }, {
                            headers: { 'Content-Type': 'application/json' }
                        });
                        console.log('Password change notification sent successfully');
                    } catch (notificationError) {
                        console.error('Failed to send password change notification:', notificationError);
                        // Don't fail the main operation if notification fails
                    }
                }
                
                // Update the user in the users array
                setUsers(prevUsers => 
                    prevUsers.map(user => 
                        user.id === userToEdit.id 
                            ? {
                                ...user,
                                userName: editForm.name,
                                email: editForm.email,
                                userLocation: editForm.department,
                                userLocale: editForm.locale,
                                avatar: editForm.avatar,
                                admin: editForm.admin,
                                userAccess: JSON.stringify(editForm.userAccess)
                            }
                            : user
                    )
                );
                setEditModalVisible(false);
                setUserToEdit(null);
            } else {
                setSendErrorMessage(response.data.message);
            }
        } catch (error) {
            console.error('Error updating user:', error);
            setSendErrorMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Bulk Upload Functions
    const showBulkUploadModal = () => {
        setBulkUploadModalVisible(true);
        setSelectedFile(null);
        setBulkUploadProgress('');
    };

    const closeBulkUploadModal = () => {
        setBulkUploadModalVisible(false);
        setSelectedFile(null);
        setBulkUploadProgress('');
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'text/csv') {
            setSelectedFile(file);
            setBulkUploadProgress('');
        } else {
            setSendErrorMessage('Please select a valid CSV file');
            setSelectedFile(null);
        }
    };

    const handleBulkUpload = async () => {
        if (!selectedFile) {
            setSendErrorMessage('Please select a CSV file first');
            return;
        }

        setIsLoading(true);
        setBulkUploadProgress('Processing CSV file...');

        try {
            const formData = new FormData();
            formData.append('csvFile', selectedFile);
            formData.append('defaultPassword', defaultPassword);
            formData.append('userAccess', JSON.stringify(bulkUploadUserAccess));

            // Debug logging
            //console.log('Current config:', config);
            // console.log('Bulk upload request:', {
            //     url: config.api + '/bulkUploadUsers.php',
            //     file: selectedFile.name,
            //     password: defaultPassword,
            //     fileSize: selectedFile.size
            // });

            const response = await axios.post(
                config.api + '/bulkUploadUsers.php',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                }
            );

            // console.log('Upload response:', response.data);
            // console.log('Response type:', typeof response.data);
            // console.log('Response keys:', Object.keys(response.data));
            
            const responseData = response.data;
            
            // Check all possible success conditions
            const isSuccess = responseData.success === true || 
                             responseData.created_count > 0 || 
                             (responseData.message && responseData.message.includes('completed'));
            
            // console.log('Is success?', isSuccess);
            // console.log('Success field:', responseData.success);
            // console.log('Created count:', responseData.created_count);
            
            if (isSuccess) {
                const createdCount = responseData.created_count || 0;
                const emailsSent = responseData.emails_sent || 0;
                
                setSendSuccessMessage(`Successfully uploaded ${createdCount} users. ${emailsSent} emails sent.`);
                setBulkUploadProgress(`Upload complete: ${createdCount} users created, ${emailsSent} emails sent.`);
                
                // Refresh the users list
                const apiCall = () => axios.post(
                    config.api + '/getUsers.php',
                    {},
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                handleApiCall(
                    apiCall,
                    setUsers,
                    () => {},
                    setSendSuccessMessage,
                    setSendErrorMessage,
                    'Users refreshed',
                    'Failed to refresh users'
                );

                // Close modal after a delay
                setTimeout(() => {
                    closeBulkUploadModal();
                }, 2000);
            } else {
                setSendErrorMessage(responseData.message || 'Upload failed');
                setBulkUploadProgress('Upload failed: ' + (responseData.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Bulk upload error:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            console.error('Error message:', error.message);
            
            const errorMessage = error.response?.data?.message || error.response?.data || error.message || 'Unknown error occurred';
            setSendErrorMessage('Error uploading users: ' + errorMessage);
            setBulkUploadProgress('Upload failed: ' + errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {isLoading && <div className="central-overlay-spinner">
                <div className="spinner-text">&nbsp;&nbsp;
                    <Spin size="large" />
                    Processing...
                </div>
            </div>}
            <Drawer
                title={"Admin Manager "}
                closable={{ 'aria-label': 'Close Button' }}
                onClose={onClose}
                open={showAdminManager}
                width={'99%'}>
                
                <div className="admin-actions-bar">
                    <button 
                        onClick={showBulkUploadModal}
                        className="bulk-upload-button"
                    >
                        📤 Bulk Upload Students
                    </button>
                    <span className="admin-actions-description">
                        Upload multiple student accounts from CSV file
                    </span>
                </div>

                {/* Search Filters */}
                <div className="search-filters">
                    <div className="filter-row">
                        <div className="filter-group">
                            <label>Search Students/Admins:</label>
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="Search by name or email..."
                                value={userFilter}
                                onChange={(e) => setUserFilter(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>Filter by Department/Class:</label>
                            <input
                                type="text"
                                className="filter-input"
                                placeholder="Search by class/department..."
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                            />
                        </div>
                        <div className="filter-group">
                            <label>User Type:</label>
                            <select
                                className="filter-select"
                                value={selectedFilterType}
                                onChange={(e) => setSelectedFilterType(e.target.value)}
                            >
                                <option value="all">All Users</option>
                                <option value="students">Students Only</option>
                                <option value="admins">Admins Only</option>
                            </select>
                        </div>
                    </div>
                    {(userFilter || departmentFilter || selectedFilterType !== 'all') && (
                        <div className="filter-summary">
                            Showing {filteredUsers.length} of {users.length} users
                            {userFilter && <span className="filter-tag"> Name/Email: &quot;{userFilter}&quot;</span>}
                            {departmentFilter && <span className="filter-tag"> Department: &quot;{departmentFilter}&quot;</span>}
                            {selectedFilterType !== 'all' && <span className="filter-tag"> of type: {selectedFilterType}</span>}
                            <button 
                                className="clear-filters leftgap"
                                onClick={() => {
                                    setUserFilter('');
                                    setDepartmentFilter('');
                                    setSelectedFilterType('all');
                                }}
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>

                <table border="1">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User Name</th>
                            <th>Email</th>
                            <th>Class</th>
                            <th>Locale</th>
                            <th>Avatar</th>
                            <th>Level</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td>{user.id}</td>
                                <td>{user.userName}</td>
                                <td>{user.email}</td>
                                <td>{user.userLocation}</td>
                                <td>{user.userLocale}</td>
                                <td><img className="user-avatar" src={user.avatar || '/default_avatar.png'} alt={user.userName} /></td>
                                <td>{user.admin ? 'Admin' : 'User'}</td>
                                <td>
                                    {/* Add action buttons here, e.g., Edit, Delete */}
                                    <button onClick={() => showEditModal(user)}>Edit</button>
                                    <button className="leftgap" onClick={() => showDeleteConfirmation(user)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>    
            </Drawer>
            
            {/* Delete Confirmation Modal */}
            {deleteModalVisible && (
                <div className="modal">
                    <div className="modal-content">
                        <span 
                            className="close" 
                            onClick={handleDeleteCancel}
                        >
                            &times;
                        </span>
                        <h2>Confirm Delete</h2>
                        <p>
                            Are you sure you want to delete user <strong>{userToDelete?.userName}</strong>?
                        </p>
                        <p>This action cannot be undone.</p>
                        <div className="form-group-button">
                            <button 
                                onClick={handleDeleteConfirm}
                                className="delete-button-danger"
                            >
                                Delete
                            </button>
                            <button 
                                onClick={handleDeleteCancel}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editModalVisible && (
                <div className="modal">
                    <div className="modal-content edit-modal-large">
                        <span 
                            className="close" 
                            onClick={handleEditCancel}
                        >
                            &times;
                        </span>
                        <h2>Edit User: {userToEdit?.userName}</h2>
                        <table border="1" className="edit-modal-table">
                            <tbody>
                                <tr>
                                    <td>Name</td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={editForm.name} 
                                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="full-width-input"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Email/Login</td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={editForm.email} 
                                            onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                            className="full-width-input"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>New Password</td>
                                    <td>
                                        <input 
                                            type="password" 
                                            value={editForm.password} 
                                            onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Leave blank to keep current password"
                                            className="full-width-input"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Department</td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={editForm.department} 
                                            onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                            className="full-width-input"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Admin Level</td>
                                    <td>
                                        <label className="admin-checkbox-container">
                                            <span className="leftgap"><input 
                                                type="checkbox" 
                                                checked={editForm.admin}
                                                onChange={e => setEditForm(prev => ({ ...prev, admin: e.target.checked }))}
                                            /></span>
                                            <span className="leftgap">{editForm.admin ? 'Administrator' : 'Regular User'}</span>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Locale</td>
                                    <td>
                                        <SelectLocale 
                                            config={config} 
                                            userLocale={editForm.locale} 
                                            setUserLocale={(locale) => setEditForm(prev => ({ ...prev, locale }))}
                                            setSendErrorMessage={setSendErrorMessage}
                                            setSendSuccessMessage={setSendSuccessMessage}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Avatar</td>
                                    <td>
                                        <AvatarManager 
                                            currentAvatar={editForm.avatar}
                                            onAvatarChange={handleAvatarChange}
                                            setSendErrorMessage={setSendErrorMessage}
                                            size={60}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Access Control</td>
                                    <td>
                                        <AccessControlTree 
                                            config={config}
                                            currentUser={currentUser}
                                            userAccess={editForm.userAccess}
                                            onAccessChange={handleAccessControlChange}
                                            setSendErrorMessage={setSendErrorMessage}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="form-group-button">
                            <button onClick={handleUpdateUser}>
                                Update User
                            </button>
                            <button 
                                onClick={handleEditCancel}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {bulkUploadModalVisible && (
                <div className="modal">
                    <div className="modal-content bulk-upload-modal">
                        <span 
                            className="close" 
                            onClick={closeBulkUploadModal}
                        >
                            &times;
                        </span>
                        <h2>📤 Bulk Upload Students</h2>
                        
                        <div className="bulk-upload-format-section">
                            <h4>CSV Format Required:</h4>
                            <p className="bulk-upload-format-description">
                                Your CSV file should have the following columns (with header row):
                            </p>
                            <code className="bulk-upload-format-code">
                                email,name,department,locale<br/>
                                john.doe@school.edu,John Doe,Mathematics,en-GB<br/>
                                jane.smith@school.edu,Jane Smith,Science,en-GB
                            </code>
                            <p className="bulk-upload-format-notes">
                                • <strong>email</strong>: Student&apos;s email address (required, will be used for login)<br/>
                                • <strong>name</strong>: Full name of the student (required)<br/>
                                • <strong>department</strong>: Department or class (optional)<br/>
                                • <strong>locale</strong>: Language preference like en-GB, en-US, fr-FR (optional, defaults to en-GB)
                            </p>
                        </div>

                        <table border="1" className="edit-modal-table">
                            <tbody>
                                <tr>
                                    <td className="bulk-upload-password-label">Default Password</td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={defaultPassword} 
                                            onChange={e => setDefaultPassword(e.target.value)}
                                            className="full-width-input"
                                            placeholder="e.g., student123"
                                        />
                                        <small className="bulk-upload-password-hint">
                                            This password will be emailed to all new users
                                        </small>
                                    </td>
                                </tr>
                                <tr>
                                    <td>CSV File</td>
                                    <td>
                                        <div className="file-input-wrapper">
                                            <input 
                                                type="file" 
                                                id="csv-upload"
                                                className="file-input-hidden"
                                                accept=".csv" 
                                                onChange={handleFileSelect}
                                            />
                                            <label htmlFor="csv-upload" className="file-input-button">
                                                {selectedFile ? selectedFile.name : 'Choose CSV File'}
                                            </label>
                                        </div>
                                        {selectedFile && (
                                            <div className="bulk-upload-file-selected">
                                                ✓ File selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="bulk-upload-access-section">
                            <h4>Subject & Topic Access</h4>
                            <p className="bulk-upload-access-description">
                                Configure which subjects and topics the new students will have access to. By default, students get access to all topics in Computing.
                            </p>
                            <AccessControlTree
                                currentUser={currentUser}
                                config={config}
                                userAccess={bulkUploadUserAccess}
                                onAccessChange={setBulkUploadUserAccess}
                                setSendErrorMessage={setSendErrorMessage}
                            />
                        </div>

                        {bulkUploadProgress && (
                            <div className={`bulk-upload-progress-container ${bulkUploadProgress.includes('failed') ? 'bulk-upload-progress-error' : 'bulk-upload-progress-success'}`}>
                                {bulkUploadProgress}
                            </div>
                        )}

                        <div className="form-group-button">
                            <button 
                                onClick={handleBulkUpload}
                                disabled={!selectedFile || isLoading}
                                className="bulk-upload-submit-button"
                            >
                                {isLoading ? 'Processing...' : 'Upload Students'}
                            </button>
                            <button 
                                onClick={closeBulkUploadModal}
                                className="topgap"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}


export default AdminManager;