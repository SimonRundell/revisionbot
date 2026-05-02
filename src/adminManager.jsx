import {useState, useEffect, useMemo} from 'react'
import axios from 'axios'
import {Drawer, Spin} from 'antd'
import CryptoJS from 'crypto-js'
import SelectLocale from './SelectLocale'
import AvatarManager from './AvatarManager'
import AccessControlTree from './AccessControlTree'
import { handleApiCall, parseApiResponse } from './utils/apiHelpers'
import { createJsonHeaders } from './utils/apiHeaders'

/****************************************************************************
 * AdminManager Component
 * Admin management interface for managing user accounts and class records,
 * including creating, editing, deleting, reactivating, deactivating,
 * requiring password changes, bulk uploading users, and maintaining tblClass.
 * Provides comprehensive user management with access control, filtering,
 * and confirmed destructive actions.
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
    const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
    const [userToDeactivate, setUserToDeactivate] = useState(null);
    const [reactivateModalVisible, setReactivateModalVisible] = useState(false);
    const [userToReactivate, setUserToReactivate] = useState(null);
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
        userAccess: {}, // For storing access control permissions
        sendCredentials: false // Whether to email new credentials to user
    });
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [addForm, setAddForm] = useState({
        name: '',
        email: '',
        password: '',
        department: '',
        locale: 'en-GB',
        avatar: '',
        avatarPreview: '',
        admin: false,
        userAccess: {"1": "all"} // Default access to subject 1
    });
    const [bulkUploadModalVisible, setBulkUploadModalVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [bulkUploadProgress, setBulkUploadProgress] = useState('');
    const [defaultPassword, setDefaultPassword] = useState('student123');
    const [bulkUploadUserAccess, setBulkUploadUserAccess] = useState({"1": "all"}); // Default access to subject 1
    const [classes, setClasses] = useState([]);
    const [classModalVisible, setClassModalVisible] = useState(false);
    const [classFormName, setClassFormName] = useState('');
    const [editingClass, setEditingClass] = useState(null);
    const [classToDelete, setClassToDelete] = useState(null);
    const [deleteClassModalVisible, setDeleteClassModalVisible] = useState(false);

    // Message Users state
    const [messageModalVisible, setMessageModalVisible] = useState(false);
    const [messageTargetType, setMessageTargetType] = useState('active-students');
    const [messageTargetClass, setMessageTargetClass] = useState('');
    const [messageSelectedIds, setMessageSelectedIds] = useState([]);
    const [messageSubject, setMessageSubject] = useState('');
    const [messageBody, setMessageBody] = useState('');
    const [messageSending, setMessageSending] = useState(false);
    const [messageResult, setMessageResult] = useState(null);

    // Filter states
    const [userFilter, setUserFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [selectedFilterType, setSelectedFilterType] = useState('all'); // all, students, admins
    const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // all, active, inactive
    
    // Filter users function
    const filteredUsers = users.filter(user => {
        const matchesName = user.userName?.toLowerCase().includes(userFilter.toLowerCase()) || 
                           user.email?.toLowerCase().includes(userFilter.toLowerCase());
        const userClassValue = (user.userClass ?? user.userLocation ?? '').toLowerCase();
        const matchesDepartment = userClassValue.includes(departmentFilter.toLowerCase());
        const matchesType = selectedFilterType === 'all' || 
                           (selectedFilterType === 'admins' && user.admin) ||
                           (selectedFilterType === 'students' && !user.admin);
        const isActive = Number(user.is_active) !== 0;
        const matchesStatus = selectedStatusFilter === 'all' ||
                              (selectedStatusFilter === 'active' && isActive) ||
                              (selectedStatusFilter === 'inactive' && !isActive);
        
        return matchesName && matchesDepartment && matchesType && matchesStatus;
    });

    // Compute message recipients based on the current target selection
    const messageRecipients = useMemo(() => {
        const active = users.filter(u => Number(u.is_active) !== 0);
        switch (messageTargetType) {
            case 'all-active':
                return active;
            case 'active-students':
                return active.filter(u => !u.admin);
            case 'by-class':
                if (!messageTargetClass) return [];
                return active.filter(u => (u.userClass ?? u.userLocation ?? '') === messageTargetClass);
            case 'individuals':
                return users.filter(u => messageSelectedIds.includes(u.id));
            default:
                return [];
        }
    }, [users, messageTargetType, messageTargetClass, messageSelectedIds]);

  useEffect(() => {
    const apiCall = () => axios.post(
      config.api + '/getUsers.php',
      {},
      {
                headers: createJsonHeaders(currentUser),
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

  useEffect(() => {
    const loadClasses = async () => {
        try {
            const response = await axios.post(
                config.api + '/getClasses.php',
                {},
                {
                    headers: createJsonHeaders(currentUser),
                }
            );

            const parsedData = parseApiResponse(
                response.data,
                null,
                null,
                '',
                'Failed to load classes.'
            );

            if (parsedData !== null) {
                setClasses(parsedData);
            }
        } catch (error) {
            console.warn('Class lookup unavailable:', error);
            setClasses([]);
        }
    };

    loadClasses();
  }, [config.api, currentUser]);

    const onClose = () => {
        setShowAdminManager(false);
    }

    const resetClassForm = () => {
        setClassFormName('');
        setEditingClass(null);
    };

    const openClassModal = () => {
        setClassModalVisible(true);
        resetClassForm();
    };

    const closeClassModal = () => {
        setClassModalVisible(false);
        resetClassForm();
    };

    const refreshClasses = async () => {
        try {
            const response = await axios.post(
                config.api + '/getClasses.php',
                {},
                {
                    headers: createJsonHeaders(currentUser),
                }
            );

            const parsedData = parseApiResponse(response.data, null, null, '', 'Failed to load classes.');
            if (parsedData !== null) {
                setClasses(parsedData);
            }
        } catch (error) {
            console.error('Error refreshing classes:', error);
            setSendErrorMessage('Unable to refresh classes.');
        }
    };

    const handleSaveClass = async () => {
        const trimmedClassName = classFormName.trim();
        if (!trimmedClassName) {
            setSendErrorMessage('Class name is required.');
            return;
        }

        setIsLoading(true);

        try {
            const endpoint = editingClass ? '/updateClass.php' : '/createClass.php';
            const payload = editingClass
                ? { id: editingClass.id, className: trimmedClassName }
                : { className: trimmedClassName };

            const response = await axios.post(
                config.api + endpoint,
                payload,
                {
                    headers: createJsonHeaders(currentUser),
                }
            );

            if (response.data.status_code === 200) {
                setSendSuccessMessage(response.data.message || (editingClass ? 'Class updated.' : 'Class created.'));

                if (editingClass && editForm.department === editingClass.className) {
                    setEditForm(prev => ({ ...prev, department: trimmedClassName }));
                }

                await refreshClasses();
                resetClassForm();
            } else {
                setSendErrorMessage(response.data.message || 'Unable to save class.');
            }
        } catch (error) {
            console.error('Error saving class:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to save class.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClass = (classRecord) => {
        setEditingClass(classRecord);
        setClassFormName(classRecord.className);
    };

    /**
     * Show delete confirmation modal for a managed class.
     *
     * @param {Object} classRecord - Class row selected for deletion
     */
    const showDeleteClassConfirmation = (classRecord) => {
        setClassToDelete(classRecord);
        setDeleteClassModalVisible(true);
    };

    /**
     * Close the class delete confirmation modal without deleting.
     */
    const handleDeleteClassCancel = () => {
        setDeleteClassModalVisible(false);
        setClassToDelete(null);
    };

    /**
     * Delete a managed class after explicit confirmation.
     * Assigned classes are blocked until users are reassigned.
     *
     * @returns {Promise<void>}
     */
    const handleDeleteClass = async () => {
        if (!classToDelete) return;

        setDeleteClassModalVisible(false);

        const classRecord = classToDelete;

        if (Number(classRecord.assignedUsers) > 0) {
            setSendErrorMessage('This class is assigned to one or more users. Reassign them before deleting the class.');
            setClassToDelete(null);
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post(
                config.api + '/deleteClass.php',
                { id: classRecord.id },
                {
                    headers: createJsonHeaders(currentUser),
                }
            );

            if (response.data.status_code === 200) {
                setSendSuccessMessage(response.data.message || 'Class deleted.');
                await refreshClasses();

                if (editingClass?.id === classRecord.id) {
                    resetClassForm();
                }
            } else {
                setSendErrorMessage(response.data.message || 'Unable to delete class.');
            }
        } catch (error) {
            console.error('Error deleting class:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to delete class.');
        } finally {
            setIsLoading(false);
            setClassToDelete(null);
        }
    };

    const availableClassOptions = classes.some(classRecord => classRecord.className === editForm.department)
        ? classes
        : (editForm.department
            ? [{ id: 'legacy-current-class', className: editForm.department, assignedUsers: 0 }, ...classes]
            : classes);

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

    const showDeactivateConfirmation = (user) => {
        setUserToDeactivate(user);
        setDeactivateModalVisible(true);
    };

    const handleDeactivateCancel = () => {
        setDeactivateModalVisible(false);
        setUserToDeactivate(null);
    };

    const showReactivateConfirmation = (user) => {
        setUserToReactivate(user);
        setReactivateModalVisible(true);
    };

    const handleReactivateCancel = () => {
        setReactivateModalVisible(false);
        setUserToReactivate(null);
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
            department: user.userClass ?? user.userLocation ?? '',
            locale: user.userLocale,
            avatar: user.avatar,
            avatarPreview: user.avatar || '/default_avatar.png',
            admin: Boolean(user.admin), // Convert to proper boolean (handles 0, 1, null, undefined)
            userAccess: userAccess,
            sendCredentials: false
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
            userAccess: {},
            sendCredentials: false
        });
    };

    /**
     * Show add user modal with empty form
     */
    const showAddUserModal = () => {
        setAddForm({
            name: '',
            email: '',
            password: '',
            department: '',
            locale: 'en-GB',
            avatar: '',
            avatarPreview: '',
            admin: false,
            userAccess: {"1": "all"}
        });
        setAddModalVisible(true);
    };

    /**
     * Cancel add user modal
     */
    const handleAddCancel = () => {
        setAddModalVisible(false);
        setAddForm({
            name: '',
            email: '',
            password: '',
            department: '',
            locale: 'en-GB',
            avatar: '',
            avatarPreview: '',
            admin: false,
            userAccess: {"1": "all"}
        });
    };

    /**
     * Handle add new user submission
     * Validates form data, hashes password, and submits to API
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when user is created
     */
    const handleAddUser = async () => {
        // Validate required fields
        if (!addForm.name || !addForm.email || !addForm.password) {
            setSendErrorMessage('Please fill in all required fields (Name, Email, Password)');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(addForm.email)) {
            setSendErrorMessage('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            // Hash password using MD5 (matching register.jsx behavior)
            const passwordHash = CryptoJS.MD5(addForm.password).toString();

            const jsonData = {
                email: addForm.email,
                passwordHash: passwordHash,
                userName: addForm.name,
                userClass: addForm.department,
                userStatus: 1, // Active by default
                userLocale: addForm.locale,
                avatar: addForm.avatar || '',
                admin: addForm.admin ? 1 : 0,
                userAccess: JSON.stringify(addForm.userAccess)
            };

            const response = await axios.post(config.api + '/InsertUser.php', jsonData, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data.status_code === 200) {
                setSendSuccessMessage('User successfully created');
                
                // Send welcome email with login credentials
                try {
                    await axios.post(config.api + '/sendWelcomeEmail.php', {
                        email: addForm.email,
                        userName: addForm.name,
                        password: addForm.password
                    }, {
                        headers: createJsonHeaders(currentUser)
                    });
                    console.log('Welcome email sent successfully');
                } catch (emailError) {
                    console.error('Failed to send welcome email:', emailError);
                    setSendErrorMessage('User created but failed to send welcome email');
                }
                
                // Refresh the users list
                const apiCall = () => axios.post(
                    config.api + '/getUsers.php',
                    {},
                    {
                        headers: createJsonHeaders(currentUser),
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
                
                setAddModalVisible(false);
                handleAddCancel();
            } else {
                setSendErrorMessage(response.data.message || 'Failed to create user');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            setSendErrorMessage(error.response?.data?.message || 'Network error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handle avatar change for add user form
     * 
     * @param {string} newAvatar - Base64 encoded avatar data or avatar path
     */
    const handleAddAvatarChange = (newAvatar) => {
        setAddForm(prev => ({
            ...prev,
            avatar: newAvatar,
            avatarPreview: newAvatar || '/default_avatar.png'
        }));
    };

    /**
     * Handle access control change for add user form
     * 
     * @param {Object} newUserAccess - Access control object with subject/topic permissions
     */
    const handleAddAccessControlChange = (newUserAccess) => {
        setAddForm(prev => ({
            ...prev,
            userAccess: newUserAccess
        }));
    };

    /**
     * Require a password change on the selected user's next login.
     *
     * @param {Object} user
     * @returns {Promise<void>}
     */
    const handleForcePasswordChange = async (user) => {
        setIsLoading(true);

        try {
            const response = await axios.post(
                config.api + '/forcePasswordChange.php',
                { id: user.id },
                {
                    headers: createJsonHeaders(currentUser),
                }
            );

            if (response.data.status_code === 200) {
                setUsers(prevUsers => prevUsers.map(existingUser => (
                    existingUser.id === user.id
                        ? { ...existingUser, force_pw_change: 1 }
                        : existingUser
                )));
                setSendSuccessMessage(response.data.message || 'Password change will be required on next login.');
            } else {
                setSendErrorMessage(response.data.message || 'Unable to require a password change for this account.');
            }
        } catch (error) {
            console.error('Force password change failed:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to require a password change for this account.');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Deactivate a user account without deleting their data.
     *
     * @param {Object} user
     * @returns {Promise<void>}
     */
    const handleDeactivateConfirm = async () => {
        if (!userToDeactivate) return;

        setDeactivateModalVisible(false);
        setIsLoading(true);

        try {
            const response = await axios.post(
                config.api + '/deactivateUser.php',
                { id: userToDeactivate.id },
                {
                    headers: createJsonHeaders(currentUser),
                }
            );

            if (response.data.status_code === 200) {
                setUsers(prevUsers => prevUsers.map(existingUser => (
                    existingUser.id === userToDeactivate.id
                        ? { ...existingUser, is_active: 0 }
                        : existingUser
                )));
                setSendSuccessMessage(response.data.message || 'Account deactivated.');
            } else {
                setSendErrorMessage(response.data.message || 'Unable to deactivate this account.');
            }
        } catch (error) {
            console.error('Deactivate user failed:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to deactivate this account.');
        } finally {
            setIsLoading(false);
            setUserToDeactivate(null);
        }
    };

    /**
     * Reactivate a previously deactivated user account.
     *
     * @returns {Promise<void>}
     */
    const handleReactivateConfirm = async () => {
        if (!userToReactivate) return;

        setReactivateModalVisible(false);
        setIsLoading(true);

        try {
            const response = await axios.post(
                config.api + '/reactivateUser.php',
                { id: userToReactivate.id },
                {
                    headers: createJsonHeaders(currentUser),
                }
            );

            if (response.data.status_code === 200) {
                setUsers(prevUsers => prevUsers.map(existingUser => (
                    existingUser.id === userToReactivate.id
                        ? { ...existingUser, is_active: 1 }
                        : existingUser
                )));
                setSendSuccessMessage(response.data.message || 'Account reactivated.');
            } else {
                setSendErrorMessage(response.data.message || 'Unable to reactivate this account.');
            }
        } catch (error) {
            console.error('Reactivate user failed:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to reactivate this account.');
        } finally {
            setIsLoading(false);
            setUserToReactivate(null);
        }
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
    * Validates form data, optionally includes a new plaintext password, and submits to API
     * Updates local user list on success
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when user update is complete
     */
    const handleUpdateUser = async () => {
        if (!userToEdit) return;

        setIsLoading(true);

        const jsonData = {
            id: userToEdit.id,
            userName: editForm.name,
            email: editForm.email,
            userClass: editForm.department,
            userLocale: editForm.locale,
            avatar: editForm.avatar,
            admin: editForm.admin ? 1 : 0,
            userAccess: JSON.stringify(editForm.userAccess)
        };

        if (editForm.password.trim() !== '') {
            jsonData.password = editForm.password;
        }
        // console.log("updating user with ", jsonData);
        // console.log("editForm.admin type:", typeof editForm.admin, "value:", editForm.admin);
        // console.log("admin conversion result:", editForm.admin ? 1 : 0);

        try {
            const response = await axios.post(config.api + '/updateUser.php', jsonData, {
                headers: createJsonHeaders(currentUser)
            });

            if (response.data.status_code === 200) {
                setSendSuccessMessage('User details updated.');
                
                // Send welcome email with new credentials if requested and password was changed
                if (editForm.password.trim() !== '' && editForm.sendCredentials) {
                    try {
                        await axios.post(config.api + '/sendWelcomeEmail.php', {
                            email: editForm.email,
                            userName: editForm.name,
                            password: editForm.password
                        }, {
                            headers: createJsonHeaders(currentUser)
                        });
                        console.log('Welcome email with credentials sent successfully');
                    } catch (emailError) {
                        console.error('Failed to send welcome email:', emailError);
                        setSendErrorMessage('User updated but failed to send credentials email');
                    }
                }
                // Send password change notification if password was changed but credentials not sent
                else if (editForm.password.trim() !== '') {
                    try {
                        await axios.post(config.api + '/sendPasswordChangeNotification.php', {
                            email: editForm.email,
                            userName: editForm.name,
                            changedBy: 'administrator'
                        }, {
                            headers: { 'Content-Type': 'application/json' }
                        });
                        // console.log('Password change notification sent successfully');
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
                                userClass: editForm.department,
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

    const closeMessageModal = () => {
        setMessageModalVisible(false);
        setMessageSubject('');
        setMessageBody('');
        setMessageTargetType('active-students');
        setMessageTargetClass('');
        setMessageSelectedIds([]);
        setMessageResult(null);
    };

    const handleSendMessage = async () => {
        if (!messageSubject.trim()) { setSendErrorMessage('Please enter a subject.'); return; }
        if (!messageBody.trim()) { setSendErrorMessage('Please enter a message body.'); return; }
        if (messageRecipients.length === 0) { setSendErrorMessage('No recipients selected.'); return; }

        setMessageSending(true);
        setMessageResult(null);
        try {
            const response = await axios.post(
                config.api + '/sendAdminMessage.php',
                {
                    userIds: messageRecipients.map(u => u.id),
                    subject: messageSubject,
                    body: messageBody,
                },
                { headers: createJsonHeaders(currentUser) }
            );
            const result = parseApiResponse(response.data, null, null, '', 'Failed to send messages.');
            if (result) {
                setMessageResult(result);
                if (result.sent > 0) {
                    setSendSuccessMessage(`${result.sent} message(s) sent successfully.`);
                }
            }
        } catch (error) {
            console.error('Error sending admin message:', error);
            setSendErrorMessage('Failed to send messages.');
        } finally {
            setMessageSending(false);
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
                        onClick={showAddUserModal}
                        className="bulk-upload-button rightgap"
                    >
                        ➕ Add User
                    </button>
                    <button 
                        onClick={showBulkUploadModal}
                        className="bulk-upload-button rightgap"
                    >
                        📤 Bulk Upload Students
                    </button>
                    <button
                        onClick={openClassModal}
                        className="bulk-upload-button rightgap"
                    >
                        🏫 Manage Classes
                    </button>
                    <button
                        onClick={() => setMessageModalVisible(true)}
                        className="bulk-upload-button rightgap"
                    >
                        📧 Message Users
                    </button>
                    <span className="admin-actions-description">
                        Add individual users manually, upload multiple student accounts from CSV file, manage class options, or send messages to groups and individuals
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
                        <div className="filter-group">
                            <label>Status:</label>
                            <select
                                className="filter-select"
                                value={selectedStatusFilter}
                                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </select>
                        </div>
                    </div>
                    {(userFilter || departmentFilter || selectedFilterType !== 'all' || selectedStatusFilter !== 'all') && (
                        <div className="filter-summary">
                            Showing {filteredUsers.length} of {users.length} users
                            {userFilter && <span className="filter-tag"> Name/Email: &quot;{userFilter}&quot;</span>}
                            {departmentFilter && <span className="filter-tag"> Department: &quot;{departmentFilter}&quot;</span>}
                            {selectedFilterType !== 'all' && <span className="filter-tag"> of type: {selectedFilterType}</span>}
                            {selectedStatusFilter !== 'all' && <span className="filter-tag"> status: {selectedStatusFilter}</span>}
                            <button 
                                className="clear-filters leftgap"
                                onClick={() => {
                                    setUserFilter('');
                                    setDepartmentFilter('');
                                    setSelectedFilterType('all');
                                    setSelectedStatusFilter('all');
                                }}
                            >
                                Clear All Filters
                            </button>
                        </div>
                    )}
                </div>

                <div className="admin-table-wrapper">
                <table border="1" className="admin-user-table">
                    <thead>
                        <tr>
                            <th className="col-id">ID</th>
                            <th>User Name</th>
                            <th>Email</th>
                            <th>Class</th>
                            <th className="col-locale">Locale</th>
                            <th className="col-avatar">Avatar</th>
                            <th>Level</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id}>
                                <td className="col-id">{user.id}</td>
                                <td>{user.userName}</td>
                                <td>{user.email}</td>
                                <td>{user.userClass ?? user.userLocation ?? ''}</td>
                                <td className="col-locale">{user.userLocale}</td>
                                <td className="col-avatar"><img className="user-avatar" src={user.avatar || '/default_avatar.png'} alt={user.userName} /></td>
                                <td>{user.admin ? 'Admin' : 'User'}</td>
                                <td>
                                    {Number(user.is_active) === 0 ? 'Inactive' : 'Active'}
                                    {Number(user.is_active) !== 0 && Number(user.force_pw_change) === 1 && (
                                        <>
                                            <br />
                                            Password change requested
                                        </>
                                    )}
                                </td>
                                <td>
                                    <button className="admin-action-btn rightgap bottomgap admin-action-edit" onClick={() => showEditModal(user)}>Edit</button>
                                    {Number(user.is_active) !== 0 && (
                                        <button
                                            className="rightgap bottomgap admin-password-change-width admin-action-btn admin-action-require"
                                            onClick={() => handleForcePasswordChange(user)}
                                            disabled={Number(user.force_pw_change) === 1}
                                        >
                                            {Number(user.force_pw_change) === 1 ? 'Password Change Requested' : 'Require Password Change'}
                                        </button>
                                    )}
                                    {Number(user.is_active) !== 0 && <button className="rightgap bottomgap admin-action-btn admin-action-deactivate" onClick={() => showDeactivateConfirmation(user)}>Deactivate</button>}
                                    {Number(user.is_active) === 0 && <button className="rightgap bottomgap admin-action-btn admin-action-reactivate" onClick={() => showReactivateConfirmation(user)}>Reactivate</button>}
                                    <button className="rightgap bottomgap admin-action-btn admin-action-delete" onClick={() => showDeleteConfirmation(user)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
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

            {/* Deactivate Confirmation Modal */}
            {deactivateModalVisible && (
                <div className="modal">
                    <div className="modal-content">
                        <span
                            className="close"
                            onClick={handleDeactivateCancel}
                        >
                            &times;
                        </span>
                        <h2>Confirm Deactivation</h2>
                        <p>
                            Are you sure you want to deactivate user <strong>{userToDeactivate?.userName}</strong>?
                        </p>
                        <p>The user can no longer log in until reactivated.</p>
                        <div className="form-group-button">
                            <button
                                onClick={handleDeactivateConfirm}
                                className="delete-button-danger"
                            >
                                Deactivate
                            </button>
                            <button
                                onClick={handleDeactivateCancel}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reactivate Confirmation Modal */}
            {reactivateModalVisible && (
                <div className="modal">
                    <div className="modal-content">
                        <span
                            className="close"
                            onClick={handleReactivateCancel}
                        >
                            &times;
                        </span>
                        <h2>Confirm Reactivation</h2>
                        <p>
                            Are you sure you want to reactivate user <strong>{userToReactivate?.userName}</strong>?
                        </p>
                        <p>The user will be able to log in again.</p>
                        <div className="form-group-button">
                            <button
                                onClick={handleReactivateConfirm}
                                className="admin-action-btn admin-action-reactivate"
                            >
                                Reactivate
                            </button>
                            <button
                                onClick={handleReactivateCancel}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add User Modal */}
            {addModalVisible && (
                <div className="modal">
                    <div className="modal-content edit-modal-large">
                        <span 
                            className="close" 
                            onClick={handleAddCancel}
                        >
                            &times;
                        </span>
                        <h2>Add New User</h2>
                        <table border="1" className="edit-modal-table">
                            <tbody>
                                <tr>
                                    <td>Name *</td>
                                    <td>
                                        <input 
                                            type="text" 
                                            value={addForm.name} 
                                            onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="full-width-input"
                                            placeholder="Enter full name"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Email/Login *</td>
                                    <td>
                                        <input 
                                            type="email" 
                                            value={addForm.email} 
                                            onChange={e => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                                            className="full-width-input"
                                            placeholder="Enter email address"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Password *</td>
                                    <td>
                                        <input 
                                            type="password" 
                                            value={addForm.password} 
                                            onChange={e => setAddForm(prev => ({ ...prev, password: e.target.value }))}
                                            className="full-width-input"
                                            placeholder="Enter password"
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Class</td>
                                    <td>
                                        {classes.length > 0 ? (
                                            <select
                                                value={addForm.department}
                                                onChange={e => setAddForm(prev => ({ ...prev, department: e.target.value }))}
                                                className="full-width-input"
                                            >
                                                <option value="">Unassigned</option>
                                                {classes.map(classRecord => (
                                                    <option key={classRecord.id} value={classRecord.className}>{classRecord.className}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                value={addForm.department} 
                                                onChange={e => setAddForm(prev => ({ ...prev, department: e.target.value }))}
                                                className="full-width-input"
                                                placeholder="Enter class/department"
                                            />
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Admin Level</td>
                                    <td>
                                        <label className="admin-checkbox-container">
                                            <span className="leftgap"><input 
                                                type="checkbox" 
                                                checked={addForm.admin}
                                                onChange={e => setAddForm(prev => ({ ...prev, admin: e.target.checked }))}
                                            /></span>
                                            <span className="leftgap">{addForm.admin ? 'Administrator' : 'Regular User'}</span>
                                        </label>
                                    </td>
                                </tr>
                                <tr>
                                    <td>Locale</td>
                                    <td>
                                        <SelectLocale 
                                            config={config} 
                                            userLocale={addForm.locale} 
                                            setUserLocale={(locale) => setAddForm(prev => ({ ...prev, locale }))}
                                            setSendErrorMessage={setSendErrorMessage}
                                            setSendSuccessMessage={setSendSuccessMessage}
                                        />
                                    </td>
                                </tr>
                                <tr>
                                    <td>Avatar</td>
                                    <td>
                                        <AvatarManager 
                                            currentAvatar={addForm.avatar}
                                            onAvatarChange={handleAddAvatarChange}
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
                                            userAccess={addForm.userAccess}
                                            onAccessChange={handleAddAccessControlChange}
                                            setSendErrorMessage={setSendErrorMessage}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="form-group-button">
                            <button onClick={handleAddUser}>
                                Create User
                            </button>
                            <button 
                                onClick={handleAddCancel}
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
                                        {editForm.password.trim() !== '' && (
                                            <label className="admin-checkbox-container" style={{marginTop: '10px'}}>
                                                <span className="leftgap"><input 
                                                    type="checkbox" 
                                                    checked={editForm.sendCredentials}
                                                    onChange={e => setEditForm(prev => ({ ...prev, sendCredentials: e.target.checked }))}
                                                /></span>
                                                <span className="leftgap">Email new password to user (sends welcome email with login credentials)</span>
                                            </label>
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td>Class</td>
                                    <td>
                                        {classes.length > 0 ? (
                                            <select
                                                value={editForm.department}
                                                onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                                className="full-width-input"
                                            >
                                                <option value="">Unassigned</option>
                                                {availableClassOptions.map(classRecord => (
                                                    <option key={classRecord.id} value={classRecord.className}>{classRecord.className}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                value={editForm.department} 
                                                onChange={e => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                                                className="full-width-input"
                                            />
                                        )}
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
                                            <span className="leftgap">{editForm.admin ? 'Administrator (uncheck box to change)' : 'Regular User (check box to change)'}</span>
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

            {/* Class Management Modal */}
            {classModalVisible && (
                <div className="modal">
                    <div className="modal-content class-modal-large">
                        <span
                            className="close"
                            onClick={closeClassModal}
                        >
                            &times;
                        </span>
                        <h2>Manage Classes</h2>
                        <p className="class-manager-description">
                            Create and maintain the class list used for manual student class assignment.
                        </p>

                        <div className="class-manager-form-row">
                            <input
                                type="text"
                                value={classFormName}
                                onChange={(event) => setClassFormName(event.target.value)}
                                placeholder="Enter class name"
                                className="full-width-input"
                            />
                            <button onClick={handleSaveClass} className="leftgap">
                                {editingClass ? 'Update Class' : 'Create Class'}
                            </button>
                            {editingClass && (
                                <button onClick={resetClassForm} className="leftgap">
                                    Cancel Edit
                                </button>
                            )}
                        </div>

                        <table border="1" className="edit-modal-table topgap">
                            <thead>
                                <tr>
                                    <th>Class</th>
                                    <th>Assigned Users</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classes.length === 0 ? (
                                    <tr>
                                        <td colSpan={3}>No classes configured yet.</td>
                                    </tr>
                                ) : classes.map(classRecord => (
                                    <tr key={classRecord.id}>
                                        <td>{classRecord.className}</td>
                                        <td>{classRecord.assignedUsers}</td>
                                        <td>
                                            <button className="admin-action-btn admin-action-edit" onClick={() => handleEditClass(classRecord)}>
                                                Edit
                                            </button>
                                            <button
                                                className="leftgap admin-action-btn admin-action-delete"
                                                onClick={() => showDeleteClassConfirmation(classRecord)}
                                                title={Number(classRecord.assignedUsers) > 0
                                                    ? 'Reassign users before deleting this class.'
                                                    : 'Delete this class'}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {deleteClassModalVisible && (
                <div className="modal">
                    <div className="modal-content">
                        <span
                            className="close"
                            onClick={handleDeleteClassCancel}
                        >
                            &times;
                        </span>
                        <h2>Confirm Class Deletion</h2>
                        <p>
                            Are you sure you want to delete class <strong>{classToDelete?.className}</strong>?
                        </p>
                        <p>This action cannot be undone.</p>
                        {Number(classToDelete?.assignedUsers) > 0 && (
                            <p>This class still has assigned users and cannot be deleted until they are reassigned.</p>
                        )}
                        <div className="form-group-button">
                            <button
                                onClick={handleDeleteClass}
                                className="delete-button-danger"
                            >
                                Delete
                            </button>
                            <button
                                onClick={handleDeleteClassCancel}
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

            {/* Message Users Modal */}
            {messageModalVisible && (
                <div className="modal">
                    <div className="modal-content message-modal">
                        <span className="close" onClick={closeMessageModal}>&times;</span>
                        <h2>📧 Message Users</h2>

                        <div className="form-group">
                            <label><strong>Send to:</strong></label>
                            <select
                                className="filter-select"
                                value={messageTargetType}
                                onChange={(e) => {
                                    setMessageTargetType(e.target.value);
                                    setMessageSelectedIds([]);
                                    setMessageTargetClass('');
                                }}
                            >
                                <option value="active-students">All active students</option>
                                <option value="all-active">All active users (students + admins)</option>
                                <option value="by-class">A specific class</option>
                                <option value="individuals">Select individuals</option>
                            </select>
                        </div>

                        {messageTargetType === 'by-class' && (
                            <div className="form-group">
                                <label><strong>Class:</strong></label>
                                <select
                                    className="filter-select"
                                    value={messageTargetClass}
                                    onChange={(e) => setMessageTargetClass(e.target.value)}
                                >
                                    <option value="">-- Select a class --</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.className}>{c.className}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {messageTargetType === 'individuals' && (
                            <div className="form-group">
                                <label><strong>Select recipients:</strong></label>
                                <div className="message-individual-list">
                                    {users.filter(u => Number(u.is_active) !== 0).map(u => (
                                        <label key={u.id} className="message-individual-item">
                                            <input
                                                type="checkbox"
                                                checked={messageSelectedIds.includes(u.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setMessageSelectedIds(prev => [...prev, u.id]);
                                                    } else {
                                                        setMessageSelectedIds(prev => prev.filter(id => id !== u.id));
                                                    }
                                                }}
                                            />
                                            {u.userName} — {u.email}{u.userClass ? ` (${u.userClass})` : ''}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="message-recipient-count">
                            Will send to <strong>{messageRecipients.length}</strong> recipient{messageRecipients.length !== 1 ? 's' : ''}
                        </div>

                        <div className="form-group">
                            <label><strong>Subject:</strong></label>
                            <input
                                type="text"
                                className="filter-input"
                                value={messageSubject}
                                onChange={(e) => setMessageSubject(e.target.value)}
                                placeholder="Email subject..."
                            />
                        </div>

                        <div className="form-group">
                            <label><strong>Message:</strong></label>
                            <p className="message-hint">Use <code>{'{{NAME}}'}</code> to personalise with each recipient&apos;s name.</p>
                            <textarea
                                className="message-body-textarea"
                                rows={8}
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                                placeholder={'Dear {{NAME}},\n\n...'}
                            />
                        </div>

                        {messageResult && (
                            <div className={`bulk-upload-progress-container ${messageResult.failed > 0 ? 'bulk-upload-progress-error' : 'bulk-upload-progress-success'}`}>
                                {messageResult.message}
                            </div>
                        )}

                        <div className="form-group-button">
                            <button
                                onClick={handleSendMessage}
                                disabled={messageSending || messageRecipients.length === 0}
                                className="bulk-upload-submit-button"
                            >
                                {messageSending ? 'Sending…' : `Send to ${messageRecipients.length} recipient${messageRecipients.length !== 1 ? 's' : ''}`}
                            </button>
                            <button onClick={closeMessageModal} className="topgap" disabled={messageSending}>
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