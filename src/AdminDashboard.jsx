import { useState, useEffect } from 'react';
import axios from 'axios';
import { Spin, Switch } from 'antd';
import { handleApiCall } from './utils/apiHelpers';
import { formatDate, formatTime, formatDateTime } from './utils/dateHelpers';
import './App.css';

/****************************************************************************
 * AdminDashboard Component
 * Renders the admin dashboard for managing student responses.
 * Includes filtering, viewing, and providing feedback on student answers.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Object} props.currentUser - Current user object with authentication token and admin details
 * @param {Function} props.setSendErrorMessage - Function to set error messages in parent component
 * @param {Function} props.setSendSuccessMessage - Function to set success messages in parent component
 * @returns {JSX.Element} The AdminDashboard component
****************************************************************************/

function AdminDashboard ({ config, currentUser, setSendErrorMessage, setSendSuccessMessage }) {
    const [allResponses, setAllResponses] = useState([]);
    const [filteredResponses, setFilteredResponses] = useState([]);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [teacherFeedback, setTeacherFeedback] = useState({
        comment: '',
        rating: ''
    });
    const [filters, setFilters] = useState({
        student: '',
        subject: '',
        topic: '',
        dateFrom: '',
        dateTo: '',
        unmarked: false
    });
    
    // Get unique values for filter dropdowns
    const uniqueStudents = [...new Set(allResponses.map(r => r.studentName))].sort();
    const uniqueSubjects = [...new Set(allResponses.map(r => r.subjectName))].sort();
    const uniqueTopics = [...new Set(allResponses.map(r => r.topicName))].sort();

    // Load all student responses on component mount
    useEffect(() => {
        const apiCall = () => axios.post(config.api + '/getAllStudentResponses.php',
            {},
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            }
        );

        handleApiCall(
            apiCall,
            setAllResponses,
            setIsLoading,
            setSendSuccessMessage,
            setSendErrorMessage,
            '',
            'Failed to load student responses.'
        );
    }, [config.api, currentUser.token, setSendErrorMessage, setSendSuccessMessage]);

    // Apply filters whenever responses or filters change
    useEffect(() => {
        let filtered = allResponses;

        if (filters.student) {
            filtered = filtered.filter(r => r.studentName === filters.student);
        }
        if (filters.subject) {
            filtered = filtered.filter(r => r.subjectName === filters.subject);
        }
        if (filters.topic) {
            filtered = filtered.filter(r => r.topicName === filters.topic);
        }
        if (filters.dateFrom) {
            filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(filters.dateFrom));
        }
        if (filters.dateTo) {
            filtered = filtered.filter(r => new Date(r.createdAt) <= new Date(filters.dateTo + 'T23:59:59'));
        }
        if (filters.unmarked) {
            filtered = filtered.filter(r => !r.teacherRating || r.teacherRating === null || r.teacherRating === '');
        }

        setFilteredResponses(filtered);
    }, [allResponses, filters]);

    /**
     * Handle filter changes for response filtering
     * Updates the specified filter type with new value
     * 
     * @param {string} filterType - The type of filter to update (student, subject, topic, dateFrom, dateTo, unmarked)
     * @param {string|boolean} value - The new filter value
     */
    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    /**
     * Clear all active filters and reset to default state
     * Resets all filter fields to empty/default values
     */
    const clearFilters = () => {
        setFilters({
            student: '',
            subject: '',
            topic: '',
            dateFrom: '',
            dateTo: '',
            unmarked: false
        });
    };

    /**
     * Handle selection of a student response for detailed view
     * Sets the selected response and initializes teacher feedback form
     * 
     * @param {Object} response - The student response object containing answer, AI feedback, and existing teacher feedback
     */
    const handleResponseClick = (response) => {
        setSelectedResponse(response);
        setTeacherFeedback({
            comment: response.teacherComment || '',
            rating: response.teacherRating || ''
        });
    };

    /**
     * Save teacher feedback for the selected student response
     * Submits teacher comment and rating to database and updates local state
     * 
     * @async
     * @returns {Promise<void>} Promise that resolves when feedback is saved
     */
    const saveTeacherFeedback = async () => {
        if (!selectedResponse) return;

        setIsSaving(true);
        
        try {
            const response = await axios.post(`${config.api}/saveTeacherFeedback.php`, {
                responseId: selectedResponse.responseId,
                teacherComment: teacherFeedback.comment,
                teacherRating: teacherFeedback.rating,
                teacherId: currentUser.id
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });

            if (response.data.success) {
                setSendSuccessMessage('Teacher feedback saved successfully!');
                
                // Update the response in our local state
                const updatedResponses = allResponses.map(r => 
                    r.responseId === selectedResponse.responseId 
                        ? {
                            ...r, 
                            teacherComment: teacherFeedback.comment,
                            teacherRating: teacherFeedback.rating,
                            teacherFeedbackTimestamp: new Date().toISOString(),
                            teacherId: currentUser.id,
                            teacherName: currentUser.userName
                        }
                        : r
                );
                setAllResponses(updatedResponses);
                
                // Update the selected response
                setSelectedResponse(prev => ({
                    ...prev,
                    teacherComment: teacherFeedback.comment,
                    teacherRating: teacherFeedback.rating,
                    teacherFeedbackTimestamp: new Date().toISOString(),
                    teacherId: currentUser.id,
                    teacherName: currentUser.userName
                }));
            } else {
                setSendErrorMessage('Failed to save teacher feedback: ' + response.data.error);
            }
        } catch (error) {
            console.error('Error saving teacher feedback:', error);
            setSendErrorMessage('Error saving teacher feedback. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const getRatingColor = (rating) => {
        switch(rating) {
            case 'R': return '#dc3545'; // Red
            case 'A': return '#ffc107'; // Amber
            case 'G': return '#28a745'; // Green
            default: return '#6c757d'; // Gray
        }
    };

    const getRatingText = (rating) => {
        switch(rating) {
            case 'R': return 'Red - Needs Improvement';
            case 'A': return 'Amber - Good Progress';
            case 'G': return 'Green - Excellent';
            default: return 'Not Rated';
        }
    };

    const renderAttachments = (attachments) => {
        if (!attachments) return null;

        try {
            const attachmentList = JSON.parse(attachments);
            return attachmentList.map((attachment, index) => {
                const { filename, data, type } = attachment;
                
                if (type.startsWith('image/')) {
                    return (
                        <div key={index} className="attachment-item">
                            <h4>{filename}</h4>
                            <img 
                                src={`${data}`} 
                                alt={filename}
                                className="question-image"
                                style={{ maxWidth: '25%', height: 'auto', marginBottom: '10px' }}
                            />
                        </div>
                    );
                } else {
                    return (
                        <div key={index} className="attachment-item">
                            <h4>{filename}</h4>
                            <a 
                                href={`data:${type};base64,${data}`}
                                download={filename}
                                className="btn-secondary"
                            >
                                Download {filename}
                            </a>
                        </div>
                    );
                }
            });
        } catch (error) {
            console.error('Error parsing attachments:', error);
            return <p>Error loading attachments</p>;
        }
    };

    return (
        <>
            {isLoading && <div className="central-overlay-spinner">            
                <div className="spinner-text">&nbsp;&nbsp;
                    <Spin size="large" />
                    Loading student responses...
                </div> 
            </div>}

            <div className="admin-dashboard">
                <div className="dashboard-header">
                    <h1>Student Response Review Dashboard</h1>
                    <div className="dashboard-stats">
                        <span>Total Responses: {allResponses.length}</span>
                        <span>Filtered: {filteredResponses.length}</span>
                        <span>Students: {uniqueStudents.length}</span>
                    </div>
                    {(filters.dateFrom || filters.dateTo) && (
                        <div className="active-date-filter">
                            <strong>Date Range: </strong>
                            {filters.dateFrom && <span>From {formatDate(filters.dateFrom)}</span>}
                            {filters.dateFrom && filters.dateTo && <span> - </span>}
                            {filters.dateTo && <span>To {formatDate(filters.dateTo)}</span>}
                        </div>
                    )}
                </div>

                <div className="dashboard-filters">
                    <div className="filter-columns">
                        <div className="filter-column-left">
                            <label htmlFor="student">Filter By Student</label>
                            <select 
                                value={filters.student} 
                                onChange={(e) => handleFilterChange('student', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Students</option>
                                {uniqueStudents.map(student => (
                                    <option key={student} value={student}>{student}</option>
                                ))}
                            </select>
                        <label htmlFor="subject">Filter by Subject</label>
                            <select 
                                value={filters.subject} 
                                onChange={(e) => handleFilterChange('subject', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Subjects</option>
                                {uniqueSubjects.map(subject => (
                                    <option key={subject} value={subject}>{subject}</option>
                                ))}
                            </select>
                            <label htmlFor="topic">Filter by Topic</label>
                            <select 
                                value={filters.topic} 
                                onChange={(e) => handleFilterChange('topic', e.target.value)}
                                className="filter-select"
                            >
                                <option value="">All Topics</option>
                                {uniqueTopics.map(topic => (
                                    <option key={topic} value={topic}>{topic}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-column-right">
                            <label htmlFor="dateFrom">From Date</label>
                            <input 
                                type="date" 
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                className="filter-date"
                            />

                            <label htmlFor="dateTo">To Date</label>
                            <input 
                                type="date" 
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                className="filter-date"
                            />

                            <div className="filter-switch-container">
                                <label className="filter-switch-label">
                                    <Switch 
                                        checked={filters.unmarked}
                                        onChange={(checked) => handleFilterChange('unmarked', checked)}
                                    />
                                    <span className="filter-switch-text">{filters.unmarked ? 'Unmarked Only' : 'Show All'}  </span>
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="filter-actions">
                        <button onClick={clearFilters} className="btn-secondary">Clear Filters</button>
                    </div>
                </div>

                <div className="responses-list">
                    {filteredResponses.length === 0 ? (
                        <div className="no-responses-message">
                            <p>No student responses found matching the current filters.</p>
                        </div>
                    ) : (
                        filteredResponses.map(response => (
                            <div 
                                key={response.responseId} 
                                className="admin-response-item"
                                onClick={() => handleResponseClick(response)}
                            >
                                <div className="response-student">
                                    <div className="student-name">{response.studentName}</div>
                                    <div className="student-email">{response.studentEmail}</div>
                                </div>
                                <div className="response-content">
                                    <div className="response-subject-topic">
                                        {response.subjectName} › {response.topicName}
                                    </div>
                                    <div className="response-question-preview">
                                        {response.question.question.length > 120 
                                            ? response.question.question.substring(0, 120) + '...'
                                            : response.question.question
                                        }
                                    </div>
                                    <div className="response-metadata">
                                        Submitted: {formatDate(response.createdAt)} at {formatTime(response.createdAt)}
                                        {response.timeTaken && (
                                            <span> • Time: {Math.floor(response.timeTaken / 60)}m {response.timeTaken % 60}s</span>
                                        )}
                                        {response.attemptNumber > 1 && (
                                            <span className="attempt-badge"> • Attempt #{response.attemptNumber}</span>
                                        )}
                                        {response.teacherRating && (
                                            <span 
                                                className="teacher-rating-badge" 
                                                style={{backgroundColor: getRatingColor(response.teacherRating)}}
                                            >
                                                {response.teacherRating}
                                            </span>
                                        )}
                                        {response.teacherComment && (
                                            <span className="teacher-comment-indicator"> • Teacher Comment</span>
                                        )}
                                    </div>
                                </div>
                                <div className="response-arrow">→</div>
                            </div>
                        ))
                    )}
                </div>

                {/* Response Review Modal */}
                {selectedResponse && (
                    <div className="answer-modal">
                        <div className="answer-modal-content">
                            <div className="answer-modal-header">
                                <h2>Student Response Review</h2>
                                <button 
                                    className="close-modal"
                                    onClick={() => setSelectedResponse(null)}
                                >
                                    ×
                                </button>
                            </div>
                            
                            <div className="answer-modal-body">
                                <div className="student-info-section">
                                    <h3>Student Information:</h3>
                                    <div className="student-info-details">
                                        <p><strong>Name:</strong> {selectedResponse.studentName}</p>
                                        <p><strong>Email:</strong> {selectedResponse.studentEmail}</p>
                                        <p><strong>Subject:</strong> {selectedResponse.subjectName}</p>
                                        <p><strong>Topic:</strong> {selectedResponse.topicName}</p>
                                        <p><strong>Submitted:</strong> {formatDateTime(selectedResponse.createdAt)}</p>
                                        {selectedResponse.timeTaken && (
                                            <p><strong>Time Taken:</strong> {Math.floor(selectedResponse.timeTaken / 60)}m {selectedResponse.timeTaken % 60}s</p>
                                        )}
                                        {selectedResponse.attemptNumber > 1 && (
                                            <p><strong>Attempt:</strong> #{selectedResponse.attemptNumber}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="question-section">
                                    <h3>Question:</h3>
                                    <div className="question-content">
                                        {selectedResponse.question.question}
                                    </div>
                                    
                                    {selectedResponse.question.attachments ? (
                                        <div className="attachments-section">
                                            <h4>Attachments:</h4>
                                            {renderAttachments(selectedResponse.question.attachments)}
                                        </div>
                                    ) : (<p>No attachments available</p>)}
                                </div>
                                
                                <div className="answer-section">
                                    <h3>Student&apos;s Answer:</h3>
                                    <div className="past-answer-display">
                                        {selectedResponse.studentAnswer}
                                    </div>
                                    
                                    {selectedResponse.studentGraphic && (
                                        <div className="student-graphic-section" style={{ marginTop: '15px' }}>
                                            <h4>Student&apos;s Uploaded Image:</h4>
                                            <img 
                                                src={selectedResponse.studentGraphic} 
                                                alt="Student uploaded graphic" 
                                                style={{ 
                                                    maxWidth: '100%', 
                                                    maxHeight: '400px',
                                                    border: '2px solid #ddd',
                                                    borderRadius: '4px',
                                                    marginTop: '10px'
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="feedback-section">
                                    <h3>AI Assessment & Feedback:</h3>
                                    <div className="ai-feedback-display" dangerouslySetInnerHTML={{__html: selectedResponse.aiFeedback}}>
                                    </div>
                                </div>

                                <div className="teacher-feedback-section">
                                    <h3>Teacher Feedback:</h3>
                                    
                                    <div className="teacher-feedback-form">
                                        <div className="rating-section">
                                            <label htmlFor="teacher-rating">RAG Rating:</label>
                                            <select 
                                                id="teacher-rating"
                                                value={teacherFeedback.rating}
                                                onChange={(e) => setTeacherFeedback(prev => ({...prev, rating: e.target.value}))}
                                                className="rating-select"
                                            >
                                                <option value="">Select Rating</option>
                                                <option value="R" style={{color: '#dc3545'}}>🔴 Red - Needs Improvement</option>
                                                <option value="A" style={{color: '#ffc107'}}>🟡 Amber - Good Progress</option>
                                                <option value="G" style={{color: '#28a745'}}>🟢 Green - Excellent</option>
                                            </select>
                                            {teacherFeedback.rating && (
                                                <div className="current-rating" style={{color: getRatingColor(teacherFeedback.rating)}}>
                                                    Current Rating: {getRatingText(teacherFeedback.rating)}
                                                </div>
                                            )}
                                        </div>

                                        <div className="comment-section">
                                            <label htmlFor="teacher-comment">Teacher Comment:</label>
                                            <textarea
                                                id="teacher-comment"
                                                value={teacherFeedback.comment}
                                                onChange={(e) => setTeacherFeedback(prev => ({...prev, comment: e.target.value}))}
                                                placeholder="Add your feedback for the student..."
                                                className="teacher-comment-textarea"
                                                rows="6"
                                            />
                                        </div>

                                        {selectedResponse.teacherFeedbackTimestamp && (
                                            <div className="existing-feedback-info">
                                                <p><strong>Previous Feedback:</strong> Added by {selectedResponse.teacherName || 'Teacher'} on {formatDateTime(selectedResponse.teacherFeedbackTimestamp)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="answer-modal-footer">
                                <button 
                                    className="btn-secondary"
                                    onClick={() => setSelectedResponse(null)}
                                >
                                    Close
                                </button>
                                <button 
                                    className="btn-primary"
                                    onClick={saveTeacherFeedback}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save Teacher Feedback'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default AdminDashboard;