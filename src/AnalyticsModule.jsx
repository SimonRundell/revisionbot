import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { Spin, Modal } from 'antd';
import { handleApiCall } from './utils/apiHelpers';
import { formatDateRange } from './utils/dateHelpers';
import './App.css';
import { downloadCsv } from './utils/csvHelpers';

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

/**
 * Compute a signed RAG score as a percentage (-100 to +100).
 * Red=-1, Amber=0, Green=+1, normalised by rated questions only.
 * Returns null when no rated questions exist.
 * @param {number} red
 * @param {number} amber
 * @param {number} green
 * @returns {number|null}
 */
const ragScore = (red, amber, green) => {
    const total = red + amber + green;
    if (total === 0) return null;
    const score = Math.round((green - red) / total * 100);
    return Number.isNaN(score) ? 0 : score;
};

/**
 * Return a sorted copy of arr. getValue(item, key) overrides direct key access.
 * @param {Array} arr
 * @param {string|null} key
 * @param {'asc'|'desc'} dir
 * @param {Function} [getValue]
 * @returns {Array}
 */
const sortData = (arr, key, dir, getValue) => {
    if (!key) return arr;
    return arr.toSorted((a, b) => {
        const av = getValue ? getValue(a, key) : a[key];
        const bv = getValue ? getValue(b, key) : b[key];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return dir === 'asc' ? cmp : -cmp;
    });
};

/**
 * Clickable <th> that shows a sort indicator and toggles asc/desc.
 * @param {Object} props
 * @param {string} props.sortKey
 * @param {{key: string|null, dir: string}} props.config
 * @param {Function} props.onSort
 */
