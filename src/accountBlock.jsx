/****************************************************************************
 * AccountBlock Component
 * Renders the account information and management options for the logged-in user.
 * Displays username, avatar, logout button, account management button, and admin button for admin users.
 * Controls visibility of account and admin management interfaces.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.currentUser - Current user object with username, avatar, and admin status
 * @param {Function} props.setCurrentUser - Function to set current user state (null for logout)
 * @param {Function} props.setShowAccountManager - Function to toggle account manager visibility
 * @param {boolean} props.showAccountManager - Current visibility state of account manager
 * @param {boolean} props.showAdminManager - Current visibility state of admin manager
 * @param {Function} props.setShowAdminManager - Function to toggle admin manager visibility
 * @returns {JSX.Element} The AccountBlock component
****************************************************************************/

function AccountBlock({currentUser, setCurrentUser,
                        setShowAccountManager, showAccountManager,
                        showAdminManager, setShowAdminManager
                        }) {

    // console.log("Manage status:", showAccountManager)

    return (
        <div className="account-block">
            {currentUser.userName} <img src={currentUser.avatar} alt="avatar" className="avatar-menubar" />
            <button onClick={() => setCurrentUser(null)}>Logout</button>
            <button onClick={() => setShowAccountManager(!showAccountManager)}>My Profile</button>
            {currentUser.admin === 1 && (
                <button onClick={() => setShowAdminManager(!showAdminManager)}>Admin</button>
            )}
        </div>
    )
}

export default AccountBlock;