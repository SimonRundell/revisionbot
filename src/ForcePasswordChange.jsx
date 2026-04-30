import { useState } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { createJsonHeaders } from './utils/apiHeaders';

/****************************************************************************
 * ForcePasswordChange Component
 * 
 * Blocks access until a user flagged with force_pw_change sets a new password.
 * Uses updateUser.php so the existing account update path clears the flag.
 * 
 * @param {Object} props
 * @param {Object} props.config
 * @param {Object} props.currentUser
 * @param {Function} props.setCurrentUser
 * @param {Function} props.setSendSuccessMessage
 * @param {Function} props.setSendErrorMessage
 * @returns {JSX.Element}
 ****************************************************************************/

function ForcePasswordChange({
    config,
    currentUser,
    setCurrentUser,
    setSendSuccessMessage,
    setSendErrorMessage,
}) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (password.length < 8) {
            setSendErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setSendErrorMessage('Passwords do not match.');
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                id: currentUser.id,
                userName: currentUser.userName,
                email: currentUser.email,
                userClass: currentUser.userClass,
                userLocale: currentUser.userLocale,
                avatar: currentUser.avatar,
                admin: currentUser.admin,
                userAccess: currentUser.userAccess || '',
                password,
            };

            const response = await axios.post(config.api + '/updateUser.php', payload, {
                headers: createJsonHeaders(currentUser),
            });

            if (response.data.status_code === 200) {
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    force_pw_change: 0,
                }));
                setSendSuccessMessage('Password updated.');
            } else {
                setSendErrorMessage(response.data.message || 'Unable to update password.');
            }
        } catch (error) {
            console.error('Forced password change failed:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to update password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-shell force-change-shell">
            {isLoading && <div className="central-overlay-spinner">
                <div className="spinner-text">&nbsp;&nbsp;
                    <Spin size="large" />
                    Updating password...
                </div>
            </div>}

            <div className="auth-card">
                <h2>Password Change Required</h2>
                <p className="auth-copy">
                    Your account has been marked to require a new password before you can continue.
                </p>

                <form onSubmit={handleSubmit} className="auth-form-stack">
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Minimum 8 characters"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            placeholder="Repeat your new password"
                            required
                        />
                    </div>

                    <div className="auth-actions">
                        <button type="submit">Save New Password</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ForcePasswordChange;