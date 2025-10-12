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



function App() {
  const [config, setConfig] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [currentUser, setCurrentUser] = useState(null);
  const [sendSuccessMessage, setSendSuccessMessage] = useState(false);
  const [sendErrorMessage, setSendErrorMessage] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showAdminManager, setShowAdminManager] = useState(false);
  const [quizBuilder, setQuizBuilder] = useState(false);
  const [studentMode, setStudentMode] = useState(false);


  useEffect(() => {
    // Add cache busting parameter to force fresh config load
    const timestamp = new Date().getTime();
    axios.get(`/.config.json?t=${timestamp}`)
      .then(response => {
        setConfig(response.data);
        console.log('Config loaded:', response.data);
        messageApi.success('Config loaded');
      })
      .catch(error => {
        console.error('Error fetching config:', error);
        messageApi.error('Error fetching config');
      });
  }, []);

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


  return (
    <>
    {contextHolder}
    { !config && <Spin size="large" /> }
    { config && !currentUser && (
      <div className="App">
        <Login config={config} setCurrentUser={setCurrentUser} 
                setSendSuccessMessage={setSendSuccessMessage} 
                setSendErrorMessage={setSendErrorMessage} />
      </div>
      )}
    { currentUser && (
      <div className="App">

        <div className="app-header">
          <div className="app-header-menu">
            <h1>AI Exam Revision Robot</h1>
            <Menu quizBuilder={quizBuilder} setQuizBuilder={setQuizBuilder} 
                  studentMode={studentMode} setStudentMode={setStudentMode}
                  currentUser={currentUser} />
        </div>
        <AccountBlock config={config}
                      currentUser={currentUser} 
                      setCurrentUser={setCurrentUser}
                      setShowAccountManager={setShowAccountManager} 
                      showAccountManager={showAccountManager}
                      showAdminManager={showAdminManager}
                      setShowAdminManager={setShowAdminManager} />
        
        </div>

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

      {quizBuilder && currentUser.admin === 1 && (
        <AdminSubjects config={config} currentUser={currentUser} 
                       setSendErrorMessage={setSendErrorMessage}
                       setSendSuccessMessage={setSendSuccessMessage} /> 
      )}

      {studentMode && (
        <StudentInterface 
          userId={currentUser.id}
          onBack={() => setStudentMode(false)}
          config={config}
          currentUser={currentUser}
          setSendErrorMessage={setSendErrorMessage}
          setSendSuccessMessage={setSendSuccessMessage}
        />
      )}

      {!quizBuilder && !studentMode && currentUser.admin === 1 && (
        <AdminDashboard 
          config={config}
          currentUser={currentUser}
          setSendErrorMessage={setSendErrorMessage}
          setSendSuccessMessage={setSendSuccessMessage}
        />
      )}
      </div>

      )}
	<CMFloatAd color='#ffffff' />
    </>
  )
}

export default App