const SortTh = ({ children, sortKey, config, onSort }) => {
    const isActive = config.key === sortKey;
    const handleKey = (e) => { if (e.key === 'Enter' || e.key === ' ') onSort(sortKey); };
    return (
        <th
            onClick={() => onSort(sortKey)}
            onKeyDown={handleKey}
            tabIndex={0}
            role="columnheader"
            aria-sort={isActive ? (config.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
            className={`sortable-th${isActive ? ' sort-active' : ''}`}
        >
            {children}
            <span className="sort-indicator">
                {isActive ? (config.dir === 'asc' ? '▲' : '▼') : '⇅'}
            </span>
        </th>
    );
};

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

    // Sort state for each analytics table: { key: string|null, dir: 'asc'|'desc' }
    const [deptStudentSort, setDeptStudentSort] = useState({ key: null, dir: 'asc' });
    const [studentQSort, setStudentQSort] = useState({ key: null, dir: 'asc' });
    const [questionDeptSort, setQuestionDeptSort] = useState({ key: null, dir: 'asc' });
    const [classComparisonSort, setClassComparisonSort] = useState({ key: null, dir: 'asc' });
    const [subjectStatsSort, setSubjectStatsSort] = useState({ key: null, dir: 'asc' });

    // Class comparison and subject breakdown data
    const [classComparisonData, setClassComparisonData] = useState(null);
    const [subjectStatsData, setSubjectStatsData] = useState(null);

    /** Toggle sort key/direction for the department-view student table */
    const handleDeptStudentSort = useCallback((key) => {
        setDeptStudentSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    }, []);

    /** Toggle sort key/direction for the student-view question-attempts table */
    const handleStudentQSort = useCallback((key) => {
        setStudentQSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    }, []);

    /** Toggle sort key/direction for the question-view department-breakdown table */
    const handleQuestionDeptSort = useCallback((key) => {
        setQuestionDeptSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    }, []);

    const handleClassComparisonSort = useCallback((key) => {
        setClassComparisonSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    }, []);

    const handleSubjectStatsSort = useCallback((key) => {
        setSubjectStatsSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    }, []);

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

    const loadClassComparison = useCallback(async () => {
        const apiCall = () => axios.post(`${config.api}/getAdvancedStatistics.php`,
            { type: 'classComparison' },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` } }
        );
        await handleApiCall(
            apiCall,
            setClassComparisonData,
            setIsLoading,
            null,
            setSendErrorMessage,
            '',
            'Failed to load class comparison'
        );
    }, [config.api, currentUser.token, setSendErrorMessage]);

    const loadSubjectStats = useCallback(async (studentId) => {
        const apiCall = () => axios.post(`${config.api}/getAdvancedStatistics.php`,
            { type: 'subjectStats', studentId },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` } }
        );
        await handleApiCall(
            apiCall,
            setSubjectStatsData,
            setIsLoading,
            null,
            setSendErrorMessage,
            '',
            'Failed to load subject breakdown'
        );
    }, [config.api, currentUser.token, setSendErrorMessage]);

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

    // Auto-load class comparison when that view is selected
    useEffect(() => {
        if (selectedView === 'classComparison') {
            loadClassComparison();
        }
    }, [selectedView, loadClassComparison]);

    // Auto-load subject breakdown when a student is selected
    useEffect(() => {
        if (selectedView === 'student' && selectedStudent) {
            loadSubjectStats(selectedStudent);
        }
    }, [selectedStudent, selectedView, loadSubjectStats]);

    // Clear analytics data and reset selections when view changes
    useEffect(() => {
        setAnalyticsData(null);
        setClassComparisonData(null);
        setSubjectStatsData(null);
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

                {data.studentBreakdown && (() => {
                    const sortedStudents = sortData(
                        data.studentBreakdown,
                        deptStudentSort.key,
                        deptStudentSort.dir,
                        (student, key) => {
                            if (key === 'ragScore') return ragScore(student.redCount, student.amberCount, student.greenCount) ?? -Infinity;
                            if (key === 'badgeCount') {
                                const sd = students.find(s => s.userName === student.name);
                                const sid = sd ? sd.id : null;
                                const rewards = sid ? studentRewardsCache[sid.toString()] : null;
                                return rewards ? getHighestBadges(rewards).length : -1;
                            }
                            return student[key];
                        }
                    );
                    return (
                        <div className="table-container">
                            <div className="analytics-table-toolbar">
                                <h4>Student Performance in {selectedDepartment}</h4>
                                <button className="export-csv-btn" onClick={() => downloadCsv(
                                    sortedStudents.map(s => ({
                                        Student:     s.name,
                                        Topics:      s.topicsAnswered,
                                        Questions:   s.questionsAnswered,
                                        Red:         s.redCount,
                                        'Red %':     s.redPercent,
                                        Amber:       s.amberCount,
                                        'Amber %':   s.amberPercent,
                                        Green:       s.greenCount,
                                        'Green %':   s.greenPercent,
                                        'RAG Score': (() => { const sc = ragScore(s.redCount, s.amberCount, s.greenCount); return sc === null ? '' : sc; })()
                                    })),
                                    `students_${selectedDepartment}.csv`
                                )}>
                                    <i className="fa-solid fa-download" aria-hidden="true" /> Export CSV
                                </button>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <SortTh sortKey="name" config={deptStudentSort} onSort={handleDeptStudentSort}>Student</SortTh>
                                        <SortTh sortKey="topicsAnswered" config={deptStudentSort} onSort={handleDeptStudentSort}>Topics</SortTh>
                                        <SortTh sortKey="questionsAnswered" config={deptStudentSort} onSort={handleDeptStudentSort}>Questions</SortTh>
                                        <SortTh sortKey="redCount" config={deptStudentSort} onSort={handleDeptStudentSort}>Red</SortTh>
                                        <SortTh sortKey="amberCount" config={deptStudentSort} onSort={handleDeptStudentSort}>Amber</SortTh>
                                        <SortTh sortKey="greenCount" config={deptStudentSort} onSort={handleDeptStudentSort}>Green</SortTh>
                                        <SortTh sortKey="ragScore" config={deptStudentSort} onSort={handleDeptStudentSort}>RAG Score</SortTh>
                                        <SortTh sortKey="badgeCount" config={deptStudentSort} onSort={handleDeptStudentSort}>Badges</SortTh>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStudents.map((student, index) => {
                                        const studentData = students.find(s => s.userName === student.name);
                                        const studentId = studentData ? studentData.id : null;
                                        const rewards = studentId ? studentRewardsCache[studentId.toString()] : null;
                                        const badges = rewards ? getHighestBadges(rewards) : null;

                                        return (
                                            <tr key={student.name}>
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
                                                <td className={(() => { const s = ragScore(student.redCount, student.amberCount, student.greenCount); return s === null ? '' : s > 0 ? 'green-stat' : s < 0 ? 'red-stat' : 'amber-stat'; })()}>
                                                    {(() => { const s = ragScore(student.redCount, student.amberCount, student.greenCount); return s === null ? '—' : (s > 0 ? `+${s}%` : `${s}%`); })()}
                                                </td>
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
                    );
                })()}
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
                        <div className="stat-label">No Rating</div>
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
                                <span className="rag-label">No rating:</span>
                                <span className="rag-count">{data.unratedCount || 0}</span>
                                <span className="rag-percent">({data.unratedPercent || 0}%)</span>
                            </div>
                        )}
                    </div>
                </div>

                {data.questionAttempts && (() => {
                    const ragOrder = { R: 1, A: 2, G: 3 };
                    const sortedAttempts = sortData(
                        data.questionAttempts,
                        studentQSort.key,
                        studentQSort.dir,
                        (attempt, key) => key === 'latestRag' ? (ragOrder[attempt.latestRag] ?? 0) : attempt[key]
                    );
                    return (
                        <div className="table-container">
                            <div className="analytics-table-toolbar">
                                <h4>Question Attempts</h4>
                                <button className="export-csv-btn" onClick={() => downloadCsv(
                                    sortedAttempts.map(a => ({
                                        Question:     a.question,
                                        Topic:        a.topicName,
                                        Attempts:     a.attemptCount,
                                        'Latest RAG': a.latestRag === 'R' ? 'Red' : a.latestRag === 'A' ? 'Amber' : a.latestRag === 'G' ? 'Green' : 'Unrated'
                                    })),
                                    `question_attempts_student_${selectedStudent}.csv`
                                )}>
                                    <i className="fa-solid fa-download" aria-hidden="true" /> Export CSV
                                </button>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <SortTh sortKey="question" config={studentQSort} onSort={handleStudentQSort}>Question</SortTh>
                                        <SortTh sortKey="topicName" config={studentQSort} onSort={handleStudentQSort}>Topic</SortTh>
                                        <SortTh sortKey="attemptCount" config={studentQSort} onSort={handleStudentQSort}>Attempts</SortTh>
                                        <SortTh sortKey="latestRag" config={studentQSort} onSort={handleStudentQSort}>Latest RAG</SortTh>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedAttempts.map((attempt) => (
                                        <tr key={attempt.question}>
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
                    );
                })()}

                {subjectStatsData && subjectStatsData.length > 0 && (() => {
                    const sortedSubjects = sortData(
                        subjectStatsData,
                        subjectStatsSort.key,
                        subjectStatsSort.dir,
                        (row, key) => key === 'ragScore' ? (row.ragScore ?? -Infinity) : row[key]
                    );
                    return (
                        <div className="table-container">
                            <div className="analytics-table-toolbar">
                                <h4>Performance by Subject</h4>
                                <button className="export-csv-btn" onClick={() => downloadCsv(
                                    sortedSubjects.map(s => ({
                                        Subject:     s.subjectName,
                                        Topics:      s.topicsAnswered,
                                        Questions:   s.questionsAnswered,
                                        Attempts:    s.totalAttempts,
                                        Red:         s.redCount,
                                        Amber:       s.amberCount,
                                        Green:       s.greenCount,
                                        'Green %':   s.greenPercent,
                                        'RAG Score': s.ragScore !== null ? s.ragScore : ''
                                    })),
                                    `subject_breakdown_student_${selectedStudent}.csv`
                                )}>
                                    <i className="fa-solid fa-download" aria-hidden="true" /> Export CSV
                                </button>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <SortTh sortKey="subjectName"       config={subjectStatsSort} onSort={handleSubjectStatsSort}>Subject</SortTh>
                                        <SortTh sortKey="topicsAnswered"    config={subjectStatsSort} onSort={handleSubjectStatsSort}>Topics</SortTh>
                                        <SortTh sortKey="questionsAnswered" config={subjectStatsSort} onSort={handleSubjectStatsSort}>Questions</SortTh>
                                        <SortTh sortKey="totalAttempts"     config={subjectStatsSort} onSort={handleSubjectStatsSort}>Attempts</SortTh>
                                        <SortTh sortKey="redCount"          config={subjectStatsSort} onSort={handleSubjectStatsSort}>Red</SortTh>
                                        <SortTh sortKey="amberCount"        config={subjectStatsSort} onSort={handleSubjectStatsSort}>Amber</SortTh>
                                        <SortTh sortKey="greenCount"        config={subjectStatsSort} onSort={handleSubjectStatsSort}>Green</SortTh>
                                        <SortTh sortKey="greenPercent"      config={subjectStatsSort} onSort={handleSubjectStatsSort}>Green %</SortTh>
                                        <SortTh sortKey="ragScore"          config={subjectStatsSort} onSort={handleSubjectStatsSort}>RAG Score</SortTh>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedSubjects.map((row) => (
                                        <tr key={row.subjectName}>
                                            <td><strong>{row.subjectName}</strong></td>
                                            <td>{row.topicsAnswered}</td>
                                            <td>{row.questionsAnswered}</td>
                                            <td>{row.totalAttempts}</td>
                                            <td className="red-stat">{row.redCount}</td>
                                            <td className="amber-stat">{row.amberCount}</td>
                                            <td className="green-stat">{row.greenCount}</td>
                                            <td>{row.greenPercent}%</td>
                                            <td className={(() => { const s = row.ragScore; return s === null ? '' : s > 0 ? 'green-stat' : s < 0 ? 'red-stat' : 'amber-stat'; })()}>
                                                {row.ragScore === null ? '—' : (row.ragScore > 0 ? `+${row.ragScore}%` : `${row.ragScore}%`)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}

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

                {data.departmentBreakdown && (() => {
                    const sortedDepts = sortData(
                        data.departmentBreakdown,
                        questionDeptSort.key,
                        questionDeptSort.dir,
                        (dept, key) => {
                            if (key === 'ragScore') return ragScore(dept.redCount, dept.amberCount, dept.greenCount) ?? -Infinity;
                            return dept[key];
                        }
                    );
                    return (
                        <div className="table-container">
                            <div className="analytics-table-toolbar">
                                <h4>Performance by Department</h4>
                                <button className="export-csv-btn" onClick={() => downloadCsv(
                                    sortedDepts.map(d => ({
                                        Department:    d.department,
                                        Students:      d.studentCount,
                                        Attempts:      d.attempts,
                                        Red:           d.redCount,
                                        Amber:         d.amberCount,
                                        Green:         d.greenCount,
                                        'Success Rate': d.successRate,
                                        'RAG Score':   (() => { const s = ragScore(d.redCount, d.amberCount, d.greenCount); return s === null ? '' : s; })()
                                    })),
                                    `question_${selectedQuestion}_departments.csv`
                                )}>
                                    <i className="fa-solid fa-download" aria-hidden="true" /> Export CSV
                                </button>
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <SortTh sortKey="department" config={questionDeptSort} onSort={handleQuestionDeptSort}>Department</SortTh>
                                        <SortTh sortKey="studentCount" config={questionDeptSort} onSort={handleQuestionDeptSort}>Students</SortTh>
                                        <SortTh sortKey="attempts" config={questionDeptSort} onSort={handleQuestionDeptSort}>Attempts</SortTh>
                                        <SortTh sortKey="redCount" config={questionDeptSort} onSort={handleQuestionDeptSort}>Red</SortTh>
                                        <SortTh sortKey="amberCount" config={questionDeptSort} onSort={handleQuestionDeptSort}>Amber</SortTh>
                                        <SortTh sortKey="greenCount" config={questionDeptSort} onSort={handleQuestionDeptSort}>Green</SortTh>
                                        <SortTh sortKey="successRate" config={questionDeptSort} onSort={handleQuestionDeptSort}>Success Rate</SortTh>
                                        <SortTh sortKey="ragScore" config={questionDeptSort} onSort={handleQuestionDeptSort}>RAG Score</SortTh>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedDepts.map((dept) => (
                                        <tr key={dept.department}>
                                            <td>{dept.department}</td>
                                            <td>{dept.studentCount}</td>
                                            <td>{dept.attempts}</td>
                                            <td className="red-stat">{dept.redCount}</td>
                                            <td className="amber-stat">{dept.amberCount}</td>
                                            <td className="green-stat">{dept.greenCount}</td>
                                            <td>{dept.successRate}%</td>
                                            <td className={(() => { const s = ragScore(dept.redCount, dept.amberCount, dept.greenCount); return s === null ? '' : s > 0 ? 'green-stat' : s < 0 ? 'red-stat' : 'amber-stat'; })()}>
                                                {(() => { const s = ragScore(dept.redCount, dept.amberCount, dept.greenCount); return s === null ? '—' : (s > 0 ? `+${s}%` : `${s}%`); })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}
            </div>
        );
    };

    const renderClassComparison = (data) => {
        if (!data) return null;
        if (data.length === 0) return <div className="analytics-section"><h3>Compare All Classes</h3><p>No class data found.</p></div>;

        const sorted = sortData(
            data,
            classComparisonSort.key,
            classComparisonSort.dir,
            (row, key) => key === 'ragScore' ? (row.ragScore ?? -Infinity) : row[key]
        );

        const csvRows = sorted.map(r => ({
            Class:                r.department,
            Students:             r.studentCount,
            'Questions Answered': r.questionsAnswered,
            'Topics Answered':    r.topicsAnswered,
            Red:                  r.redCount,
            Amber:                r.amberCount,
            Green:                r.greenCount,
            'Total Responses':    r.totalResponses,
            'RAG Score':          r.ragScore !== null ? r.ragScore : ''
        }));

        return (
            <div className="analytics-section">
                <h3>Compare All Classes</h3>
                <div className="table-container">
                    <div className="analytics-table-toolbar">
                        <h4>All Classes Overview</h4>
                        <button className="export-csv-btn" onClick={() => downloadCsv(csvRows, 'class_comparison.csv')}>
                            <i className="fa-solid fa-download" aria-hidden="true" /> Export CSV
                        </button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <SortTh sortKey="department"        config={classComparisonSort} onSort={handleClassComparisonSort}>Class</SortTh>
                                <SortTh sortKey="studentCount"      config={classComparisonSort} onSort={handleClassComparisonSort}>Students</SortTh>
                                <SortTh sortKey="questionsAnswered" config={classComparisonSort} onSort={handleClassComparisonSort}>Questions</SortTh>
                                <SortTh sortKey="topicsAnswered"    config={classComparisonSort} onSort={handleClassComparisonSort}>Topics</SortTh>
                                <SortTh sortKey="redCount"          config={classComparisonSort} onSort={handleClassComparisonSort}>Red</SortTh>
                                <SortTh sortKey="amberCount"        config={classComparisonSort} onSort={handleClassComparisonSort}>Amber</SortTh>
                                <SortTh sortKey="greenCount"        config={classComparisonSort} onSort={handleClassComparisonSort}>Green</SortTh>
                                <SortTh sortKey="totalResponses"    config={classComparisonSort} onSort={handleClassComparisonSort}>Responses</SortTh>
                                <SortTh sortKey="ragScore"          config={classComparisonSort} onSort={handleClassComparisonSort}>RAG Score</SortTh>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((row) => (
                                <tr key={row.department}>
                                    <td>
                                        <span
                                            className="clickable-student-name"
                                            style={{ cursor: 'pointer', color: '#1890ff', textDecoration: 'underline' }}
                                            title="Click to view class detail"
                                            onClick={() => { setSelectedView('department'); setSelectedDepartment(row.department); }}
                                        >
                                            {row.department}
                                        </span>
                                    </td>
                                    <td>{row.studentCount}</td>
                                    <td>{row.questionsAnswered}</td>
                                    <td>{row.topicsAnswered}</td>
                                    <td className="red-stat">{row.redCount}</td>
                                    <td className="amber-stat">{row.amberCount}</td>
                                    <td className="green-stat">{row.greenCount}</td>
                                    <td>{row.totalResponses}</td>
                                    <td className={(() => { const s = row.ragScore; return s === null ? '' : s > 0 ? 'green-stat' : s < 0 ? 'red-stat' : 'amber-stat'; })()}>
                                        {row.ragScore === null ? '—' : (row.ragScore > 0 ? `+${row.ragScore}%` : `${row.ragScore}%`)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
                            <option value="classComparison">Compare All Classes</option>
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
                {selectedView === 'classComparison' && renderClassComparison(classComparisonData)}
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