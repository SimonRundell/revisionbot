import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { parseApiResponse } from './utils/apiHelpers';
import { formatDateRange } from './utils/dateHelpers';
import './App.css';


/****************************************************************************
 * StudentProgress Component
 * Student-facing "My Progress" page showing personalised stats tiles and all
 * earned badge tracks based on RAG-rated responses.
 * Calls getStudentRewards.php to retrieve stats and badge data.
 * Four badge tracks: Green %, Amber/Green %, No-Red streak, Green streak.
 *
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Object} props.currentUser - Current user object with id and authentication token
 * @returns {JSX.Element} The StudentProgress component
****************************************************************************/

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

function StudentProgressChart({ data }) {
  const canvasRef = useRef(null);

  const buildWeeklyCounts = useCallback(() => {
    const source = data?.weeklyAverages || [];
    if (source.length > 0 && source[0].red !== undefined) {
      return source;
    }

    const weekMap = new Map();
    (data?.progressData || []).forEach((entry) => {
      const d = new Date(entry.date);
      const year = d.getUTCFullYear();
      const oneJan = new Date(Date.UTC(year, 0, 1));
      const day = oneJan.getUTCDay() || 7;
      const week = Math.ceil((((d - oneJan) / 86400000) + day) / 7);
      const weekKey = `${year}-${String(week).padStart(2, '0')}`;

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { week: weekKey, red: 0, amber: 0, green: 0 });
      }

      const row = weekMap.get(weekKey);
      if (entry.rating === 'R') row.red += 1;
      if (entry.rating === 'A') row.amber += 1;
      if (entry.rating === 'G') row.green += 1;
    });

    return Array.from(weekMap.values()).sort((a, b) => a.week.localeCompare(b.week));
  }, [data]);

  useEffect(() => {
    const weekly = buildWeeklyCounts();
    if (weekly.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const containerWidth = canvas.parentElement.clientWidth;
    const maxWidth = Math.min(containerWidth - 40, 900);
    canvas.width = maxWidth;
    canvas.height = Math.max(320, maxWidth * 0.55);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const margin = { top: 35, right: 20, bottom: 72, left: 56 };
    const chartWidth = canvas.width - margin.left - margin.right;
    const chartHeight = canvas.height - margin.top - margin.bottom;

    const maxCount = Math.max(1, ...weekly.flatMap((w) => [w.red, w.amber, w.green]));

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(margin.left, margin.top, chartWidth, chartHeight);

    ctx.strokeStyle = '#e1e5e9';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + chartHeight - (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + chartWidth, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + chartHeight);
    ctx.lineTo(margin.left + chartWidth, margin.top + chartHeight);
    ctx.stroke();

    const groupWidth = chartWidth / weekly.length;
    const gap = Math.min(8, groupWidth * 0.15);
    const barWidth = Math.max(6, (groupWidth - gap * 4) / 3);

    const colors = [
      { key: 'red', color: '#ff4d4f' },
      { key: 'amber', color: '#faad14' },
      { key: 'green', color: '#52c41a' }
    ];

    weekly.forEach((row, i) => {
      const startX = margin.left + i * groupWidth;
      colors.forEach((c, index) => {
        const value = row[c.key] || 0;
        const h = (value / maxCount) * chartHeight;
        const x = startX + gap + index * (barWidth + gap);
        const y = margin.top + chartHeight - h;
        ctx.fillStyle = c.color;
        ctx.fillRect(x, y, barWidth, h);
      });
    });

    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((i / 5) * maxCount);
      const y = margin.top + chartHeight - (i / 5) * chartHeight;
      ctx.fillText(`${value}`, margin.left - 8, y + 4);
    }

    ctx.textAlign = 'center';
    ctx.font = '11px Arial';
    weekly.forEach((row, i) => {
      const x = margin.left + i * groupWidth + groupWidth / 2;
      const [, week] = row.week.split('-');
      ctx.fillText(`W${week}`, x, margin.top + chartHeight + 18);
    });

    ctx.font = 'bold 14px Arial';
    ctx.fillText('Weekly RAG Distribution', canvas.width / 2, 18);
  }, [buildWeeklyCounts]);

  if (!data || !data.progressData || data.progressData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px' }}>
        <p>No rated responses yet. Complete work and wait for teacher ratings to see your graph.</p>
      </div>
    );
  }

  return (
    <div className="progress-chart-container">
      <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />
      <div className="chart-legend">
        <div className="legend-items">
          <span className="legend-item"><span style={{ color: '#ff4d4f', fontSize: '16px', fontWeight: 'bold' }}>■</span> Red</span>
          <span className="legend-item"><span style={{ color: '#faad14', fontSize: '16px', fontWeight: 'bold' }}>■</span> Amber</span>
          <span className="legend-item"><span style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>■</span> Green</span>
        </div>
        <div className="chart-stats">
          <div><strong>Total Responses:</strong> {data.totalResponses}</div>
          <div><strong>Overall Average:</strong> {data.overallAverage}/3</div>
          <div><strong>Weeks Tracked:</strong> {data.weeklyAverages?.length || 0}</div>
        </div>
        {data.progressData.length > 1 && (
          <p style={{ marginTop: '10px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            Progress {formatDateRange(data.progressData[0].date, data.progressData[data.progressData.length - 1].date)}
          </p>
        )}
      </div>
    </div>
  );
}

function StudentProgress({ userId, config, currentUser, setSendErrorMessage }) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [progressData, setProgressData] = useState(null);

  const loadStats = useCallback(async () => {
    if (!userId || !currentUser?.token) {
      return;
    }

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
    }
  }, [config.api, currentUser?.token, setSendErrorMessage, userId]);

  const loadProgressGraph = useCallback(async () => {
    if (!userId || !currentUser?.token) {
      return;
    }

    try {
      const response = await axios.post(
        `${config.api}/getAdvancedStatistics.php`,
        { type: 'studentProgress', studentId: userId },
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
        'Failed to load progress chart.'
      );

      if (parsed) {
        setProgressData(parsed);
      }
    } catch (error) {
      console.error('Error loading progress chart:', error);
      setSendErrorMessage('Failed to load progress chart.');
    }
  }, [config.api, currentUser?.token, setSendErrorMessage, userId]);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadStats(), loadProgressGraph()]);
    } finally {
      setIsLoading(false);
    }
  }, [loadProgressGraph, loadStats]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="student-progress-page">
      <div className="student-progress-header">
        <h2>My Progress & Rewards</h2>
        <button className="btn-secondary" onClick={refreshAll}>
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
          <div className="student-badges-section">
            <h2>My RAG Progress Chart</h2>
            <StudentProgressChart data={progressData} />
          </div>

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
