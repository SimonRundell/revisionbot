import { useState } from 'react';
import axios from 'axios';
import { Spin } from 'antd';

/****************************************************************************
 * ForgotPassword Component
 * 
 * Requests a password reset email for the supplied account address.
 * Uses the generic-success backend response so account existence is not exposed.
 * 
 * @param {Object} props
 * @param {Object} props.config
 * @param {Function} props.onBack
 * @param {Function} props.setSendSuccessMessage
 * @param {Function} props.setSendErrorMessage
 * @returns {JSX.Element}
 ****************************************************************************/

function ForgotPassword({ config, onBack, setSendSuccessMessage, setSendErrorMessage }) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        try {
            const response = await axios.post(
                config.api + '/requestPasswordReset.php',
                { email: email.trim().toLowerCase() },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            setSendSuccessMessage(response.data.message || 'If that email exists, a reset link has been sent.');
            onBack();
        } catch (error) {
            console.error('Forgot password request failed:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to request a password reset right now.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-shell">
            {isLoading && <div className="central-overlay-spinner">
                <div className="spinner-text">&nbsp;&nbsp;
                    <Spin size="large" />
                    Sending reset link...
                </div>
            </div>}

            <div className="auth-card">
                <h2>Password Reset</h2>
                <p className="auth-copy">
                    Enter your account email and, if it exists, we will send a reset link that expires in 60 minutes.
                </p>

                <form onSubmit={handleSubmit} className="auth-form-stack">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="Email"
                            required
                        />
                    </div>

                    <div className="auth-actions">
                        <button type="submit">Send Reset Link</button>
                        <button type="button" className="secondary-button" onClick={onBack}>Back to Login</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ForgotPassword;