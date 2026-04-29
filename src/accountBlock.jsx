import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { parseApiResponse } from './utils/apiHelpers';

/****************************************************************************
 * AccountBlock Component
 * Renders the account information and management options for the logged-in user.
 * Displays username, avatar, badges, logout button, account management button, and admin button for admin users.
 * Controls visibility of account and admin management interfaces.
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
                        showAdminManager, setShowAdminManager
                        }) {
    const [highestBadges, setHighestBadges] = useState([]);
    const [rewardStats, setRewardStats] = useState(null);

    const loadStudentBadges = useCallback(async () => {
        if (!config?.api || !currentUser?.token || currentUser?.admin === 1) {
            setHighestBadges([]);
            setRewardStats(null);
            return;
        }

        try {
            const response = await axios.post(
                `${config.api}/getStudentRewards.php`,
                { userId: currentUser.id },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`,
                    },
                }
            );

            const parsed = parseApiResponse(response.data, null, null, '', '');
            if (!parsed || !parsed.highestBadges) {
                setHighestBadges([]);
                setRewardStats(null);
                return;
            }

            setRewardStats(parsed);

            const orderedBadges = [
                parsed.highestBadges.greenPercent     ? { ...parsed.highestBadges.greenPercent,     track: 'greenPercent'     } : null,
                parsed.highestBadges.amberOrGreenPercent ? { ...parsed.highestBadges.amberOrGreenPercent, track: 'amberOrGreenPercent' } : null,
                parsed.highestBadges.noRedStreak      ? { ...parsed.highestBadges.noRedStreak,      track: 'noRedStreak'      } : null,
                parsed.highestBadges.greenStreak      ? { ...parsed.highestBadges.greenStreak,      track: 'greenStreak'      } : null,
            ].filter(Boolean);

            setHighestBadges(orderedBadges);
        } catch (error) {
            console.error('Error loading student badges:', error);
        }
    }, [config?.api, currentUser]);

    useEffect(() => {
        loadStudentBadges();
    }, [loadStudentBadges]);

    useEffect(() => {
        if (currentUser?.admin === 1) {
            return;
        }

        const intervalId = window.setInterval(() => {
            loadStudentBadges();
        }, 30000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [currentUser?.admin, loadStudentBadges]);

    // Build a human-readable tooltip for a badge given the live stats
    const badgeTooltip = (badge) => {
        if (!rewardStats) {
            return badge.filename.replace('.png', '');
        }
        switch (badge.track) {
            case 'greenPercent':
                return `Green %: ${rewardStats.greenPercentOverall}% → ${badge.filename.replace('.png', '')} badge`;
            case 'amberOrGreenPercent':
                return `Amber/Green %: ${rewardStats.amberOrGreenPercentOverall}% → ${badge.filename.replace('.png', '')} badge`;
            case 'noRedStreak':
                return `No-Red streak: ${rewardStats.noRedStreak} in a row → ${badge.filename.replace('.png', '')} badge`;
            case 'greenStreak':
                return `Green streak: ${rewardStats.greenStreak} in a row → ${badge.filename.replace('.png', '')} badge`;
            default:
                return badge.filename.replace('.png', '');
        }
    };

    // console.log("Manage status:", showAccountManager)

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
        </div>
    )
}

export default AccountBlock;