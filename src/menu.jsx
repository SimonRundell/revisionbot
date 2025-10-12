function Menu ({quizBuilder, setQuizBuilder, studentMode, setStudentMode, currentUser}) {
    
    const handleModeSwitch = (mode) => {
        if (mode === 'admin') {
            setQuizBuilder(true);
            setStudentMode(false);
        } else if (mode === 'student') {
            setQuizBuilder(false);
            setStudentMode(true);
        } else {
            setQuizBuilder(false);
            setStudentMode(false);
        }
    };

    return (
        <div className="menu">
            {currentUser?.admin === 1 && (
                <button 
                    onClick={() => handleModeSwitch('admin')}
                    className={quizBuilder && !studentMode ? 'active' : ''}
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
                onClick={() => handleModeSwitch('none')}
                className={!quizBuilder && !studentMode ? 'active' : ''}
            >
                Dashboard
            </button>
        </div>
    )
}

export default Menu;