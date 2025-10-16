import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spin } from 'antd';

import { handleApiCall } from './utils/apiHelpers';
import renderAttachments from './utils/renderAttachments';

const PastAnswersViewer = ({
    userId,
    currentUser,
    config,
    setSendErrorMessage,
    setSendSuccessMessage
}) => {
    const [pastResponses, setPastResponses] = useState([]);
    const [selectedResponse, setSelectedResponse] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

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
            'Past responses loaded successfully.',
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
                                            {response.question.question.length > 100
                                                ? `${response.question.question.substring(0, 100)}...`
                                                : response.question.question
                                            }
                                        </div>
                                        <div className="response-date">
                                            Completed: {new Date(response.createdAt).toLocaleDateString()}
                                            {response.attemptNumber > 1 && (
                                                <span className="attempt-badge"> (Attempt #{response.attemptNumber})</span>
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
                                <h3>Your Answer:</h3>
                                <div className="past-answer-display">
                                    {selectedResponse.studentAnswer}
                                </div>
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
                                        <div className="teacher-comment-display">
                                            {selectedResponse.teacherComment}
                                        </div>
                                    )}
                                    <div className="teacher-feedback-meta">
                                        <p>
                                            <em>
                                                Feedback from {selectedResponse.teacherName || 'your teacher'} on{' '}
                                                {new Date(selectedResponse.teacherFeedbackTimestamp).toLocaleString()}
                                            </em>
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="response-metadata">
                                <p><strong>Subject:</strong> {selectedResponse.subjectName}</p>
                                <p><strong>Topic:</strong> {selectedResponse.topicName}</p>
                                <p><strong>Completed:</strong> {new Date(selectedResponse.createdAt).toLocaleString()}</p>
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
