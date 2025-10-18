function Menu ({quizBuilder, setQuizBuilder, studentMode, setStudentMode, currentUser, dashboard, setDashboard, analytics, setAnalytics}) {

    const handleModeSwitch = (mode) => {
        setQuizBuilder(mode === 'admin');
        setStudentMode(mode === 'student');
        setDashboard(mode === 'dashboard');
        setAnalytics(mode === 'analytics');
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
                Practice Questions
            </button>
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
