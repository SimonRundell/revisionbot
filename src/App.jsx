import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { message, Spin } from 'antd';
import Login from './login.jsx';
import CMFloatAd from './cmFloatAd.jsx';
import AccountManager from './accountManager.jsx';  
import AccountBlock from './accountBlock.jsx';
import AdminManager from './adminManager.jsx';
import Menu from './menu.jsx';
import AdminSubjects from './adminSubjects.jsx';
import StudentInterface from './StudentInterface.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import PastAnswersViewer from './PastAnswersViewer.jsx';
import AnalyticsModule from './AnalyticsModule.jsx';
import StudentProgress from './StudentProgress.jsx';
import ResetPassword from './ResetPassword.jsx';
import ForcePasswordChange from './ForcePasswordChange.jsx';

const AUTH_STORAGE_KEY = 'revisionbot_auth_session';
const AUTH_TTL_MS = 120 * 60 * 1000;
const AUTH_WARNING_MS = 5 * 60 * 1000;
const AUTH_TICK_MS = 15000;

/****************************************************************************
 * App Component
 * Main application component that manages global state and routing.
 * Handles user authentication, configuration loading, and message display.
 * Controls visibility of different application modes and manages the overall layout.
 * 
 * @returns {JSX.Element} The main App component with conditional rendering based on auth state
****************************************************************************/

