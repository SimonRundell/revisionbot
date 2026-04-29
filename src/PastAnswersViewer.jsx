import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spin } from 'antd';

import { handleApiCall } from './utils/apiHelpers';
import { formatDate, formatDateTime } from './utils/dateHelpers';
import renderAttachments from './utils/renderAttachments';
import RichTextContent from './RichTextContent';
import { richTextPreview } from './utils/richText';

/****************************************************************************
 * PastAnswersViewer Component
 * Renders the past answers and feedback for the user.
 * Includes options to view past responses with AI and teacher feedback.
 * Displays response history in chronological order with detailed information.
 * 
 * @param {Object} props - Component props
 * @param {string|number} props.userId - The current user's ID for filtering responses
 * @param {Object} props.currentUser - Current user object with authentication token
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Function} props.setSendErrorMessage - Function to set error messages in parent component
 * @param {Function} props.setSendSuccessMessage - Function to set success messages in parent component
 * @returns {JSX.Element} The PastAnswersViewer component
****************************************************************************/

function PastAnswersViewer ({userId, currentUser, config, setSendErrorMessage, setSendSuccessMessage}) {

    const [pastResponses, setPastResponses] = useState([]);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    /**
     * Load past responses for the current user from the API
     * Fetches user's response history with AI and teacher feedback
     * Only executes if userId and authentication token are available
     */
    const loadPastResponses = useCallback(() => {
        if (!userId || !currentUser?.token) {
            return;
        }

        const apiCall = () => axios.post(
            `${config.api}/getUserResponses.php`,
            { userId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            }
        );

        handleApiCall(
            apiCall,
            setPastResponses,
            setIsLoading,
            setSendSuccessMessage,
            setSendErrorMessage,
            '',
            'Failed to load past responses.'
        );
    }, [
        userId,
        currentUser?.token,
        config.api,
        setSendSuccessMessage,
        setSendErrorMessage
    ]);

    useEffect(() => {
        loadPastResponses();
    }, [loadPastResponses]);

    return (
        <div className="student-interface">
            <div className="interface-header">
                <h1>Review Past Answers</h1>
            </div>

            <div className="past-answers-section">
                {isLoading ? (
                    <div className="past-answers-loading">
                        <Spin size="large" />
                    </div>
                ) : (
                    <>
                        {pastResponses.length === 0 ? (
                            <div className="no-responses-message">
                                <p>You haven&apos;t completed any questions with AI feedback yet.</p>
                                <p>Complete some practice questions to see your past answers and feedback here.</p>
                            </div>
                        ) : (
                            <div className="past-responses-list">
                                {pastResponses.map((response, index) => (
                                    <div
                                        key={response.responseId}
                                        className="past-response-item"
                                        onClick={() => setSelectedResponse(response)}
                                    >
                                        <div className="response-number">#{index + 1}</div>
                                        <div className="response-preview">
                                            <div className="response-subject-topic">
                                                {response.subjectName} &gt; {response.topicName}
                                            </div>
                                            <div className="response-question-preview">
                                                {richTextPreview(response.question.question, 100)}
                                            </div>
                                            <div className="response-date">
                                                Completed: {formatDate(response.createdAt)}
                                                {response.attemptNumber > 1 && (
                                                    <span className="attempt-badge"> Attempt #{response.attemptNumber}</span>
                                                )}
                                                {(response.teacherComment || response.teacherRating) && (
                                                    <span className="teacher-feedback-notification">
                                                        New Teacher Feedback!
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="response-arrow">&rarr;</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {selectedResponse && (
                <div className="answer-modal">
                    <div className="answer-modal-content">
                        <div className="answer-modal-header">
                            <h2>Review Past Answer</h2>
                            <button
                                className="close-modal"
                                onClick={() => setSelectedResponse(null)}
                                aria-label="Close past response"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="answer-modal-body">
                            <div className="question-section">
                                <h3>Question:</h3>
                                <RichTextContent value={selectedResponse.question.question} className="question-content" />

                                {selectedResponse.question.attachments ? (
                                    <div className="attachments-section">
                                        <h4>Attachments:</h4>
                                        {renderAttachments(selectedResponse.question.attachments)}
                                    </div>
                                ) : (<p>No attachments available</p>)}
                            </div>

                            <div className="answer-section">
                                <h3>Your Answer:</h3>
                                <RichTextContent value={selectedResponse.studentAnswer} className="student-answer-display" />
                                
                                {selectedResponse.studentGraphic && (
                                    <div className="student-graphic-section" style={{ marginTop: '15px' }}>
                                        <h4>Your Uploaded Image:</h4>
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
                                <div
                                    className="ai-feedback-display"
                                    dangerouslySetInnerHTML={{ __html: selectedResponse.aiFeedback }}
                                />
                            </div>

                            {(selectedResponse.teacherComment || selectedResponse.teacherRating) && (
                                <div className="teacher-feedback-section-student">
                                    <h3>
                                        Teacher Feedback
                                        {selectedResponse.teacherRating && (
                                            <span
                                                className="teacher-rating-display"
                                                style={{
                                                    color: selectedResponse.teacherRating === 'R' ? '#dc3545' :
                                                        selectedResponse.teacherRating === 'A' ? '#ffc107' : '#28a745'
                                                }}
                                            >
                                                ({selectedResponse.teacherRating === 'R'
                                                    ? 'Needs Improvement'
                                                    : selectedResponse.teacherRating === 'A'
                                                        ? 'Good Progress'
                                                        : 'Excellent'})
                                            </span>
                                        )}
                                    </h3>
                                    {selectedResponse.teacherComment && (
                                        <RichTextContent value={selectedResponse.teacherComment} className="teacher-comment-display" />
                                    )}
                                    <div className="teacher-feedback-meta">
                                        <p>
                                            <em>
                                                Feedback from {selectedResponse.teacherName || 'your teacher'} on{' '}
                                                {formatDateTime(selectedResponse.teacherFeedbackTimestamp)}
                                            </em>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="response-metadata">
                                <p><strong>Subject:</strong> {selectedResponse.subjectName}</p>
                                <p><strong>Topic:</strong> {selectedResponse.topicName}</p>
                                <p><strong>Completed:</strong> {formatDateTime(selectedResponse.createdAt)}</p>
                                {selectedResponse.timeTaken && (
                                    <p>
                                        <strong>Time Taken:</strong> {Math.floor(selectedResponse.timeTaken / 60)}m{' '}
                                        {selectedResponse.timeTaken % 60}s
                                    </p>
                                )}
                                {selectedResponse.attemptNumber > 1 && (
                                    <p><strong>Attempt:</strong> #{selectedResponse.attemptNumber}</p>
                                )}
                            </div>
                        </div>

                        <div className="answer-modal-footer">
                            <button
                                className="btn-primary"
                                onClick={() => setSelectedResponse(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PastAnswersViewer;
