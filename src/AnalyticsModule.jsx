import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { handleApiCall } from './utils/apiHelpers';
import './App.css';

/****************************************************************
 * AnalyticsModule Component
 * Renders the analytics dashboard for monitoring user activity.
 * Includes filtering and viewing feedback on student answers
 * with staticstical analysis.
*****************************************************************/

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

    const loadDepartments = useCallback(async () => {
        const apiCall = () => axios.get(`${config.api}/getAdvancedStatistics.php?type=departments`, {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
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

    const loadStudents = useCallback(async () => {
        const apiCall = () => axios.get(`${config.api}/getUsers.php`, {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });

        await handleApiCall(
            apiCall,
            (users) => setStudents(users.filter(user => user.admin !== 1)),
            setIsLoading,
            null,
            setSendErrorMessage,
            '',
            'Failed to load students'
        );
    }, [config.api, currentUser.token, setSendErrorMessage]);

    const loadQuestions = useCallback(async () => {
        const apiCall = () => axios.get(`${config.api}/getAdvancedStatistics.php?type=all_questions`, {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
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
            'Analytics loaded successfully',
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
        (student.userLocation && student.userLocation.toLowerCase().includes(studentFilter.toLowerCase()))
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
                                    <th>Improvement</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.studentBreakdown.map((student, index) => (
                                    <tr key={index}>
                                        <td>{student.name}</td>
                                        <td>{student.topicsAnswered}</td>
                                        <td>{student.questionsAnswered}</td>
                                        <td className="red-stat">{student.redCount} ({student.redPercent}%)</td>
                                        <td className="amber-stat">{student.amberCount} ({student.amberPercent}%)</td>
                                        <td className="green-stat">{student.greenCount} ({student.greenPercent}%)</td>
                                        <td className="improvement-stat">{student.improvementCount}</td>
                                    </tr>
                                ))}
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
                        <div className="stat-number">{data.improvementCount || 0}</div>
                        <div className="stat-label">Improvements</div>
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
                                    <th>Improved</th>
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
                                        <td>{attempt.improved ? '✓' : ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
                                        <div className="student-location">{student.userLocation}</div>
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
        </div>
    );
};

export default AnalyticsModule;