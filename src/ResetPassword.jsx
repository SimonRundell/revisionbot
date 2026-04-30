import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Spin } from 'antd';

/****************************************************************************
 * ResetPassword Component
 * 
 * Validates a password reset token and allows the user to set a new password.
 * Intended for direct access from /reset-password?token=... without a router.
 * 
 * @param {Object} props
 * @param {Object} props.config
 * @param {Function} props.setSendSuccessMessage
 * @param {Function} props.setSendErrorMessage
 * @returns {JSX.Element}
 ****************************************************************************/

function ResetPassword({ config, setSendSuccessMessage, setSendErrorMessage }) {
    const token = useMemo(() => new URLSearchParams(window.location.search).get('token') || '', []);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [maskedEmail, setMaskedEmail] = useState('');
    const [tokenValid, setTokenValid] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setSendErrorMessage('Password reset token missing.');
                setIsLoading(false);
                return;
            }

            try {
                const response = await axios.post(
                    config.api + '/validateResetToken.php',
                    { token },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response.data.valid) {
                    setMaskedEmail(response.data.email || '');
                    setTokenValid(true);
                } else {
                    setSendErrorMessage(response.data.message || 'Token invalid or expired.');
                }
            } catch (error) {
                console.error('Reset token validation failed:', error);
                setSendErrorMessage(error.response?.data?.message || 'Unable to validate password reset token.');
            } finally {
                setIsLoading(false);
            }
        };

        validateToken();
    }, [config.api, setSendErrorMessage, token]);

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

        setIsSubmitting(true);

        try {
            const response = await axios.post(
                config.api + '/resetPassword.php',
                { token, password, confirmPassword },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data.success) {
                setSendSuccessMessage(response.data.message || 'Password updated.');
                window.location.href = '/';
                return;
            }

            setSendErrorMessage(response.data.message || 'Unable to update password.');
        } catch (error) {
            console.error('Password reset submit failed:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to update password.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-shell">
            {(isLoading || isSubmitting) && <div className="central-overlay-spinner">
                <div className="spinner-text">&nbsp;&nbsp;
                    <Spin size="large" />
                    {isLoading ? 'Validating link...' : 'Updating password...'}
                </div>
            </div>}

            <div className="auth-card">
                <h2>Set New Password</h2>

                {!isLoading && tokenValid ? (
                    <>
                        <p className="auth-copy">
                            Resetting password for <strong>{maskedEmail}</strong>.
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
                                <button type="submit">Update Password</button>
                                <button type="button" className="secondary-button" onClick={() => { window.location.href = '/'; }}>
                                    Back to Login
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    !isLoading && (
                        <div className="auth-actions">
                            <button type="button" onClick={() => { window.location.href = '/'; }}>
                                Back to Login
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default ResetPassword;