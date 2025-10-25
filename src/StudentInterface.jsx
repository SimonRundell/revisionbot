import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spin } from 'antd';
import { handleApiCall } from './utils/apiHelpers';
import PastAnswersViewer from './PastAnswersViewer';
import renderAttachments from './utils/renderAttachments';
import './App.css';

/****************************************************************
 * StudentInterface Component
 * Enablkes students to practice questions based on subjects and topics.
 * Integrates with AI for answer assessment and feedback.
*****************************************************************/

function StudentInterface ({ userId, 
                             config, 
                             currentUser, 
                            setSendErrorMessage, 
                            setSendSuccessMessage }) {

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
    const [sessionId] = useState(() => 'session_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11));
    
    // Helper function to parse user access permissions
    const getUserAccess = useCallback(() => {
        if (!currentUser || !currentUser.userAccess) {
            return {};
        }
        try {
            return typeof currentUser.userAccess === 'string' 
                ? JSON.parse(currentUser.userAccess) 
                : currentUser.userAccess;
        } catch (error) {
            console.error('Error parsing user access:', error);
            return {};
        }
    }, [currentUser]);

    // Helper function to filter subjects based on user access
    const filterSubjectsByAccess = useCallback((allSubjects) => {
        // Admin users can access everything
        if (currentUser?.admin === 1) {
            return allSubjects;
        }

        const userAccess = getUserAccess();
        if (Object.keys(userAccess).length === 0) {
            // If no access control is set, allow access to all subjects
            return allSubjects;
        }

        return allSubjects.filter(subject => 
            Object.prototype.hasOwnProperty.call(userAccess, subject.id.toString())
        );
    }, [currentUser, getUserAccess]);

    // Helper function to filter topics based on user access
    const filterTopicsByAccess = useCallback((allTopics, subjectId) => {
        // Admin users can access everything
        if (currentUser?.admin === 1) {
            return allTopics;
        }

        const userAccess = getUserAccess();
        
        // Try both string and number versions of subjectId for robust access
        const subjectIdStr = subjectId.toString();
        const subjectIdNum = parseInt(subjectId);
        let subjectAccess = userAccess[subjectIdStr] || userAccess[subjectIdNum] || userAccess[subjectId];

        if (!subjectAccess) {
            return []; // No access to this subject
        }

        if (subjectAccess === 'all') {
            return allTopics; // Access to all topics in this subject
        }

        if (Array.isArray(subjectAccess)) {
            // Access to specific topics only
            return allTopics.filter(topic => 
                subjectAccess.includes(topic.id.toString()) || subjectAccess.includes(topic.id)
            );
        }

        return [];
    }, [currentUser, getUserAccess]);

    // Load subjects on component mount
    useEffect(() => {
        // Fetch subjects from the server when the component mounts
        const apiCall = () => axios.post(config.api + '/getSubjects.php', {}, {
            headers: { 
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            }
        });

        handleApiCall(
            apiCall,
            (allSubjects) => {
                // Filter subjects based on user access permissions
                const filteredSubjects = filterSubjectsByAccess(allSubjects);
                setSubjects(filteredSubjects);
            },
            setIsLoading,
            setSendSuccessMessage,
            setSendErrorMessage,
            'Subjects loaded successfully.',
            'Failed to load subjects.'
        );

    }, [userId, config.api, currentUser.token, setSendErrorMessage, setSendSuccessMessage, filterSubjectsByAccess]);

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
                (allTopics) => {
                    console.log("All topics received:", allTopics);
                    console.log("User access:", getUserAccess());
                    console.log("Subject ID:", subjectId);
                    // Filter topics based on user access permissions
                    const filteredTopics = filterTopicsByAccess(allTopics, subjectId);
                    console.log("Filtered topics:", filteredTopics);
                    setTopics(filteredTopics);
                },
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

        // console.log("Submitting response:", jsonData);

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

                // console.log("Requesting AI feedback with:", jsonData);

                const aiResponse = await axios.post(`${config.api}/geminiAPI.php`, jsonData, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                });

                // ("Full AI Response received:", aiResponse.data);

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
                    <button class="close-feedback" id="close-feedback-btn">×</button>
                </div>
                <div class="ai-feedback-body">
                    ${feedback}
                </div>
                <div class="ai-feedback-footer">
                    <button class="btn-primary" id="continue-studying-btn">Continue Studying</button>
                </div>
            </div>
        `;
        document.body.appendChild(feedbackModal);

        // Add event listeners to properly handle modal closing
        const closeBtn = feedbackModal.querySelector('#close-feedback-btn');
        const continueBtn = feedbackModal.querySelector('#continue-studying-btn');
        
        const handleClose = () => {
            feedbackModal.remove();
            setShowAnswerModal(false); // Properly reset the state
            setSelectedQuestion(null); // Reset selected question
            setStudentAnswer(''); // Reset answer
        };

        closeBtn.addEventListener('click', handleClose);
        continueBtn.addEventListener('click', handleClose);
    };


    return (
        <>
            {isLoadingAI && (
                <div className="central-overlay-spinner">
                    <div className="spinner-text">&nbsp;&nbsp;
                        <Spin size="large" />
                        Checking answer with AI...
                    </div>
                </div>
            )}

            <div className="student-interface">
                <div className="interface-header">
                    <h2>Practice Questions</h2>
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

                                    {selectedQuestion.attachments ? (
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
            </div>

            {/* Show PastAnswersViewer when no subject is selected (adjust condition as needed) */}
            {!selectedSubject && (
                <PastAnswersViewer
                    userId={userId}
                    currentUser={currentUser}
                    config={config}
                    setSendErrorMessage={setSendErrorMessage}
                    setSendSuccessMessage={setSendSuccessMessage}
                />
            )}
        </>
    );
};

export default StudentInterface;
