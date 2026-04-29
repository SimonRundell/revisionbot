import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { parseApiResponse } from './utils/apiHelpers';
import './App.css';

function StatTile({ label, value }) {
  return (
    <div className="student-progress-tile">
      <div className="student-progress-value">{value}</div>
      <div className="student-progress-label">{label}</div>
    </div>
  );
}

function BadgeTrack({ title, badges }) {
  return (
    <div className="student-badge-track">
      <h3>{title}</h3>
      {badges.length === 0 ? (
        <p className="student-badge-empty">No badges earned yet.</p>
      ) : (
        <div className="student-badge-grid">
          {badges.map((badge) => (
            <div key={badge.filename} className="student-badge-item" title={badge.filename.replace('.png', '')}>
              <img src={badge.src} alt={badge.filename.replace('.png', '')} loading="lazy" />
              <span>{badge.filename.replace('.png', '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentProgress({ userId, config, currentUser, setSendErrorMessage }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(async () => {
    if (!userId || !currentUser?.token) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${config.api}/getStudentRewards.php`,
        { userId },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`,
          },
        }
      );

      const parsed = parseApiResponse(
        response.data,
        null,
        setSendErrorMessage,
        '',
        'Failed to load student progress.'
      );

      if (parsed) {
        setStats(parsed);
      }
    } catch (error) {
      console.error('Error loading student progress:', error);
      setSendErrorMessage('Failed to load student progress.');
    } finally {
      setIsLoading(false);
    }
  }, [config.api, currentUser?.token, setSendErrorMessage, userId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="student-progress-page">
      <div className="student-progress-header">
        <h2>My Progress & Rewards</h2>
        <button className="btn-secondary" onClick={loadStats}>
          Refresh Progress
        </button>
      </div>

      {isLoading && (
        <div className="past-answers-loading">
          <Spin size="large" />
        </div>
      )}

      {!isLoading && stats && (
        <>
          <div className="student-progress-grid">
            <StatTile label="Questions Answered" value={stats.questionsAnswered} />
            <StatTile label="Retries" value={stats.retries} />
            <StatTile label="Pending RAG" value={stats.pendingRag} />
            <StatTile label="Red" value={stats.redCount} />
            <StatTile label="Amber" value={stats.amberCount} />
            <StatTile label="Green" value={stats.greenCount} />
            <StatTile label="Green %" value={`${stats.greenPercentOverall}%`} />
            <StatTile label="Amber/Green %" value={`${stats.amberOrGreenPercentOverall}%`} />
            <StatTile label="No-Red Streak" value={stats.noRedStreak} />
            <StatTile label="Green Streak" value={stats.greenStreak} />
          </div>

          <div className="student-badges-section">
            <h2>Earned Badges</h2>
            <BadgeTrack title="Green Percentage Badges" badges={stats.badgeTracks.greenPercent || []} />
            <BadgeTrack title="Amber/Green Percentage Badges" badges={stats.badgeTracks.amberOrGreenPercent || []} />
            <BadgeTrack title="No-Red Streak Badges" badges={stats.badgeTracks.noRedStreak || []} />
            <BadgeTrack title="Green Streak Badges" badges={stats.badgeTracks.greenStreak || []} />
          </div>
        </>
      )}
    </div>
  );
}

export default StudentProgress;
