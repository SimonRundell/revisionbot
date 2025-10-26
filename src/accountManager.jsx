import {useState} from 'react'
import axios from 'axios'
import {Drawer, Spin} from 'antd'
import CryptoJS from 'crypto-js'
import SelectLocale from './SelectLocale'
import AvatarManager from './AvatarManager'
import { parseApiResponse } from './utils/apiHelpers'

/****************************************************************
 * AccountManager Component
 * Renders the account information and management options for the user.
 * ie Password reset etc.
*****************************************************************/

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
    
    // Handle avatar change from AvatarManager component
    const handleAvatarChange = (newAvatar) => {
        setAvatar(newAvatar);
    };

    const onClose = () => {
        setShowAccountManager(false);
    }

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
            admin: admin
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
                        <td><input type="text" value={name} onChange={e => setName(e.target.value)} /></td>
                    </tr>
                    <tr>
                        <td>Email/Login</td>
                        <td><input type="text" value={eMail} onChange={e => setEmail(e.target.value)} /></td>
                    </tr>
                    <tr>
                        <td>New Password</td>
                        <td><input type="password" value={password} onChange={e => setPassword(e.target.value)} /></td>
                    </tr>
                    <tr>
                        <td>Department</td>
                        <td><input type="text" value={department} onChange={e => setDepartment(e.target.value)} /></td>
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