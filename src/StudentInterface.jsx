import { useState, useEffect } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { handleApiCall } from './utils/apiHelpers';
import {
    ensureDataUrl,
    formatAttachmentSize,
    getFileIconMeta
} from './utils/fileAttachments';
import './App.css';

const StudentInterface = ({ userId, onBack, config, currentUser, setSendErrorMessage, setSendSuccessMessage }) => {
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [showAnswerModal, setShowAnswerModal] = useState(false);
    const [studentAnswer, setStudentAnswer] = useState('');
    const [timeStarted, setTimeStarted] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
    
    // Past answers review state
    const [showPastAnswers, setShowPastAnswers] = useState(false);
    const [pastResponses, setPastResponses] = useState([]);
    const [selectedPastResponse, setSelectedPastResponse] = useState(null);

    // Load subjects on component mount
    useEffect(() => {
        // Fetch subjects from the server when the component mounts
        const apiCall = () => axios.get(config.api + '/getSubjects.php', {
            headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });

        handleApiCall(
            apiCall,
            setSubjects,
            setIsLoading,
            setSendSuccessMessage,
            setSendErrorMessage,
            'Subjects loaded successfully.',
            'Failed to load subjects.'
        );


    }, [userId, config.api, currentUser.token, setSendErrorMessage, setSendSuccessMessage]);

    const loadPastResponses = () => {
        const apiCall = () => axios.post(config.api + '/getUserResponses.php',
            { userId: userId },
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
    };

    const handleShowPastAnswers = () => {
        setShowPastAnswers(true);
        loadPastResponses();
    };

    const handleBackToPractice = () => {
        setShowPastAnswers(false);
        setSelectedPastResponse(null);
    };

    const handleSubjectChange = (event) => {
        const subjectId = event.target.value;
        setSelectedSubject(subjectId);
        setSelectedTopic(''); // Reset topic selection when subject changes
        setQuestions([]); // Clear questions when subject changes
        
        if (subjectId) {
            // Fetch topics for the selected subject
            console.log("Fetching topics for subject ID:", subjectId);
            const apiCall = () => axios.post(config.api + '/getTopics.php', 
                { subjectid: subjectId },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                }
            );

            handleApiCall(
                apiCall,
                setTopics,
                setIsLoading,
                setSendSuccessMessage,
                setSendErrorMessage,
                'Topics loaded successfully.',
                'Failed to load topics.'
            );
        } else {
            setTopics([]); // Clear topics if no subject selected
            setQuestions([]); // Clear questions when subject changes
            setSelectedTopic(''); // Reset topic selection
        }
    };

    const handleTopicChange = (event) => {
        const topicId = event.target.value;
        setSelectedTopic(topicId);

        if (topicId) {
            // Fetch questions for the selected topic
            console.log("Fetching questions for topic ID:", topicId);
            const apiCall = () => axios.post(config.api + '/getQuestions.php',
                { topicid: topicId },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                }
            );

            handleApiCall(
                apiCall,
                setQuestions,
                setIsLoading,
                setSendSuccessMessage,
                setSendErrorMessage,
                'Questions loaded successfully.',
                'Failed to load questions.'
            );
        } else {
            setQuestions([]); // Clear questions if no topic selected
        }
    };

    const handleQuestionSelect = (question) => {
        setSelectedQuestion(question);
        setStudentAnswer('');
        setTimeStarted(Date.now());
        setShowAnswerModal(true);
    };

    const handleSubmitAnswer = async () => {
        if (!studentAnswer.trim()) {
            alert('Please provide an answer before submitting.');
            return;
        }

        setIsSubmitting(true);
        setIsLoadingAI(true); // Show loading AI spinner

        const timeTaken = timeStarted ? Math.round((Date.now() - timeStarted) / 1000) : null;

        let jsonData = {
            userId: userId,
            questionId: selectedQuestion.id,
            subjectId: selectedSubject,
            topicId: selectedTopic,
            studentAnswer: studentAnswer,
            timeTaken: timeTaken,
            sessionId: sessionId
        };

        console.log("Submitting response:", jsonData);

        try {
            // Submit response to database
            const submitResponse = await axios.post(`${config.api}/submitResponse.php`, jsonData, {
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            });

            if (submitResponse.data.success) {
                // Get AI feedback
                jsonData ={
                    question: selectedQuestion.question,
                    markscheme: selectedQuestion.markscheme,
                    useranswer: studentAnswer
                };

                console.log("Requesting AI feedback with:", jsonData);

                const aiResponse = await axios.post(`${config.api}/geminiAPI.php`, jsonData, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                });

                console.log("Full AI Response received:", aiResponse.data);

                if (aiResponse.data.message) {
                    // Update response with AI feedback

                    // console.log("AI Feedback received:", aiResponse.data.message);

                    await axios.post(`${config.api}/updateResponseWithAI.php`, {
                        responseId: submitResponse.data.responseId,
                        aiFeedback: aiResponse.data.message
                    }, {
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.token}`
                        }
                    });

                    // Show AI feedback
                    showAIFeedback(aiResponse.data.message);
                    setSendSuccessMessage('Answer submitted and assessed successfully!');
                    setIsLoadingAI(false);
                } else {
                    console.log("No message field in AI response:", aiResponse.data);
                    setSendErrorMessage('Answer submitted successfully, but AI feedback is not available at this time.');
                    setShowAnswerModal(false);
                    setIsLoadingAI(false);
                }
            } else {
                setSendErrorMessage('Error submitting answer: ' + submitResponse.data.error);
                setIsLoadingAI(false);
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            setSendErrorMessage('Error submitting answer. Please try again.');
            setIsLoadingAI(false);
        } finally {
            setIsSubmitting(false);
            setIsLoadingAI(false);
        }
    };

    const showAIFeedback = (feedback) => {
        // Create feedback modal
        const feedbackModal = document.createElement('div');
        feedbackModal.className = 'ai-feedback-modal';
        feedbackModal.innerHTML = `
            <div class="ai-feedback-content">
                <div class="ai-feedback-header">
                    <h2>AI Assessment & Feedback</h2>
                    <button class="close-feedback" onclick="this.closest('.ai-feedback-modal').remove(); document.querySelector('.answer-modal').style.display = 'none';">×</button>
                </div>
                <div class="ai-feedback-body">
                    ${feedback}
                </div>
                <div class="ai-feedback-footer">
                    <button class="btn-primary" onclick="this.closest('.ai-feedback-modal').remove(); document.querySelector('.answer-modal').style.display = 'none';">Continue Studying</button>
                </div>
            </div>
        `;
        document.body.appendChild(feedbackModal);
    };

    const renderAttachments = (attachments) => {
        if (!attachments) {
            return null;
        }

        let attachmentList = [];

        if (typeof attachments === 'string') {
            const trimmed = attachments.trim();
            if (!trimmed) {
                return null;
            }

            try {
                const parsed = JSON.parse(trimmed);
                attachmentList = Array.isArray(parsed) ? parsed : [];
            } catch (error) {
                console.error('Error parsing attachments:', error);
                return <p>Error loading attachments</p>;
            }
        } else if (Array.isArray(attachments)) {
            attachmentList = attachments;
        }

        if (!attachmentList.length) {
            return null;
        }

        return attachmentList.map((attachment, index) => {
            if (!attachment) {
                return null;
            }

            const filename = attachment.name || attachment.filename || `Attachment ${index + 1}`;
            const rawData = attachment.data || attachment.fileData || attachment.base64 || '';

            let mimeType = attachment.type || attachment.mimeType || '';

            if (!mimeType && rawData) {
                const match = String(rawData).match(/^data:([^;]+);/);
                if (match && match[1]) {
                    mimeType = match[1];
                }
            }

            if (!mimeType) {
                mimeType = 'application/octet-stream';
            }

            const sizeLabel = formatAttachmentSize(attachment.size);

            const downloadUrl = ensureDataUrl(rawData, mimeType);
            const effectiveMimeType = downloadUrl.startsWith('data:') && downloadUrl.includes(';')
                ? downloadUrl.substring(5, downloadUrl.indexOf(';'))
                : mimeType;

            if (effectiveMimeType && effectiveMimeType.startsWith('image/')) {
                return (
                    <div key={`${filename}-${index}`} className="attachment-item">
                        <h4>{filename}</h4>
                        {downloadUrl ? (
                            <img
                                src={downloadUrl}
                                alt={filename}
                                className="question-image"
                                style={{ maxWidth: '25%', height: 'auto', marginBottom: '10px' }}
                            />
                        ) : (
                            <span className="attachment-file-meta">Preview unavailable</span>
                        )}
                    </div>
                );
            }

            const { label, classSuffix } = getFileIconMeta(effectiveMimeType || mimeType, filename);

            return (
                <div key={`${filename}-${index}`} className="attachment-item attachment-file">
                    <div className="attachment-file-info">
                        <div className={`attachment-file-icon attachment-file-icon--${classSuffix}`}>
                            {label}
                        </div>
                        <div className="attachment-file-details">
                            <h4>{filename}</h4>
                            {sizeLabel && <span className="attachment-file-meta">{sizeLabel}</span>}
                        </div>
                    </div>
                    {downloadUrl ? (
                        <a
                            href={downloadUrl}
                            download={filename}
                            className="btn-secondary attachment-download-link"
                        >
                            Download
                        </a>
                    ) : (
                        <span className="attachment-file-meta">Download unavailable</span>
                    )}
                </div>
            );
        });
    };



    return (
        <>
        {isLoadingAI && <div className="central-overlay-spinner">            
          <div className="spinner-text">&nbsp;&nbsp;
              <Spin size="large" />
              Checking answer with AI...
            </div> 
          </div>}
        <div className="student-interface">
            <div className="interface-header">
                <h1>{showPastAnswers ? 'Review Past Answers' : 'Practice Questions'}</h1>
                <div className="interface-buttons">
                    {!showPastAnswers ? (
                        <>
                            <button className="btn-secondary" onClick={handleShowPastAnswers}>Review Past Answers</button>
                            <button className="btn-secondary" onClick={onBack}>Back to Main Menu</button>
                        </>
                    ) : (
                        <>
                            <button className="btn-secondary" onClick={handleBackToPractice}>Back to Practice</button>
                            <button className="btn-secondary" onClick={onBack}>Back to Main Menu</button>
                        </>
                    )}
                </div>
            </div>

            {!showPastAnswers ? (
                // Practice Questions Section
                <>
            <div className="navigation-breadcrumb">
                <span 
                    className={selectedSubject ? 'breadcrumb-active' : 'breadcrumb-current'}
                    onClick={() => {
                        if (selectedSubject) {
                            setSelectedSubject(null);
                            setSelectedTopic(null);
                            setQuestions([]);
                        }
                    }}
                >
                    Subjects
                </span>
                {selectedSubject && (
                    <>
                        <span className="breadcrumb-separator"> › </span>
                        <span 
                            className={selectedTopic ? 'breadcrumb-active' : 'breadcrumb-current'}
                            onClick={() => {
                                if (selectedTopic) {
                                    setSelectedTopic(null);
                                    setQuestions([]);
                                }
                            }}
                        >
                            {selectedSubject.subject || selectedSubject.name}
                        </span>
                    </>
                )}
                {selectedTopic && (
                    <>
                        <span className="breadcrumb-separator"> › </span>
                        <span className="breadcrumb-current">{selectedTopic.topic || selectedTopic.name}</span>
                    </>
                )}
            </div>

            {isLoading && <Spin size="large" />}
            
            <div className="subject-dropdown-container">
                <label htmlFor="subject-select">Subject:</label>
                <select 
                    id="subject-select"
                    value={selectedSubject} 
                    onChange={handleSubjectChange}
                    className="subject-dropdown"
                >
                    <option readOnly value="">-- Select a Subject --</option>
                    {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                            {subject.subject}
                        </option>
                    ))}
                </select>
            </div>

            {selectedSubject && topics.length > 0 && (
                <div className="subject-dropdown-container">
                    <label htmlFor="topic-select">Topic:</label>
                    <select 
                        id="topic-select"
                        value={selectedTopic} 
                        onChange={handleTopicChange}
                        className="subject-dropdown"
                    >
                        <option readOnly value="">-- Select a Topic --</option>
                        {topics.map(topic => (
                            <option key={topic.id} value={topic.id}>
                                {topic.topic}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {selectedTopic && questions.length > 0 && (
                <div className="questions-grid">
                    <h2>Practice Questions</h2>
                    <div className="questions-list">
                        {questions.map((question, index) => (
                            <div 
                                key={question.id} 
                                className="question-item"
                                onClick={() => handleQuestionSelect(question)}
                            >
                                <div className="question-number">Q{index + 1}</div>
                                <div className="question-preview">
                                    <div className="question-text">
                                        {question.question.length > 150 
                                            ? question.question.substring(0, 150) + '...'
                                            : question.question
                                        }
                                    </div>
                                    {question.attachments && (
                                        <div className="attachment-indicator">
                                            📎 Has attachments
                                        </div>
                                    )}
                                </div>
                                <div className="question-status">
                                    <span className="start-arrow">→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showAnswerModal && selectedQuestion && (
                <div className="answer-modal">
                    <div className="answer-modal-content">
                        <div className="answer-modal-header">
                            <h2>Answer Question</h2>
                            <button 
                                className="close-modal"
                                onClick={() => setShowAnswerModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="answer-modal-body">
                            <div className="question-section">
                                <h3>Question:</h3>
                                <div className="question-content">
                                    {selectedQuestion.question}
                                </div>
                                
                                {selectedQuestion.attachments  ? (
                                    <div className="attachments-section">
                                        <h4>Attachments:</h4>
                                        {renderAttachments(selectedQuestion.attachments)}
                                    </div>
                                ) : (<p>No attachments available</p>)}
                            </div>
                            
                            <div className="answer-section">
                                <h3>Your Answer:</h3>
                                <textarea
                                    value={studentAnswer}
                                    onChange={(e) => setStudentAnswer(e.target.value)}
                                    placeholder="Type your answer here..."
                                    className="answer-textarea"
                                    rows="10"
                                />
                            </div>
                        </div>
                        
                        <div className="answer-modal-footer">
                            <button 
                                className="btn-secondary"
                                onClick={() => setShowAnswerModal(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                className="btn-primary"
                                onClick={handleSubmitAnswer}
                                disabled={isSubmitting || !studentAnswer.trim()}
                            >
                                {isSubmitting ? 'Processing...' : 'Submit Answer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
                </>
            ) : (
                // Past Answers Review Section
                <div className="past-answers-section">
                    {pastResponses.length === 0 ? (
                        <div className="no-responses-message">
                            <p>You haven&apos;t completed any questions with AI feedback yet.</p>
                            <p>Complete some practice questions to see your past answers and feedback here.</p>
                        </div>
                    ) : (
                        <>
                            <div className="past-responses-list">
                                {pastResponses.map((response, index) => (
                                    <div 
                                        key={response.responseId} 
                                        className="past-response-item"
                                        onClick={() => setSelectedPastResponse(response)}
                                    >
                                        <div className="response-number">#{index + 1}</div>
                                        <div className="response-preview">
                                            <div className="response-subject-topic">
                                                {response.subjectName} › {response.topicName}
                                            </div>
                                            <div className="response-question-preview">
                                                {response.question.question.length > 100 
                                                    ? response.question.question.substring(0, 100) + '...'
                                                    : response.question.question
                                                }
                                            </div>
                                            <div className="response-date">
                                                Completed: {new Date(response.createdAt).toLocaleDateString()}
                                                {response.attemptNumber > 1 && (
                                                    <span className="attempt-badge"> (Attempt #{response.attemptNumber})</span>
                                                )}
                                                {(response.teacherComment || response.teacherRating) && (
                                                    <span className="teacher-feedback-notification"> 🎓 New Teacher Feedback!</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="response-arrow">→</div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Past Response Review Modal */}
            {selectedPastResponse && (
                <div className="answer-modal">
                    <div className="answer-modal-content">
                        <div className="answer-modal-header">
                            <h2>Review Past Answer</h2>
                            <button 
                                className="close-modal"
                                onClick={() => setSelectedPastResponse(null)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="answer-modal-body">
                            <div className="question-section">
                                <h3>Question:</h3>
                                <div className="question-content">
                                    {selectedPastResponse.question.question}
                                </div>
                                
                                {selectedPastResponse.question.attachments ? (
                                    <div className="attachments-section">
                                        <h4>Attachments:</h4>
                                        {renderAttachments(selectedPastResponse.question.attachments)}
                                    </div>
                                ) : (<p>No attachments available</p>)}
                            </div>
                            
                            <div className="answer-section">
                                <h3>Your Answer:</h3>
                                <div className="past-answer-display">
                                    {selectedPastResponse.studentAnswer}
                                </div>
                            </div>

                            <div className="feedback-section">
                                <h3>AI Assessment & Feedback:</h3>
                                <div className="ai-feedback-display" dangerouslySetInnerHTML={{__html: selectedPastResponse.aiFeedback}}>
                                </div>
                            </div>

                            {(selectedPastResponse.teacherComment || selectedPastResponse.teacherRating) && (
                                <div className="teacher-feedback-section-student">
                                    <h3>
                                        🎓 Teacher Feedback 
                                        {selectedPastResponse.teacherRating && (
                                            <span 
                                                className="teacher-rating-display"
                                                style={{
                                                    color: selectedPastResponse.teacherRating === 'R' ? '#dc3545' : 
                                                           selectedPastResponse.teacherRating === 'A' ? '#ffc107' : '#28a745'
                                                }}
                                            >
                                                ({selectedPastResponse.teacherRating === 'R' ? '🔴 Needs Improvement' : 
                                                  selectedPastResponse.teacherRating === 'A' ? '🟡 Good Progress' : '🟢 Excellent'})
                                            </span>
                                        )}
                                    </h3>
                                    {selectedPastResponse.teacherComment && (
                                        <div className="teacher-comment-display">
                                            {selectedPastResponse.teacherComment}
                                        </div>
                                    )}
                                    <div className="teacher-feedback-meta">
                                        <p><em>Feedback from {selectedPastResponse.teacherName || 'your teacher'} on {new Date(selectedPastResponse.teacherFeedbackTimestamp).toLocaleString()}</em></p>
                                    </div>
                                </div>
                            )}

                            <div className="response-metadata">
                                <p><strong>Subject:</strong> {selectedPastResponse.subjectName}</p>
                                <p><strong>Topic:</strong> {selectedPastResponse.topicName}</p>
                                <p><strong>Completed:</strong> {new Date(selectedPastResponse.createdAt).toLocaleString()}</p>
                                {selectedPastResponse.timeTaken && (
                                    <p><strong>Time Taken:</strong> {Math.floor(selectedPastResponse.timeTaken / 60)}m {selectedPastResponse.timeTaken % 60}s</p>
                                )}
                                {selectedPastResponse.attemptNumber > 1 && (
                                    <p><strong>Attempt:</strong> #{selectedPastResponse.attemptNumber}</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="answer-modal-footer">
                            <button 
                                className="btn-primary"
                                onClick={() => setSelectedPastResponse(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default StudentInterface;