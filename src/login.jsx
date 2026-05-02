import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import axios from 'axios';
import Register from './register';
import ForgotPassword from './ForgotPassword.jsx';

/****************************************************************************
 * Login Component
 * Renders the login form for user authentication with email and password.
 * Displays a message of the day (MOTD) loaded from an external file.
 * Handles authentication with the API.
 * Registration function currently disabled, bulk upload used instead.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Function} props.setCurrentUser - Function to set current user state after successful login
 * @param {Function} props.setSendSuccessMessage - Function to set success messages in parent component
 * @param {Function} props.setSendErrorMessage - Function to set error messages in parent component
 * @returns {JSX.Element} The Login component
****************************************************************************/

const Login = ({ config, setCurrentUser, setSendSuccessMessage, setSendErrorMessage}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [motdContent, setMotdContent] = useState('Beta Test'); // Default fallback

  // Fetch MOTD content on component mount
  useEffect(() => {
    const fetchMotd = async () => {
      try {
        const response = await fetch('/MOTD.txt');
        if (response.ok) {
          const text = await response.text();
          setMotdContent(text.trim());
        }
      } catch (error) {
        // console.log('Could not load MOTD.txt, using default message');
        // console.log(error);
        setMotdContent("Beta Test");
      }
    };

    fetchMotd();
  }, []);

  /**
   * Handle login form submission
  * Sends the plaintext password to the API, which verifies either bcrypt or legacy MD5 hashes.
   * Sets current user on successful login or displays error message
   * 
   * @async
   * @param {Event} e - Form submission event
   * @returns {Promise<void>} Promise that resolves when login attempt is complete
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    // Convert email to lowercase for case-insensitive login
    const JSONData = { email: email.toLowerCase(), password };

    // console.log("JSONData:", JSONData);
    // console.log("API Endpoint:", config.api + '/getLogin.php');

    try {
      const response = await axios.post(config.api + '/getLogin.php', JSONData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      // console.log('Response:', data);

      // Handle the response data here
      if (data.status_code === 200) {
        const user = JSON.parse(data.message)[0]; // Parse the JSON string and get the first user object
        if (user) {
          setCurrentUser(user);
          setSendSuccessMessage(user.force_pw_change ? 'Login successful. Password change required.' : 'Login successful');
          setIsLoading(false);
        } else {
          setSendErrorMessage('User not found');
          setIsLoading(false);
        }
      } else {
        // Login failed
        setSendErrorMessage(data.message || 'Login failed');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      setSendErrorMessage(error.response?.data?.message || 'Network error. Please try again.');
  }
  };
  
  return (
    <>
      {isLoading && <div className="central-overlay-spinner">            
          <div className="spinner-text">&nbsp;&nbsp;
              <Spin size="large" />
              Logging in...
            </div> 
          </div>}
    
      {showForgotPassword ? (
        <ForgotPassword
          config={config}
          onBack={() => setShowForgotPassword(false)}
          setSendSuccessMessage={setSendSuccessMessage}
          setSendErrorMessage={setSendErrorMessage}
        />
      ) : showRegister ? (
        <Register config={config} setShowRegister={setShowRegister}
        setSendErrorMessage={setSendErrorMessage} setSendSuccessMessage={setSendSuccessMessage} />
      ) : (
        <>
          {/* Title image */}
          <div className="login-title">
            <img src="/title_bw.png" alt="AI Revision Bot" />
          </div>
          
          <div className="login-container">
            {/* Robot image positioned over the login box */}
            <div className="login-robot">
              <img src="/airevisionbot_bw_transparent_background.png" alt="AI Robot" />
            </div>
            
            <div className="login-header">
            </div>
            <div className="login-form">
              <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>eMail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                />
              </div>
              <div className='form-group'>
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              <div className='form-group-button'>
                <button type="submit">Login</button>
              </div>
            </form>
              <div className="login-link-row">
                <button type="button" className="link-button little-button" onClick={() => setShowForgotPassword(true)}>
                  Forgot password?
                </button>
              </div>
              {/* <div className="topgap">
                <button onClick={() => setShowRegister(true)} className="little-button">
                  Register
                </button>
              </div> */}
            </div>
            <div className="motd" dangerouslySetInnerHTML={{ __html: motdContent }} />
          </div>
        </>
      )}
    </>
  );
};

export default Login;