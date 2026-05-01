import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Spin, Modal } from 'antd';
import { handleApiCall } from './utils/apiHelpers';
import { formatDateRange } from './utils/dateHelpers';
import './App.css';

/****************************************************************************
 * StudentProgressChart Component
 * Renders a canvas-based chart showing RAG (Red/Amber/Green) progress over time
 * Uses HTML5 Canvas to draw interactive progress graphs with trend lines and data points
 * 
 * @param {Object} props - Component props
 * @param {Object} props.data - Progress data object containing progressData array and statistics
 * @param {Array} props.data.progressData - Array of progress points with date, rating, and values
 * @returns {JSX.Element} Canvas-based progress chart component
****************************************************************************/
const StudentProgressChart = ({ data }) => {
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
            <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>No progress data available for this student.</p>
                <p>The student needs to have completed responses with teacher ratings to show progress.</p>
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
                {data.progressData && data.progressData.length > 1 && (
                    <p style={{ marginTop: '10px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                        Progress {formatDateRange(data.progressData[0].date, data.progressData[data.progressData.length - 1].date)}
                    </p>
                )}
            </div>
        </div>
    );
};

/****************************************************************************
 * AnalyticsModule Component
 * Renders the analytics dashboard for monitoring user activity.
 * Provides department, student, and question-level analytics with progress tracking.
 * Per-student badge achievements are fetched from getStudentRewards.php and shown
 * as a badge strip in the department breakdown table and a full Earned Badges section
 * in the individual student view.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Object} props.currentUser - Current user object with authentication token and admin details
 * @param {Function} props.setSendErrorMessage - Function to set error messages in parent component
 * @param {Function} props.setSendSuccessMessage - Function to set success messages in parent component
 * @returns {JSX.Element} The AnalyticsModule component
****************************************************************************/

const AnalyticsModule = ({ config, currentUser, setSendErrorMessage, setSendSuccessMessage }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [selectedView, setSelectedView] = useState('department');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState('');
    
    // Data states
    const [departments, setDepartments] = useState([]);
    const [students, setStudents] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [analyticsData, setAnalyticsData] = useState(null);
    
    // Filter states
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [studentFilter, setStudentFilter] = useState('');
    const [questionFilter, setQuestionFilter] = useState('');
    
    // Modal states
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [selectedStudentProgress, setSelectedStudentProgress] = useState(null);
    const [progressLoading, setProgressLoading] = useState(false);
    const [modalStudentName, setModalStudentName] = useState('');

    // Badge rewards cache: userId (string) -> rewards data from getStudentRewards.php
    const [studentRewardsCache, setStudentRewardsCache] = useState({});

    /**
     * Load departments data for analytics filtering
     * Fetches all available departments from the API for dropdown selection
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when departments are loaded
     */
    const loadDepartments = useCallback(async () => {
        const apiCall = () => axios.post(`${config.api}/getAdvancedStatistics.php`, {
            type: 'departments'
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}` 
            }
        });

        await handleApiCall(
            apiCall,
            setDepartments,
            setIsLoading,
            null,
            setSendErrorMessage,
            '',
            'Failed to load departments'
        );
    }, [config.api, currentUser.token, setSendErrorMessage]);

    /**
     * Load students data for analytics filtering
     * Fetches all users/students from the API for dropdown selection
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when students are loaded
     */
    const loadStudents = useCallback(async () => {
        const apiCall = () => axios.post(`${config.api}/getUsers.php`, {}, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}` 
            }
        });

        await handleApiCall(
            apiCall,
            setStudents,
            setIsLoading,
            null,
            setSendErrorMessage,
            '',
            'Failed to load students'
        );
    }, [config.api, currentUser.token, setSendErrorMessage]);

    const loadQuestions = useCallback(async () => {
        const apiCall = () => axios.post(`${config.api}/getAdvancedStatistics.php`, {
            type: 'all_questions'
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}` 
            }
        });

        await handleApiCall(
            apiCall,
            setQuestions,
            setIsLoading,
            null,
            setSendErrorMessage,
            '',
            'Failed to load questions'
        );
    }, [config.api, currentUser.token, setSendErrorMessage]);

    const loadStudentProgress = useCallback(async (studentId, studentName) => {
        setProgressLoading(true);
        setModalStudentName(studentName);
        
        const apiCall = () => axios.post(`${config.api}/getAdvancedStatistics.php`, {
            type: 'studentProgress',
            studentId: studentId
        }, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}` 
            }
        });

        await handleApiCall(
            apiCall,
            (data) => {
                setSelectedStudentProgress(data);
                setShowProgressModal(true);
            },
            setProgressLoading,
            null,
            setSendErrorMessage,
            '',
            'Failed to load student progress data'
        );
    }, [config.api, currentUser.token, setSendErrorMessage]);

    // Fetch rewards for a single student (by numeric id), caches by id string
    const fetchStudentRewards = useCallback(async (studentId) => {
        const key = studentId.toString();
        // Already cached — skip
        setStudentRewardsCache(prev => {
            if (prev[key] !== undefined) return prev;
            return prev; // will fetch below
        });

        try {
            const response = await axios.post(
                `${config.api}/getStudentRewards.php`,
                { userId: studentId },
                { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` } }
            );
            const d = response.data;
            const parsed = d?.success ? (d.data ?? d) : null;
            if (parsed) {
                setStudentRewardsCache(prev => ({ ...prev, [key]: parsed }));
            }
        } catch (_) { /* silently ignore */ }
    }, [config.api, currentUser.token]);

    // Build ordered highest-badge array from a rewards object
    const getHighestBadges = (rewards) => {
        if (!rewards?.highestBadges) return [];
        const hb = rewards.highestBadges;
        return [
            hb.greenPercent           ? { ...hb.greenPercent,           track: 'greenPercent'           } : null,
            hb.amberOrGreenPercent    ? { ...hb.amberOrGreenPercent,    track: 'amberOrGreenPercent'    } : null,
            hb.noRedStreak            ? { ...hb.noRedStreak,            track: 'noRedStreak'            } : null,
            hb.greenStreak            ? { ...hb.greenStreak,            track: 'greenStreak'            } : null,
        ].filter(Boolean);
    };

    // Rich tooltip text for a badge given the full rewards object
    const badgeTooltip = (badge, rewards) => {
        if (!rewards) return badge.filename.replace('.png', '');
        switch (badge.track) {
            case 'greenPercent':        return `Green %: ${rewards.greenPercentOverall}% → ${badge.filename.replace('.png', '')} badge`;
            case 'amberOrGreenPercent': return `Amber/Green %: ${rewards.amberOrGreenPercentOverall}% → ${badge.filename.replace('.png', '')} badge`;
            case 'noRedStreak':         return `No-Red streak: ${rewards.noRedStreak} in a row → ${badge.filename.replace('.png', '')} badge`;
            case 'greenStreak':         return `Green streak: ${rewards.greenStreak} in a row → ${badge.filename.replace('.png', '')} badge`;
            default:                    return badge.filename.replace('.png', '');
        }
    };

    const loadAnalytics = useCallback(async () => {
        let endpoint = '';
        let params = {};

        switch (selectedView) {
            case 'department':
                endpoint = 'departmentStats';
                params = { department: selectedDepartment };
                break;
            case 'student':
                endpoint = 'studentStats';
                params = { studentId: selectedStudent };
                break;
            case 'question':
                endpoint = 'questionStats';
                params = { questionId: selectedQuestion };
                break;
            default:
                return;
        }

        // console.log('Loading analytics with:', { type: endpoint, ...params });
        
        const apiCall = () => axios.post(`${config.api}/getAdvancedStatistics.php`, 
            { type: endpoint, ...params },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            }
        );

        await handleApiCall(
            apiCall,
            (data) => {
                // console.log('Analytics data received:', data);
                setAnalyticsData(data);
            },
            setIsLoading,
            setSendSuccessMessage,
            setSendErrorMessage,
            '',
            'Failed to load analytics'
        );
    }, [selectedView, selectedDepartment, selectedStudent, selectedQuestion, config.api, currentUser.token, setSendSuccessMessage, setSendErrorMessage]);

    // Load initial data
    useEffect(() => {
        loadDepartments();
        loadStudents();
        loadQuestions();
    }, [loadDepartments, loadStudents, loadQuestions]);

    // Auto-load analytics when department selection changes
    useEffect(() => {
        if (selectedView === 'department' && selectedDepartment) {
            loadAnalytics();
        }
    }, [selectedDepartment, selectedView, loadAnalytics]);

    // Auto-load analytics when student selection changes
    useEffect(() => {
        if (selectedView === 'student' && selectedStudent) {
            loadAnalytics();
        }
    }, [selectedStudent, selectedView, loadAnalytics]);

    // When a specific student is selected, pre-fetch their rewards
    useEffect(() => {
        if (selectedView === 'student' && selectedStudent) {
            const key = selectedStudent.toString();
            if (!studentRewardsCache[key]) {
                fetchStudentRewards(selectedStudent);
            }
        }
    }, [selectedStudent, selectedView, studentRewardsCache, fetchStudentRewards]);

    // When department breakdown loads, batch-fetch rewards for all students in it
    useEffect(() => {
        if (selectedView === 'department' && analyticsData?.studentBreakdown) {
            analyticsData.studentBreakdown.forEach((student) => {
                const studentData = students.find(s => s.userName === student.name);
                if (studentData) {
                    const key = studentData.id.toString();
                    if (!studentRewardsCache[key]) {
                        fetchStudentRewards(studentData.id);
                    }
                }
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [analyticsData, selectedView]);

    // Auto-load analytics when question selection changes
    useEffect(() => {
        if (selectedView === 'question' && selectedQuestion) {
            loadAnalytics();
        }
    }, [selectedQuestion, selectedView, loadAnalytics]);

    // Clear analytics data and reset selections when view changes
    useEffect(() => {
        setAnalyticsData(null);
        setSelectedDepartment('');
        setSelectedStudent('');
        setSelectedQuestion('');
        setDepartmentFilter('');
        setStudentFilter('');
        setQuestionFilter('');
    }, [selectedView]);

    // Filter functions
    const filteredDepartments = departments.filter(dept => 
        dept.toLowerCase().includes(departmentFilter.toLowerCase())
    );

    const filteredStudents = students.filter(student => 
        student.userName.toLowerCase().includes(studentFilter.toLowerCase()) ||
        (student.userClass && student.userClass.toLowerCase().includes(studentFilter.toLowerCase()))
    );

    const filteredQuestions = questions.filter(question => 
        question.question.toLowerCase().includes(questionFilter.toLowerCase()) ||
        question.topic.toLowerCase().includes(questionFilter.toLowerCase()) ||
        question.subject.toLowerCase().includes(questionFilter.toLowerCase())
    );

    const renderDepartmentStats = (data) => {
        if (!data) return null;

        return (
            <div className="analytics-section">
                <h3>Department: {selectedDepartment}</h3>
                
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">{data.topicsAnswered || 0}</div>
                        <div className="stat-label">Topics Answered</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.questionsAnswered || 0}</div>
                        <div className="stat-label">Questions Answered</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.totalStudents || 0}</div>
                        <div className="stat-label">Active Students</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.avgAttempts || 0}</div>
                        <div className="stat-label">Avg Attempts</div>
                    </div>
                </div>

                {data.studentBreakdown && (
                    <div className="table-container">
                        <h4>Student Performance in {selectedDepartment}</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Topics</th>
                                    <th>Questions</th>
                                    <th>Red</th>
                                    <th>Amber</th>
                                    <th>Green</th>
                                    <th>Badges</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.studentBreakdown.map((student, index) => {
                                    // Find the actual student ID from the students array
                                    const studentData = students.find(s => s.userName === student.name);
                                    const studentId = studentData ? studentData.id : null;
                                    const rewards = studentId ? studentRewardsCache[studentId.toString()] : null;
                                    const badges = rewards ? getHighestBadges(rewards) : null;

                                    return (
                                        <tr key={index}>
                                            <td>
                                                {studentId ? (
                                                    <span 
                                                        className="clickable-student-name"
                                                        onClick={() => loadStudentProgress(studentId, student.name)}
                                                        style={{ 
                                                            cursor: 'pointer', 
                                                            color: '#1890ff', 
                                                            textDecoration: 'underline' 
                                                        }}
                                                        title="Click to view progress graph"
                                                    >
                                                        {student.name}
                                                    </span>
                                                ) : (
                                                    student.name
                                                )}
                                            </td>
                                            <td>{student.topicsAnswered}</td>
                                            <td>{student.questionsAnswered}</td>
                                            <td className="red-stat">{student.redCount} ({student.redPercent}%)</td>
                                            <td className="amber-stat">{student.amberCount} ({student.amberPercent}%)</td>
                                            <td className="green-stat">{student.greenCount} ({student.greenPercent}%)</td>
                                            <td>
                                                {!studentId ? null : !rewards ? (
                                                    <span className="analytics-badges-loading-small">…</span>
                                                ) : badges.length === 0 ? (
                                                    <span className="analytics-badges-empty-small">—</span>
                                                ) : (
                                                    <div className="analytics-badge-strip">
                                                        {badges.map((badge) => (
                                                            <img
                                                                key={badge.track}
                                                                src={badge.src}
                                                                alt={badge.filename.replace('.png', '')}
                                                                className="analytics-badge-strip-img"
                                                                title={badgeTooltip(badge, rewards)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderStudentStats = (data) => {
        if (!data) return null;

        const selectedStudentData = students.find(s => s.id.toString() === selectedStudent);

        return (
            <div className="analytics-section">
                <h3>Student: {selectedStudentData?.userName}</h3>
                
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">{data.topicsAnswered || 0}</div>
                        <div className="stat-label">Topics Answered</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.questionsAnswered || 0}</div>
                        <div className="stat-label">Questions Answered</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.totalAttempts || 0}</div>
                        <div className="stat-label">Total Attempts</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.unratedCount || 0}</div>
                        <div className="stat-label">Unrated</div>
                    </div>
                </div>

                <div className="rag-rating-section">
                    <h4>RAG Rating Distribution</h4>
                    <div className="rag-stats">
                        <div className="rag-stat red">
                            <span className="rag-label">Red:</span>
                            <span className="rag-count">{data.redCount || 0}</span>
                            <span className="rag-percent">({data.redPercent || 0}%)</span>
                        </div>
                        <div className="rag-stat amber">
                            <span className="rag-label">Amber:</span>
                            <span className="rag-count">{data.amberCount || 0}</span>
                            <span className="rag-percent">({data.amberPercent || 0}%)</span>
                        </div>
                        <div className="rag-stat green">
                            <span className="rag-label">Green:</span>
                            <span className="rag-count">{data.greenCount || 0}</span>
                            <span className="rag-percent">({data.greenPercent || 0}%)</span>
                        </div>
                        {data.unratedCount > 0 && (
                            <div className="rag-stat unrated">
                                <span className="rag-label">Unrated:</span>
                                <span className="rag-count">{data.unratedCount || 0}</span>
                                <span className="rag-percent">({data.unratedPercent || 0}%)</span>
                            </div>
                        )}
                    </div>
                </div>

                {data.questionAttempts && (
                    <div className="table-container">
                        <h4>Question Attempts</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Topic</th>
                                    <th>Attempts</th>
                                    <th>Latest RAG</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.questionAttempts.map((attempt, index) => (
                                    <tr key={index}>
                                        <td>{attempt.question.substring(0, 50)}...</td>
                                        <td>{attempt.topicName}</td>
                                        <td>{attempt.attemptCount}</td>
                                        <td className={`rag-${attempt.latestRag === 'R' ? 'red' : attempt.latestRag === 'A' ? 'amber' : attempt.latestRag === 'G' ? 'green' : 'unrated'}`}>
                                            {attempt.latestRag === 'R' ? 'Red' : attempt.latestRag === 'A' ? 'Amber' : attempt.latestRag === 'G' ? 'Green' : 'Unrated'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                 * Provides comprehensive analytics views for admin users including department statistics,
                 * student performance tracking, and question analysis with interactive progress graphs.
                 * Per-student badge achievements are fetched from getStudentRewards.php and displayed
                 * alongside RAG stats — as a badge strip in the department table and a full Earned Badges
                 * section in the individual student view.
                {(() => {
                    const rewards = studentRewardsCache[selectedStudent];
                    const badges = rewards ? getHighestBadges(rewards) : null;
                    return (
                        <div className="analytics-badges-section">
                            <h4>Earned Badges</h4>
                            {!rewards ? (
                                <p className="analytics-badges-loading">Loading badges…</p>
                            ) : badges.length === 0 ? (
                                <p className="analytics-badges-empty">No badges earned yet.</p>
                            ) : (
                                <div className="analytics-badges-grid">
                                    {badges.map((badge) => (
                                        <div key={badge.track} className="analytics-badge-item">
                                            <img
                                                src={badge.src}
                                                alt={badge.filename.replace('.png', '')}
                                                className="analytics-badge-img"
                                                title={badgeTooltip(badge, rewards)}
                                            />
                                            <span className="analytics-badge-label">{badgeTooltip(badge, rewards)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        );
    };

    const renderQuestionStats = (data) => {
        if (!data) return null;

        const selectedQuestionData = questions.find(q => q.id.toString() === selectedQuestion);

        return (
            <div className="analytics-section">
                <h3>Question Analysis</h3>
                <p><strong>Question:</strong> {selectedQuestionData?.question}</p>
                
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">{data.totalAttempts || 0}</div>
                        <div className="stat-label">Total Attempts</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.uniqueStudents || 0}</div>
                        <div className="stat-label">Students Attempted</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.classesAttempted || 0}</div>
                        <div className="stat-label">Classes Attempted</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{data.avgRagScore || 0}</div>
                        <div className="stat-label">Avg RAG Score</div>
                    </div>
                </div>

                {data.departmentBreakdown && (
                    <div className="table-container">
                        <h4>Performance by Department</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Students</th>
                                    <th>Attempts</th>
                                    <th>Red</th>
                                    <th>Amber</th>
                                    <th>Green</th>
                                    <th>Success Rate</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.departmentBreakdown.map((dept, index) => (
                                    <tr key={index}>
                                        <td>{dept.department}</td>
                                        <td>{dept.studentCount}</td>
                                        <td>{dept.attempts}</td>
                                        <td className="red-stat">{dept.redCount}</td>
                                        <td className="amber-stat">{dept.amberCount}</td>
                                        <td className="green-stat">{dept.greenCount}</td>
                                        <td>{dept.successRate}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="analytics-module">
            <div className="analytics-header">
                <h2>Teaching Analytics Dashboard</h2>
                <p>Comprehensive student performance and progress tracking</p>
            </div>

            {isLoading && (
                <div className="central-overlay-spinner">
                    <div className="spinner-content">
                        <Spin size="large" />
                        <p>Loading analytics...</p>
                    </div>
                </div>
            )}

            <div className="analytics-controls">
                <div className="controls-row">
                    <div className="view-selector">
                        <label>Analysis Type:</label>
                        <select 
                            value={selectedView} 
                            onChange={(e) => setSelectedView(e.target.value)}
                        >
                            <option value="department">By Class/Department</option>
                            <option value="student">By Student</option>
                            <option value="question">By Question</option>
                        </select>
                    </div>
                </div>

                {selectedView === 'department' && (
                    <div className="filter-selector-column">
                        <div className="search-filter">
                            <label>Search Departments:</label>
                            <input
                                type="text"
                                placeholder="Type to filter departments..."
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                        <div className="results-column">
                            <div className="results-header">
                                <span>Departments {departmentFilter && `(${filteredDepartments.length} of ${departments.length})`}</span>
                            </div>
                            <div className="results-list">
                                {filteredDepartments.map((dept, index) => (
                                    <div 
                                        key={index} 
                                        className={`result-item ${selectedDepartment === dept ? 'selected' : ''}`}
                                        onClick={() => setSelectedDepartment(dept)}
                                    >
                                        <div className="department-name">{dept}</div>
                                    </div>
                                ))}
                                {filteredDepartments.length === 0 && (
                                    <div className="no-results">No departments found</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedView === 'student' && (
                    <div className="filter-selector-column">
                        <div className="search-filter">
                            <label>Search Students:</label>
                            <input
                                type="text"
                                placeholder="Type student name or department..."
                                value={studentFilter}
                                onChange={(e) => setStudentFilter(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                        <div className="results-column">
                            <div className="results-header">
                                <span>Students {studentFilter && `(${filteredStudents.length} of ${students.length})`}</span>
                            </div>
                            <div className="results-list">
                                {filteredStudents.map((student) => (
                                    <div 
                                        key={student.id} 
                                        className={`result-item ${selectedStudent === student.id.toString() ? 'selected' : ''}`}
                                        onClick={() => setSelectedStudent(student.id.toString())}
                                    >
                                        <div className="student-name">{student.userName}</div>
                                        <div className="student-location">{student.userClass}</div>
                                    </div>
                                ))}
                                {filteredStudents.length === 0 && (
                                    <div className="no-results">No students found</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {selectedView === 'question' && (
                    <div className="filter-selector-column">
                        <div className="search-filter">
                            <label>Search Questions:</label>
                            <input
                                type="text"
                                placeholder="Type question, topic, or subject..."
                                value={questionFilter}
                                onChange={(e) => setQuestionFilter(e.target.value)}
                                className="filter-input"
                            />
                        </div>
                        <div className="results-column">
                            <div className="results-header">
                                <span>Questions {questionFilter && `(${filteredQuestions.length} of ${questions.length})`}</span>
                            </div>
                            <div className="results-list">
                                {filteredQuestions.map((question) => (
                                    <div 
                                        key={question.id} 
                                        className={`result-item ${selectedQuestion === question.id.toString() ? 'selected' : ''}`}
                                        onClick={() => setSelectedQuestion(question.id.toString())}
                                    >
                                        <div className="question-text">{question.question.substring(0, 80)}...</div>
                                        <div className="question-meta">{question.subject} › {question.topic}</div>
                                    </div>
                                ))}
                                {filteredQuestions.length === 0 && (
                                    <div className="no-results">No questions found</div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="analytics-content">
                {selectedView === 'department' && renderDepartmentStats(analyticsData)}
                {selectedView === 'student' && renderStudentStats(analyticsData)}
                {selectedView === 'question' && renderQuestionStats(analyticsData)}
            </div>

            {/* Student Progress Modal */}
            <Modal
                title={`Progress Over Time - ${modalStudentName}`}
                open={showProgressModal}
                onCancel={() => setShowProgressModal(false)}
                width={800}
                footer={null}
            >
                {progressLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                        <Spin size="large" />
                        <p>Loading progress data...</p>
                    </div>
                ) : selectedStudentProgress ? (
                    <StudentProgressChart data={selectedStudentProgress} />
                ) : (
                    <p>No progress data available</p>
                )}
            </Modal>
        </div>
    );
};

export default AnalyticsModule;