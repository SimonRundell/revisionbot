import {useState} from 'react'
import axios from 'axios'
import {Drawer, Spin} from 'antd'
import CryptoJS from 'crypto-js'
import SelectLocale from './SelectLocale'
import AvatarManager from './AvatarManager'
import { parseApiResponse } from './utils/apiHelpers'

/****************************************************************************
 * AccountManager Component
 * Renders the account information and management options for the current user.
 * Provides functionality for password reset, profile updates, avatar management, and locale settings.
 * For student accounts (admin === 0), name, email, and department fields are read-only;
 * only password and avatar may be changed by the student themselves.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Object} props.currentUser - Current user object with profile information and authentication
 * @param {Function} props.setCurrentUser - Function to update current user state in parent component
 * @param {Function} props.setSendSuccessMessage - Function to set success messages in parent component
 * @param {Function} props.setSendErrorMessage - Function to set error messages in parent component
 * @param {Function} props.setShowAccountManager - Function to control account manager visibility
 * @param {boolean} props.showAccountManager - Boolean indicating if account manager should be visible
 * @returns {JSX.Element} The AccountManager component
****************************************************************************/

function AccountManager({config, currentUser, setCurrentUser, setSendSuccessMessage, setSendErrorMessage,
                        setShowAccountManager, showAccountManager}) {

    const [name, setName] = useState(currentUser.userName)
    const [eMail, setEmail] = useState(currentUser.email)
    const [password, setPassword] = useState('')
    const [department, setDepartment] = useState(currentUser.userLocation)
    const [locale, setLocale] = useState(currentUser.userLocale)
    const [avatar, setAvatar] = useState(currentUser.avatar)
    const [admin] = useState(currentUser.admin)
    const [isLoading, setIsLoading] = useState(false)
    
    /**
     * Handle avatar change from AvatarManager component
     * Updates the local avatar state with new avatar data
     * 
     * @param {string} newAvatar - Base64 encoded avatar data or avatar path
     */
    const handleAvatarChange = (newAvatar) => {
        setAvatar(newAvatar);
    };

    /**
     * Close the account manager drawer
     * Sets the visibility state to false
     */
    const onClose = () => {
        setShowAccountManager(false);
    }

    /**
     * Update user account information
     * Hashes password if changed and submits updated profile to API
     * Updates current user context on successful update
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when account update is complete
     */
    const updateAccount = async () => {
        setIsLoading(true);

        // Hash new password if provided
        let new_password = '';
        if (password.trim() !== '') {
            new_password = CryptoJS.MD5(password).toString();
        } else {
            new_password = currentUser.passwordHash; // Keep existing hash if no new password
        }

        const jsonData = {
            id: currentUser.id,
            userName: name,
            passwordHash: new_password,
            email: eMail,
            userLocation: department,
            userLocale: locale,
            avatar: avatar,
            admin: admin,
            userAccess: currentUser.userAccess || '' // Preserve existing access permissions, default to empty string
        };
        // console.log("updating user with ", jsonData)

        try {
            const response = await axios.post(config.api + '/updateUser.php', jsonData, {
                headers: { 'Content-Type': 'application/json' }
            });

            const parsedData = parseApiResponse(
                response.data,
                null, // We'll handle success manually
                setSendErrorMessage,
                'User details updated.',
                'Failed to update user details'
            );

            if (parsedData !== null) {
                setSendSuccessMessage('User details updated.');
                
                // Send password change notification if password was changed
                if (password.trim() !== '') {
                    try {
                        await axios.post(config.api + '/sendPasswordChangeNotification.php', {
                            email: eMail,
                            userName: name,
                            changedBy: 'user'
                        }, {
                            headers: { 'Content-Type': 'application/json' }
                        });
                        console.log('Password change notification sent successfully');
                    } catch (notificationError) {
                        console.error('Failed to send password change notification:', notificationError);
                        // Don't fail the main operation if notification fails
                    }
                }
                
                // set currentUser with new details
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    userName: name,
                    email: eMail,
                    userLocation: department,
                    userLocale: locale,
                    avatar: avatar,
                    admin: admin
                }));
            }
        } catch (error) {
            console.error('Error updating user:', error);
            setSendErrorMessage('Network error. Please try again.');
        } finally {
            setIsLoading(false);
            setPassword(''); // Clear password field after update
            setShowAccountManager(false);
        }
    }

    return (
<>
        {isLoading && <div className="central-overlay-spinner">
                <div className="spinner-text">&nbsp;&nbsp;
                    <Spin size="large" />
                    Processing...
                </div>
            </div>}
        <Drawer
                title={"Account Manager for " + currentUser.userName}
                closable={{ 'aria-label': 'Close Button' }}
                onClose={onClose}
                open={showAccountManager}
                width={'99%'}>
            <table border="1">
                <tbody>
                    <tr>
                        <td>Name</td>
                        <td><input type="text" value={name} onChange={e => setName(e.target.value)} disabled={admin === 0} title={admin === 0 ? "Student profile name cannot be changed" : ""} /></td>
                    </tr>
                    <tr>
                        <td>Email/Login</td>
                        <td><input type="text" value={eMail} onChange={e => setEmail(e.target.value)} disabled={admin === 0} title={admin === 0 ? "Student email cannot be changed" : ""} /></td>
                    </tr>
                    <tr>
                        <td>New Password</td>
                        <td><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></td>
                    </tr>
                    <tr>
                        <td>Department</td>
                        <td><input type="text" value={department} onChange={e => setDepartment(e.target.value)} disabled={admin === 0} title={admin === 0 ? "Student department cannot be changed" : ""} /></td>
                    </tr>
                    <tr>
                        <td>Locale</td>
                        <td><SelectLocale config={config} userLocale={locale} setUserLocale={setLocale} 
                            setSendErrorMessage={setSendErrorMessage}
                            setSendSuccessMessage={setSendSuccessMessage}/></td>
                    </tr>
                    <tr>
                        <td>Avatar</td>
                        <td>
                            <AvatarManager 
                                currentAvatar={avatar}
                                onAvatarChange={handleAvatarChange}
                                setSendErrorMessage={setSendErrorMessage}
                                size={60}
                            />
                        </td>
                    </tr>
                    <tr>
                        <td colSpan={2}>
                            <button onClick={updateAccount}>Update Account</button>
                            &nbsp;&nbsp;
                            <button onClick={onClose}>Close</button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </Drawer>
</>
    )
}

export default AccountManager