import { useState } from 'react';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import SelectLocale from './SelectLocale';
import { parseApiResponse } from './utils/apiHelpers';

function Register({ config, setShowRegister, setSendErrorMessage, setSendSuccessMessage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [userLocation, setUserLocation] = useState('');
    const [userLocale, setUserLocale] = useState('en-GB');
    const [avatar, setAvatar] = useState('/default_avatar.png');
    const [admin, setAdmin] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (email === '' || password === '' || userName === '') {
            setSendErrorMessage('Please fill in all fields');
            return;
        }

        // Use MD5 hashing of entered password
        const passwordHash = CryptoJS.MD5(password).toString();

        const jsonData = {  
            email: email, 
            passwordHash: passwordHash, 
            userName: userName, 
            userLocation: userLocation,
            userLocale: userLocale, // Use state variable for locale
            avatar: avatar,
            admin: admin ? 1 : 0
        };

        console.log("JSONData (secure registration):", { 
            email: jsonData.email, 
            userName: jsonData.userName,
            hasClientHash: !!jsonData.clientHash 
        });
        
        try {
            const response = await axios.post(config.api + '/InsertUser.php', jsonData);
            
            const parsedData = parseApiResponse(
                response.data,
                null, // We'll handle success manually
                setSendErrorMessage,
                'Registration successful',
                'Registration failed'
            );

            if (parsedData !== null) {
                setSendSuccessMessage('Registration successful');
                sendRegisterEmail(email, password);
                setShowRegister(false);
            }
        } catch (error) {
            console.error('Registration error:', error);
            setSendErrorMessage('Network error. Please try again.');
        }
    };

    const sendRegisterEmail = async (email, password) => {
    
    const link = `${config.api}/validateEmail.php?email=${email}&hash=${CryptoJS.MD5(password).toString()}`;
    console.log("Validation link:", link);
    const htmlRegister = await fetch('/templates/registration.html').then(res => res.text());

    const emailData = {
        email: email,
        userName: userName,
        htmlTemplate: htmlRegister,
        link: link
    };

    console.log("Email Data:", emailData);

    // EMAIL SENDING DISABLED - Skip email verification for now
    console.log("Email sending disabled - would send:", emailData);
    setSendSuccessMessage("Registration completed successfully. Email verification disabled.");
    setShowRegister(false);
    
    // ORIGINAL EMAIL CODE COMMENTED OUT
    /*
    try {
        const response = await axios.post(config.api + '/sendValidateEmail.php', emailData);
        if (response.data.status_code === 200) {
            console.log("Email sent successfully:", response.data.message);
            setSendSuccessMessage("Registration email sent successfully. Please check your inbox.");
            setShowRegister(false);
        }   else { 
            console.error("Failed to send registration email:", response.data.message);
            setSendErrorMessage(response.data.message);
        }
    } catch (error) {
        console.error("Error sending email:", error);
        setSendErrorMessage('Error sending registration email');
    }
    */
};

    return (
        <>

            <div className="login-container">

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
                        <div className='form-group'>
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Full Name"
                            />
                        </div>
                        <div className='form-group'>
                            <label>Class</label>
                            <input
                                type="text"
                                value={userLocation}
                                onChange={(e) => setUserLocation(e.target.value)}
                                placeholder="Class"
                            />
                        </div>
                        <div className='form-group'>
                            <label>Locale</label>
                            <SelectLocale config={config} userLocale={userLocale} setUserLocale={setUserLocale} setSendErrorMessage={setSendErrorMessage} setSendSuccessMessage={setSendSuccessMessage} />
                        </div>
                        <div className='form-group-button'>
                            <button type="submit">Register</button>
                            <button type="button" className="smalltop" onClick={() => setShowRegister(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            </div> 
        </>
    );
}

export default Register;