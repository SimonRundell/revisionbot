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
        <nav className="menu" aria-label="Main">
            {currentUser?.admin === 1 && (
                <button
                    onClick={() => setCurrentView('quiz')}
                    className={currentView === 'quiz' ? 'active' : ''}
                    aria-current={currentView === 'quiz' ? 'page' : undefined}
                >
                    Quiz Builder
                </button>
            )}
            <button
                onClick={() => setCurrentView('student')}
                className={currentView === 'student' ? 'active' : ''}
                aria-current={currentView === 'student' ? 'page' : undefined}
            >
                Questions
            </button>
            {currentUser?.admin !== 1 && (
                <button
                    onClick={() => setCurrentView('progress')}
                    className={currentView === 'progress' ? 'active' : ''}
                    aria-current={currentView === 'progress' ? 'page' : undefined}
                >
                    My Progress
                </button>
            )}
            <button
                onClick={() => setCurrentView('dashboard')}
                className={currentView === 'dashboard' ? 'active' : ''}
                aria-current={currentView === 'dashboard' ? 'page' : undefined}
            >
                Dashboard
            </button>
            {currentUser?.admin === 1 && (
                <button
                    onClick={() => setCurrentView('analytics')}
                    className={currentView === 'analytics' ? 'active' : ''}
                    aria-current={currentView === 'analytics' ? 'page' : undefined}
                >
                    Analytics
                </button>
            )}
        </nav>
    )
}

export default Menu;
