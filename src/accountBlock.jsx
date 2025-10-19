/****************************************************************
 * AccountBlock Component
 * Renders the account information and management options for the user.
*****************************************************************/

function AccountBlock({currentUser, setCurrentUser,
                        setShowAccountManager, showAccountManager,
                        showAdminManager, setShowAdminManager
                        }) {

    // console.log("Manage status:", showAccountManager)

    return (
        <div className="account-block">
            {currentUser.userName}
            <button className="topgap" onClick={() => setCurrentUser(null)}>Logout</button>
            <button className="topgap" onClick={() => setShowAccountManager(!showAccountManager)}>Manage</button>
            {currentUser.admin === 1 && (
                <button className="topgap" onClick={() => setShowAdminManager(!showAdminManager)}>Admin</button>
            )}
        </div>
    )
}

export default AccountBlock;