function App() {
  const currentPath = window.location.pathname;
  const [config, setConfig] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [currentUser, setCurrentUser] = useState(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [sessionExpiresAt, setSessionExpiresAt] = useState(null);
  const [sessionTimeLeftMs, setSessionTimeLeftMs] = useState(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState(false);
  const [sendErrorMessage, setSendErrorMessage] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showAdminManager, setShowAdminManager] = useState(false);
  const [quizBuilder, setQuizBuilder] = useState(false);
  const [studentMode, setStudentMode] = useState(false);
  const [progressMode, setProgressMode] = useState(false);
  const [dashboard, setDashboard] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    // Restore persisted login if the session has not expired.
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        setAuthHydrated(true);
        return;
      }

      const session = JSON.parse(raw);
      const expiresAt = Number(session?.expiresAt || 0);
      const user = session?.user || null;

      if (!user || !expiresAt || Date.now() >= expiresAt) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setSessionExpiresAt(null);
        setSessionTimeLeftMs(null);
        setAuthHydrated(true);
        return;
      }

      setCurrentUser(user);
      setSessionExpiresAt(expiresAt);
      setSessionTimeLeftMs(expiresAt - Date.now());
    } catch (error) {
      console.error('Error restoring auth session:', error);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setSessionExpiresAt(null);
      setSessionTimeLeftMs(null);
    } finally {
      setAuthHydrated(true);
    }
  }, []);

  useEffect(() => {
    // Persist or clear auth session after initial hydration.
    if (!authHydrated) {
      return;
    }

    if (!currentUser) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setSessionExpiresAt(null);
      setSessionTimeLeftMs(null);
      return;
    }

    const expiresAt = Date.now() + AUTH_TTL_MS;
    const session = {
      user: currentUser,
      expiresAt,
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    setSessionExpiresAt(expiresAt);
    setSessionTimeLeftMs(expiresAt - Date.now());
  }, [currentUser, authHydrated]);

  useEffect(() => {
    if (!currentUser || !sessionExpiresAt) {
      return;
    }

    const updateTimeLeft = () => {
      const remaining = sessionExpiresAt - Date.now();
      if (remaining <= 0) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setSessionExpiresAt(null);
        setSessionTimeLeftMs(0);
        setCurrentUser(null);
        setSendErrorMessage('Your session has expired. Please log in again.');
        return;
      }

      setSessionTimeLeftMs(remaining);
    };

    updateTimeLeft();
    const intervalId = window.setInterval(updateTimeLeft, AUTH_TICK_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [currentUser, sessionExpiresAt]);

  const formatSessionTime = (timeMs) => {
    if (!timeMs || timeMs <= 0) {
      return '00:00';
    }

    const totalSeconds = Math.ceil(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const showSessionWarning = !!(
    currentUser &&
    sessionTimeLeftMs !== null &&
    sessionTimeLeftMs > 0 &&
    sessionTimeLeftMs <= AUTH_WARNING_MS
  );


  useEffect(() => {
    // Add cache busting parameter to force fresh config load
    const timestamp = new Date().getTime();
    axios.get(`/.config.json?t=${timestamp}`)
      .then(response => {
        setConfig(response.data);
        // console.log('Config loaded:', response.data);
        messageApi.success('Welcome to the AI Revision Bot!');
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        messageApi.error('Error fetching config');
      });
  }, [messageApi]);

useEffect(() => {
    if (sendSuccessMessage) {
       messageApi.success(sendSuccessMessage);
    }
      setSendSuccessMessage(false);
    
  }, [sendSuccessMessage, messageApi]);

  useEffect(() => {
    if (sendErrorMessage) {
      messageApi.error(sendErrorMessage);
    }
  }, [sendErrorMessage, messageApi]);

  useEffect(() => {
    if (!currentUser) {
      setQuizBuilder(false);
      setStudentMode(false);
      setProgressMode(false);
      setDashboard(false);
      return;
    }

    if (currentUser.admin === 1) {
      setDashboard(false);
    } else {
      setQuizBuilder(false);
      setStudentMode(false);
      setProgressMode(false);
      setDashboard(true);
    }
  }, [currentUser]);


  return (
    <>
    {contextHolder}
    { (!config || !authHydrated) && <Spin size="large" /> }
    { config && !currentUser && currentPath === '/reset-password' && (
      <div className="App">
        <ResetPassword
          config={config}
          setSendSuccessMessage={setSendSuccessMessage}
          setSendErrorMessage={setSendErrorMessage}
        />
      </div>
      )}
    { config && !currentUser && currentPath !== '/reset-password' && (
      <div className="App">
        <Login config={config} setCurrentUser={setCurrentUser} 
                setSendSuccessMessage={setSendSuccessMessage} 
                setSendErrorMessage={setSendErrorMessage} />
      </div>
      )}
    { currentUser && currentUser.force_pw_change === 1 && (
      <div className="App">
        <ForcePasswordChange
          config={config}
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          setSendSuccessMessage={setSendSuccessMessage}
          setSendErrorMessage={setSendErrorMessage}
        />
      </div>
      )}
    { currentUser && currentUser.force_pw_change !== 1 && (
      <div className="App">

        <div className="app-header">
          {/* Logo Section */}
          <div className="app-logo-section">
            <div className="app-title-image">
              <img src="/logo_bw_long_2.png" alt="AI Exam Revision Robot" />
            </div>
            <div className="app-robot">
              <img src="/airevisionbot_bw_transparent_background.png" alt="AI Robot" />
            </div>
          </div>
          
          {/* Horizontal Steampunk Menus */}
          <div className="steampunk-menu-bar">
            <AccountBlock config={config}
                            currentUser={currentUser} 
                            setCurrentUser={setCurrentUser}
                            setShowAccountManager={setShowAccountManager} 
                            showAccountManager={showAccountManager}
                            showAdminManager={showAdminManager}
                            setShowAdminManager={setShowAdminManager} />
                    
              <Menu quizBuilder={quizBuilder} setQuizBuilder={setQuizBuilder} 
                    studentMode={studentMode} setStudentMode={setStudentMode}
                  progressMode={progressMode} setProgressMode={setProgressMode}
                    dashboard={dashboard} setDashboard={setDashboard}
                    analytics={analytics} setAnalytics={setAnalytics}
                    currentUser={currentUser} />
        </div>
        </div>

        {showSessionWarning && (
          <div className="session-expiry-banner" role="status" aria-live="polite">
            Session expires in {formatSessionTime(sessionTimeLeftMs)}. Save your work to avoid losing progress.
          </div>
        )}

        {showAccountManager && (

            <AccountManager config={config} currentUser={currentUser}
                            setCurrentUser={setCurrentUser}
                            setSendSuccessMessage={setSendSuccessMessage}
                            setSendErrorMessage={setSendErrorMessage}
                            setShowAccountManager={setShowAccountManager}
                            showAccountManager={showAccountManager} />
        )}

        {showAdminManager && currentUser.admin===1 &&(

            <AdminManager config={config} currentUser={currentUser}
                            setSendSuccessMessage={setSendSuccessMessage}
                            setSendErrorMessage={setSendErrorMessage}
                            setShowAdminManager={setShowAdminManager}
                            showAdminManager={showAdminManager} />
        )}

      {quizBuilder && currentUser.admin === 1 && !dashboard && (
        <AdminSubjects config={config} currentUser={currentUser} 
                       setSendErrorMessage={setSendErrorMessage}
                       setSendSuccessMessage={setSendSuccessMessage} /> 
      )}

      {dashboard && (
        currentUser.admin === 1 ? (
          <AdminDashboard 
            config={config}
            currentUser={currentUser}
            setSendErrorMessage={setSendErrorMessage}
            setSendSuccessMessage={setSendSuccessMessage}
          />
        ) : (
          <PastAnswersViewer 
            userId={currentUser.id}
            currentUser={currentUser}
            config={config}
            setSendErrorMessage={setSendErrorMessage}
            setSendSuccessMessage={setSendSuccessMessage}
          />
        )
      )}

      {analytics && currentUser.admin === 1 && (
        <AnalyticsModule 
          config={config}
          currentUser={currentUser}
          setSendErrorMessage={setSendErrorMessage}
          setSendSuccessMessage={setSendSuccessMessage}
        />
      )}

      {studentMode && !dashboard && !analytics && (

      <>     
        <StudentInterface 
          userId={currentUser.id}
          // onBack={() => setStudentMode(false)}
          config={config}
          currentUser={currentUser}
          setSendErrorMessage={setSendErrorMessage}
          setSendSuccessMessage={setSendSuccessMessage}
        />
        </>
      )}

      {progressMode && !dashboard && !analytics && !studentMode && currentUser.admin !== 1 && (
        <StudentProgress
          userId={currentUser.id}
          config={config}
          currentUser={currentUser}
          setSendErrorMessage={setSendErrorMessage}
        />
      )}

      {!quizBuilder && !studentMode && !dashboard && currentUser.admin === 1 && (
        <AdminDashboard 
          config={config}
          currentUser={currentUser}
          setSendErrorMessage={setSendErrorMessage}
          setSendSuccessMessage={setSendSuccessMessage}
        />
      )}


      </div>
      )}
	<CMFloatAd color='#ffffff' bgColor='#242424'/>
    </>
  )
}

export default App
