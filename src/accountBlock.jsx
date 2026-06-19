import { useBadges } from './utils/useBadges';

/****************************************************************************
 * AccountBlock Component
 * Renders the account information and management options for the logged-in user.
 * Displays username, avatar, earned badge strip (students only), logout button,
 * account management button, and admin button for admin users.
 * Student badges are fetched from getStudentRewards.php and auto-refreshed every 30 seconds.
 * Each badge icon shows a rich tooltip with the exact metric value that earned it.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.currentUser - Current user object with username, avatar, and admin status
 * @param {Object} props.config - Configuration object containing API endpoint
 * @param {Function} props.setCurrentUser - Function to set current user state (null for logout)
 * @param {Function} props.setShowAccountManager - Function to toggle account manager visibility
 * @param {boolean} props.showAccountManager - Current visibility state of account manager
 * @param {boolean} props.showAdminManager - Current visibility state of admin manager
 * @param {Function} props.setShowAdminManager - Function to toggle admin manager visibility
 * @returns {JSX.Element} The AccountBlock component
****************************************************************************/

function AccountBlock({currentUser, config, setCurrentUser,
                        setShowAccountManager, showAccountManager,
                        showAdminManager, setShowAdminManager,
                        showSchoolManager, setShowSchoolManager,
                        showDepartmentSettings, setShowDepartmentSettings
                        }) {
    const { highestBadges, badgeTooltip } = useBadges(config, currentUser);

    const isSuperAdmin = Number(currentUser.is_super_admin) === 1;
    const isDepartmentAdmin = Number(currentUser.admin) === 1 && !isSuperAdmin;

    return (
        <div className="account-block">
            <div className="account-user-summary">
                <div className="account-user-main">
                    <span>{currentUser.userName}</span>
                    <img src={currentUser.avatar} alt="avatar" className="avatar-menubar" />
                </div>
                {currentUser.admin !== 1 && highestBadges.length > 0 && (
                    <div className="account-badge-strip">
                        {highestBadges.map((badge) => (
                            <img
                                key={badge.filename}
                                src={badge.src}
                                alt={badge.filename.replace('.png', '')}
                                className="account-badge-icon"
                                title={badgeTooltip(badge)}
                            />
                        ))}
                    </div>
                )}
            </div>
            <button onClick={() => setCurrentUser(null)}>Logout</button>
            <button onClick={() => setShowAccountManager(!showAccountManager)}>My Profile</button>
            {currentUser.admin === 1 && (
                <button onClick={() => setShowAdminManager(!showAdminManager)}>Admin</button>
            )}
            {isDepartmentAdmin && (
                <button onClick={() => setShowDepartmentSettings(!showDepartmentSettings)}>Department</button>
            )}
            {isSuperAdmin && (
                <button onClick={() => setShowSchoolManager(!showSchoolManager)}>Schools</button>
            )}
        </div>
    )
}

export default AccountBlock;