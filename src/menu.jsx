/****************************************************************************
 * Menu Component
 * Renders the navigation menu for the application.
 * Includes buttons for different modes (quiz builder, student, dashboard, analytics).
 * Admin users see additional Quiz Builder and Analytics options.
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.quizBuilder - Current state of quiz builder mode
 * @param {Function} props.setQuizBuilder - Function to set quiz builder mode state
 * @param {boolean} props.studentMode - Current state of student mode
 * @param {Function} props.setStudentMode - Function to set student mode state
 * @param {Object} props.currentUser - Current user object with admin status
 * @param {boolean} props.dashboard - Current state of dashboard mode
 * @param {Function} props.setDashboard - Function to set dashboard mode state
 * @param {boolean} props.analytics - Current state of analytics mode
 * @param {Function} props.setAnalytics - Function to set analytics mode state
 * @returns {JSX.Element} The Menu component
****************************************************************************/

function Menu ({quizBuilder, setQuizBuilder, studentMode, setStudentMode, currentUser, dashboard, setDashboard, analytics, setAnalytics, progressMode, setProgressMode}) {

    /**
     * Handle mode switching between different application modes
     * Sets the appropriate mode state and clears others
     * 
     * @param {string} mode - The mode to switch to ('admin', 'student', 'dashboard', 'analytics')
     */
    const handleModeSwitch = (mode) => {
        setQuizBuilder(mode === 'admin');
        setStudentMode(mode === 'student');
        setDashboard(mode === 'dashboard');
        setAnalytics(mode === 'analytics');
        setProgressMode(mode === 'progress');
    };

    return (
        <div className="menu">
            {currentUser?.admin === 1 && (
                <button 
                    onClick={() => handleModeSwitch('admin')}
                    className={quizBuilder && !studentMode && !dashboard && !analytics ? 'active' : ''}
                >
                    Quiz Builder
                </button>
            )}
            <button 
                onClick={() => handleModeSwitch('student')}
                className={studentMode ? 'active' : ''}
            >
                Questions
            </button>
            {currentUser?.admin !== 1 && (
                <button
                    onClick={() => handleModeSwitch('progress')}
                    className={progressMode ? 'active' : ''}
                >
                    My Progress
                </button>
            )}
            <button 
                onClick={() => handleModeSwitch('dashboard')}
                className={dashboard ? 'active' : ''}
            >
                Dashboard
            </button>
            {currentUser?.admin === 1 && (
                <button 
                    onClick={() => handleModeSwitch('analytics')}
                    className={analytics ? 'active' : ''}
                >
                    Analytics
                </button>
            )}
        </div>
    )
}

export default Menu;
