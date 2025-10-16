import {useState} from 'react'
import axios from 'axios'
import {Drawer, Spin} from 'antd'
import CryptoJS from 'crypto-js'
import SelectLocale from './SelectLocale'
import { parseApiResponse } from './utils/apiHelpers'

function AccountManager({config, currentUser, setCurrentUser, setSendSuccessMessage, setSendErrorMessage,
                        setShowAccountManager, showAccountManager}) {

    const [name, setName] = useState(currentUser.userName)
    const [eMail, setEmail] = useState(currentUser.email)
    const [password, setPassword] = useState('')
    const [department, setDepartment] = useState(currentUser.userLocation)
    const [locale, setLocale] = useState(currentUser.userLocale)
    const [avatar, setAvatar] = useState(currentUser.avatar)
    const [admin, setAdmin] = useState(currentUser.admin)
    const [isLoading, setIsLoading] = useState(false)
    const [avatarPreview, setAvatarPreview] = useState(currentUser.avatar || '/default_avatar.png')
    
    // Handle file selection and convert to base64
    const handleAvatarChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            // Check file size (limit to 5MB)
            if (file.size > 5 * 1024 * 1024) {
                setSendErrorMessage('Image file size must be less than 5MB');
                return;
            }
            
            // Check file type
            if (!file.type.startsWith('image/')) {
                setSendErrorMessage('Please select an image file');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64String = e.target.result;
                setAvatar(base64String);
                setAvatarPreview(base64String);
            };
            reader.onerror = () => {
                setSendErrorMessage('Error reading image file');
            };
            reader.readAsDataURL(file);
        }
    };
    
    // Reset avatar to default
    const resetAvatar = () => {
        setAvatar(null);
        setAvatarPreview('/default_avatar.png'); // Default avatar
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
        console.log("updating user with ", jsonData)

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <img 
                                    className="avatar" 
                                    src={avatarPreview || '/default_avatar.png'} 
                                    alt="Avatar" 
                                    style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                                />
                                <div>
                                    <div className="file-input-wrapper" style={{ marginBottom: '5px' }}>
                                        <input 
                                            type="file" 
                                            id="avatar-upload"
                                            className="file-input-hidden"
                                            accept="image/*" 
                                            onChange={handleAvatarChange}
                                        />
                                        <label htmlFor="avatar-upload" className="file-input-button">
                                            Choose Image
                                        </label>
                                    </div>
                                    <br />
                                    <button 
                                        type="button" 
                                        onClick={resetAvatar}
                                        style={{ fontSize: '12px', padding: '2px 8px' }}
                                    >
                                        Reset to Default
                                    </button>
                                </div>
                            </div>
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