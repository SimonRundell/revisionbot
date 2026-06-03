import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { parseApiResponse } from './apiHelpers';

/**
 * Build an ordered array of the highest badge per track from a rewards object.
 * Exported as a pure function so AnalyticsModule can use it without the hook.
 *
 * @param {Object} rewards - Parsed response from getStudentRewards.php
 * @returns {Array} Ordered badge objects with an added `track` property
 */
export function buildHighestBadges(rewards) {
    if (!rewards?.highestBadges) return [];
    const hb = rewards.highestBadges;
    return [
        hb.greenPercent        ? { ...hb.greenPercent,        track: 'greenPercent'        } : null,
        hb.amberOrGreenPercent ? { ...hb.amberOrGreenPercent, track: 'amberOrGreenPercent' } : null,
        hb.noRedStreak         ? { ...hb.noRedStreak,         track: 'noRedStreak'         } : null,
        hb.greenStreak         ? { ...hb.greenStreak,         track: 'greenStreak'         } : null,
    ].filter(Boolean);
}

/**
 * Build a human-readable tooltip string for a badge.
 * Exported as a pure function for use in AnalyticsModule (two-arg form).
 *
 * @param {Object} badge   - Badge object with `track` and `filename` properties
 * @param {Object} rewards - Parsed rewards stats (may be null)
 * @returns {string}
 */
export function buildBadgeTooltip(badge, rewards) {
    const name = badge.filename.replace('.png', '');
    if (!rewards) return name;
    switch (badge.track) {
        case 'greenPercent':        return `Green %: ${rewards.greenPercentOverall}% → ${name} badge`;
        case 'amberOrGreenPercent': return `Amber/Green %: ${rewards.amberOrGreenPercentOverall}% → ${name} badge`;
        case 'noRedStreak':         return `No-Red streak: ${rewards.noRedStreak} in a row → ${name} badge`;
        case 'greenStreak':         return `Green streak: ${rewards.greenStreak} in a row → ${name} badge`;
        default:                    return name;
    }
}

/**
 * Custom hook that fetches and manages badge data for a single student.
 *
 * @param {Object}  config      - App config object (needs config.api)
 * @param {Object}  currentUser - User object (needs .id, .token, .admin)
 * @param {Object}  [options]
 * @param {boolean} [options.triggerOn] - When provided, the fetch fires only when
 *   this value is true (e.g. pass `showAccountManager` to load on drawer open).
 *   When omitted the fetch fires on mount and on a 30-second polling interval.
 * @returns {{ highestBadges, rewardStats, badgeTooltip, reload }}
 */
export function useBadges(config, currentUser, { triggerOn } = {}) {
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
            setHighestBadges(buildHighestBadges(parsed));
        } catch (error) {
            console.error('Error loading student badges:', error);
        }
    }, [config?.api, currentUser]);

    // Initial / trigger-based load
    useEffect(() => {
        if (triggerOn === undefined) {
            // No trigger option: load on mount
            loadStudentBadges();
        } else if (triggerOn === true) {
            // Trigger option provided: load only when it flips to true
            loadStudentBadges();
        }
    }, [triggerOn, loadStudentBadges]);

    // 30-second polling — only active when there is no manual trigger (i.e. the
    // header badge strip in AccountBlock, not the drawer or analytics views).
    useEffect(() => {
        if (triggerOn !== undefined || currentUser?.admin === 1) return;

        const intervalId = window.setInterval(loadStudentBadges, 30000);
        return () => window.clearInterval(intervalId);
    }, [triggerOn, currentUser?.admin, loadStudentBadges]);

    // Single-arg tooltip convenience wrapper using the hook's own rewardStats
    const badgeTooltip = useCallback(
        (badge) => buildBadgeTooltip(badge, rewardStats),
        [rewardStats]
    );

    return { highestBadges, rewardStats, badgeTooltip, reload: loadStudentBadges };
}
