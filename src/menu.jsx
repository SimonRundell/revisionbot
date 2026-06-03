/****************************************************************************
 * Menu Component
 * Renders the navigation menu for the application.
 * Includes buttons for different views (quiz builder, student, dashboard, analytics, progress).
 * Admin users see Quiz Builder and Analytics options.
 * Students see a My Progress button.
 *
 * @param {Object}   props.currentView    - Active view name string
 * @param {Function} props.setCurrentView - Setter to change the active view
 * @param {Object}   props.currentUser    - Current user object with admin status
 * @returns {JSX.Element} The Menu component
****************************************************************************/

function Menu({ currentView, setCurrentView, currentUser }) {
    return (
        <div className="menu">
            {currentUser?.admin === 1 && (
                <button
                    onClick={() => setCurrentView('quiz')}
                    className={currentView === 'quiz' ? 'active' : ''}
                >
                    Quiz Builder
                </button>
            )}
            <button
                onClick={() => setCurrentView('student')}
                className={currentView === 'student' ? 'active' : ''}
            >
                Questions
            </button>
            {currentUser?.admin !== 1 && (
                <button
                    onClick={() => setCurrentView('progress')}
                    className={currentView === 'progress' ? 'active' : ''}
                >
                    My Progress
                </button>
            )}
            <button
                onClick={() => setCurrentView('dashboard')}
                className={currentView === 'dashboard' ? 'active' : ''}
            >
                Dashboard
            </button>
            {currentUser?.admin === 1 && (
                <button
                    onClick={() => setCurrentView('analytics')}
                    className={currentView === 'analytics' ? 'active' : ''}
                >
                    Analytics
                </button>
            )}
        </div>
    )
}

export default Menu;
