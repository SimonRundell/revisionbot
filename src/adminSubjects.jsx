import { useState, useEffect } from 'react';
import axios from 'axios';
import {Spin} from 'antd';
import { handleApiCall } from './utils/apiHelpers';
import { formatAttachmentSize, getFileIconMeta } from './utils/fileAttachments';
import RichTextEditor from './RichTextEditor';
import RichTextContent from './RichTextContent';
import { isRichTextEmpty, sanitizeRichText } from './utils/richText';
import {truncateText, firstthreesentances} from './utils/textUtils';

/****************************************************************************
 * AdminSubjects Component
 * Comprehensive admin interface for managing subjects, topics, and questions.
 * Provides CRUD operations, bulk actions, file attachments, and statistical analysis.
 * Supports question reordering, bulk uploads, and data export functionality.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Object} props.currentUser - Current user object with authentication token and admin details
 * @param {Function} props.setSendErrorMessage - Function to set error messages in parent component
 * @param {Function} props.setSendSuccessMessage - Function to set success messages in parent component
 * @returns {JSX.Element} The AdminSubjects component
****************************************************************************/

function AdminSubjects({config, currentUser, setSendErrorMessage, setSendSuccessMessage}) {

    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal states
    const [showSubjectModal, setShowSubjectModal] = useState(false);
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);
    const [showEditQuestionModal, setShowEditQuestionModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedQuestions, setSelectedQuestions] = useState([]);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [showStatistics, setShowStatistics] = useState(false);
    const [statistics, setStatistics] = useState(null);
    const [showBackupData, setShowBackupData] = useState(false);
    const [showBulkQuestionModal, setShowBulkQuestionModal] = useState(false);
    const [questionCsvFile, setQuestionCsvFile] = useState(null);
    const [bulkQuestionProgress, setBulkQuestionProgress] = useState('');
    
    // Form states
    const [newSubject, setNewSubject] = useState('');
    const [newTopic, setNewTopic] = useState('');
    const [newTopicSubject, setNewTopicSubject] = useState('');
    const [newQuestion, setNewQuestion] = useState('');
    const [newQuestionTopic, setNewQuestionTopic] = useState('');
    const [newQuestionMarkScheme, setNewQuestionMarkScheme] = useState('');
    const [newQuestionFiles, setNewQuestionFiles] = useState([]);
    
    // Edit question states
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [editQuestion, setEditQuestion] = useState('');
    const [editQuestionTopic, setEditQuestionTopic] = useState('');
    const [editQuestionMarkScheme, setEditQuestionMarkScheme] = useState('');
    const [editQuestionFiles, setEditQuestionFiles] = useState([]);

useEffect(() => {
    // Fetch subjects from the server when the component mounts
    const apiCall = () => axios.post(config.api + '/getSubjects.php', {}, {
        headers: { 'Content-Type': 'application/json' }
    });

    handleApiCall(
        apiCall,
        setSubjects,
        setIsLoading,
        setSendSuccessMessage,
        setSendErrorMessage,
        '',
        'Failed to load subjects.'
    );
}, [config.api, setSendErrorMessage, setSendSuccessMessage]);

const handleSubjectChange = (event) => {
    const subjectId = event.target.value;
    
    if (subjectId === 'CREATE_NEW') {
        setShowSubjectModal(true);
        return;
    }
    
    setSelectedSubject(subjectId);
    setSelectedTopic(''); // Reset topic selection when subject changes
    setQuestions([]); // Clear questions when subject changes
    
    if (subjectId) {
        // Fetch topics for the selected subject
        // console.log("Fetching Subjects for subject ID:", subjectId);
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
            '',
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
    
    if (topicId === 'CREATE_NEW') {
        setNewTopicSubject(selectedSubject); // Pre-select current subject
        setShowTopicModal(true);
        return;
    }
    
    setSelectedTopic(topicId);

    if (topicId) {
        // Fetch questions for the selected topic
        // console.log("Fetching questions for topic ID:", topicId);
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
            '',
            'Failed to load questions.'
        );
    } else {
        setQuestions([]); // Clear questions if no topic selected
    }
};

// File handling functions
const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'application/x-zip-compressed'
    ];

    const processedFiles = [];

    for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
            setSendErrorMessage(`File type ${file.type} not supported for ${file.name}`);
            continue;
        }

        if (file.size > maxFileSize) {
            setSendErrorMessage(`File ${file.name} is too large (max 5MB)`);
            continue;
        }

        try {
            const base64 = await convertToBase64(file);
            processedFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                isBase64: true
            });
        } catch (error) {
            console.error('Error processing file for new question attachment:', error);
            setSendErrorMessage(`Error processing file ${file.name}`);
        }
    }

    setNewQuestionFiles(prev => [...prev, ...processedFiles]);
};

const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
};

const removeFile = (index) => {
    setNewQuestionFiles(prev => prev.filter((_, i) => i !== index));
};

// Modal handlers
const handleCreateSubject = async () => {
    if (!newSubject.trim()) {
        setSendErrorMessage('Subject name is required');
        return;
    }

    const jsonData = { subject: newSubject.trim() };
    // console.log("Creating subject with data:", jsonData);

    const apiCall = () => axios.post(config.api + '/createSubject.php',
        jsonData,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        }
    );

    try {
        setIsLoading(true);
        const response = await apiCall();
        if (response.data.status_code === 200) {
            setSendSuccessMessage('Subject created successfully');
            setShowSubjectModal(false);
            setNewSubject('');
            // Refresh subjects list
            const refreshApiCall = () => axios.post(config.api + '/getSubjects.php', {}, {
                headers: { 
                    'Authorization': `Bearer ${currentUser.token}`,
                    'Content-Type': 'application/json'
                }
            });
            handleApiCall(refreshApiCall, setSubjects, setIsLoading, null, setSendErrorMessage);
        } else {
            setSendErrorMessage('Failed to create subject');
        }
    } catch (error) {
        console.error('Error creating subject:', error);
        setSendErrorMessage('Error creating subject');
    } finally {
        setIsLoading(false);
    }
};

const handleCreateTopic = async () => {
    if (!newTopic.trim() || !newTopicSubject) {
        setSendErrorMessage('Topic name and subject are required');
        return;
    }

    const jsonData = { topic: newTopic.trim(), subjectid: parseInt(newTopicSubject) };
    // console.log("Creating topic with data:", jsonData);

    const apiCall = () => axios.post(config.api + '/createTopic.php',
        jsonData,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        }
    );

    try {
        setIsLoading(true);
        const response = await apiCall();
        if (response.data.status_code === 200) {
            setSendSuccessMessage('Topic created successfully');
            setShowTopicModal(false);
            setNewTopic('');
            setNewTopicSubject('');
            // Refresh topics list if we're viewing the same subject
            if (selectedSubject === newTopicSubject) {
                const refreshApiCall = () => axios.post(config.api + '/getTopics.php', 
                    { subjectid: selectedSubject },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.token}`
                        }
                    }
                );
                handleApiCall(refreshApiCall, setTopics, setIsLoading, null, setSendErrorMessage);
            }
        } else {
            setSendErrorMessage('Failed to create topic');
        }
    } catch (error) {
        console.error('Error creating topic:', error);
        setSendErrorMessage('Error creating topic');
    } finally {
        setIsLoading(false);
    }
};

const handleCreateQuestion = async () => {
    if (isRichTextEmpty(newQuestion) || !newQuestionTopic) {
        setSendErrorMessage('Question text and topic are required');
        return;
    }

    const jsonData = { 
        question: sanitizeRichText(newQuestion), 
        topicid: parseInt(newQuestionTopic),
        markscheme: sanitizeRichText(newQuestionMarkScheme),
        attachments: newQuestionFiles
    };

    // console.log("Creating question with data:", jsonData);

    const apiCall = () => axios.post(config.api + '/createQuestion.php',
        jsonData,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        }
    );

    try {
        setIsLoading(true);
        const response = await apiCall();
        
        if (response.data.status_code === 200) {
            setSendSuccessMessage('Question created successfully');
            setShowQuestionModal(false);
            setNewQuestion('');
            setNewQuestionTopic('');
            setNewQuestionFiles([]);
            setNewQuestionMarkScheme('');
            
            // Refresh questions list if we're viewing the same topic
            if (selectedTopic === newQuestionTopic) {
                const refreshApiCall = () => axios.post(config.api + '/getQuestions.php',
                    { topicid: selectedTopic },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.token}`
                        }
                    }
                );
                handleApiCall(refreshApiCall, setQuestions, setIsLoading, null, setSendErrorMessage);
            }
        } else {
            setSendErrorMessage('Failed to create question');
        }
    } catch (error) {
        console.error('Error creating question:', error);
        setSendErrorMessage('Error creating question');
    } finally {
        setIsLoading(false);
    }
};

const handleEditQuestion = (question) => {
    // console.log('Editing question:', question);
    setEditingQuestion(question);
    setEditQuestion(question.question || '');
    setEditQuestionTopic(question.topicid || '');
    setEditQuestionMarkScheme(question.markscheme || '');
    
    // Parse attachments if they exist
    let parsedAttachments = [];
    if (question.attachments) {
        try {
            if (typeof question.attachments === 'string') {
                parsedAttachments = question.attachments.trim() ? JSON.parse(question.attachments) : [];
            } else if (Array.isArray(question.attachments)) {
                parsedAttachments = question.attachments;
            }
        } catch (error) {
            console.error('Error parsing attachments:', error);
            parsedAttachments = [];
        }
    }
    setEditQuestionFiles(parsedAttachments);
    
    // No filelist needed - using attachments only
    
    setShowEditQuestionModal(true);
};

const handleUpdateQuestion = async () => {
    if (isRichTextEmpty(editQuestion) || !editQuestionTopic) {
        setSendErrorMessage('Question text and topic are required');
        return;
    }

    const jsonData = { 
        id: editingQuestion.id,
        question: sanitizeRichText(editQuestion), 
        topicid: parseInt(editQuestionTopic),
        markscheme: sanitizeRichText(editQuestionMarkScheme),
        attachments: editQuestionFiles
    };

    // console.log("Updating question with data:", jsonData);

    const apiCall = () => axios.post(config.api + '/updateQuestion.php',
        jsonData,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        }
    );

    try {
        setIsLoading(true);
        const response = await apiCall();
        
        if (response.data.status_code === 200) {
            setSendSuccessMessage('Question updated successfully');
            setShowEditQuestionModal(false);
            setEditingQuestion(null);
            setEditQuestion('');
            setEditQuestionTopic('');
            setEditQuestionFiles([]);
            setEditQuestionMarkScheme('');
            
            // Refresh questions list
            const refreshApiCall = () => axios.post(config.api + '/getQuestions.php',
                { topicid: selectedTopic },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                }
            );
            handleApiCall(refreshApiCall, setQuestions, setIsLoading, null, setSendErrorMessage);
        } else {
            setSendErrorMessage('Failed to update question');
        }
    } catch (error) {
        console.error('Error updating question:', error);
        setSendErrorMessage('Error updating question');
    } finally {
        setIsLoading(false);
    }
};

// File handling functions for edit modal
const handleEditFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const maxFileSize = 5 * 1024 * 1024; // 5MB limit
    const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'text/plain', 'text/csv',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip', 'application/x-zip-compressed'
    ];

    const processedFiles = [];

    for (const file of files) {
        if (!allowedTypes.includes(file.type)) {
            setSendErrorMessage(`File type ${file.type} not supported for ${file.name}`);
            continue;
        }

        if (file.size > maxFileSize) {
            setSendErrorMessage(`File ${file.name} is too large (max 5MB)`);
            continue;
        }

        try {
            const base64 = await convertToBase64(file);
            processedFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: base64,
                isBase64: true
            });
        } catch (error) {
            console.error('Error processing file for edit question attachment:', error);
            setSendErrorMessage(`Error processing file ${file.name}`);
        }
    }

    setEditQuestionFiles(prev => [...prev, ...processedFiles]);
};

const removeEditFile = (index) => {
    setEditQuestionFiles(prev => prev.filter((_, i) => i !== index));
};

// Delete handlers
const handleDeleteQuestion = (question) => {
    setDeleteTarget({ type: 'question', item: question });
    setShowDeleteModal(true);
};

const handleDeleteTopic = (topic) => {
    setDeleteTarget({ type: 'topic', item: topic });
    setShowDeleteModal(true);
};

const handleDeleteSubject = (subject) => {
    setDeleteTarget({ type: 'subject', item: subject });
    setShowDeleteModal(true);
};

const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    const { type, item } = deleteTarget;
    let endpoint, jsonData, successMessage, refreshAction;

    switch (type) {
        case 'question':
            endpoint = '/deleteQuestion.php';
            jsonData = { id: item.id };
            successMessage = 'Question deleted successfully';
            refreshAction = () => {
                const refreshApiCall = () => axios.post(config.api + '/getQuestions.php',
                    { topicid: selectedTopic },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.token}`
                        }
                    }
                );
                handleApiCall(refreshApiCall, setQuestions, setIsLoading, null, setSendErrorMessage);
            };
            break;
        case 'topic':
            endpoint = '/deleteTopic.php';
            jsonData = { id: item.id };
            successMessage = 'Topic deleted successfully';
            refreshAction = () => {
                setQuestions([]); // Clear questions
                setSelectedTopic(''); // Reset topic selection
                const refreshApiCall = () => axios.post(config.api + '/getTopics.php', 
                    { subjectid: selectedSubject },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentUser.token}`
                        }
                    }
                );
                handleApiCall(refreshApiCall, setTopics, setIsLoading, null, setSendErrorMessage);
            };
            break;
        case 'subject':
            endpoint = '/deleteSubject.php';
            jsonData = { id: item.id };
            successMessage = 'Subject deleted successfully';
            refreshAction = () => {
                setTopics([]); // Clear topics
                setQuestions([]); // Clear questions
                setSelectedSubject(''); // Reset subject selection
                setSelectedTopic(''); // Reset topic selection
                const refreshApiCall = () => axios.post(config.api + '/getSubjects.php', {}, {
                    headers: { 
                        'Authorization': `Bearer ${currentUser.token}`,
                        'Content-Type': 'application/json'
                    }
                });
                handleApiCall(refreshApiCall, setSubjects, setIsLoading, null, setSendErrorMessage);
            };
            break;
        default:
            return;
    }

    const apiCall = () => axios.post(config.api + endpoint,
        jsonData,
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        }
    );

    try {
        setIsLoading(true);
        const response = await apiCall();
        
        if (response.data.status_code === 200) {
            setSendSuccessMessage(successMessage);
            setShowDeleteModal(false);
            setDeleteTarget(null);
            refreshAction();
        } else {
            setSendErrorMessage(`Failed to delete ${type}`);
        }
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);

        const status = error.response?.status;
        const responseMessage = error.response?.data?.message;

        if (status === 404) {
            // Treat "not found" as a successful deletion to keep the UI consistent
            const alreadyDeletedMessage = responseMessage || `The ${type} was not found. It may have already been deleted.`;
            setSendSuccessMessage(alreadyDeletedMessage);
            setShowDeleteModal(false);
            setDeleteTarget(null);
            refreshAction();
        } else {
            setSendErrorMessage(`Error deleting ${type}`);
        }
    } finally {
        setIsLoading(false);
    }
};

const openBulkQuestionModal = () => {
    if (!selectedTopic) {
        setSendErrorMessage('Please select a topic before uploading questions');
        return;
    }
    setQuestionCsvFile(null);
    setBulkQuestionProgress('');
    setShowBulkQuestionModal(true);
};

const closeBulkQuestionModal = () => {
    setShowBulkQuestionModal(false);
    setQuestionCsvFile(null);
    setBulkQuestionProgress('');
};

const handleQuestionCsvSelect = (event) => {
    const file = event.target.files[0];
    if (file && (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv'))) {
        setQuestionCsvFile(file);
        setBulkQuestionProgress('');
    } else {
        setSendErrorMessage('Please select a valid CSV file');
        setQuestionCsvFile(null);
        event.target.value = '';
    }
};

const handleBulkQuestionUpload = async () => {
    if (!selectedTopic) {
        setSendErrorMessage('Please select a topic before uploading questions');
        return;
    }

    if (!questionCsvFile) {
        setSendErrorMessage('Please select a CSV file first');
        return;
    }

    setIsLoading(true);
    setBulkQuestionProgress('Processing CSV file...');

    try {
        const formData = new FormData();
        formData.append('csvFile', questionCsvFile);
        formData.append('topicId', selectedTopic);

        const response = await axios.post(
            config.api + '/bulkUploadQuestions.php',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            }
        );

        if (response.data.status_code === 200) {
            const createdCount = response.data.created_count ?? 0;
            const skippedCount = response.data.skipped_count ?? 0;
            const warnings = response.data.warnings ?? [];
            const baseMessage = response.data.message || 'Bulk upload completed.';

            let progressMessage = `${baseMessage} ${createdCount} question${createdCount === 1 ? '' : 's'} added.`.trim();

            if (skippedCount > 0) {
                progressMessage += ` ${skippedCount} row${skippedCount === 1 ? '' : 's'} skipped.`;
            }

            if (warnings.length > 0) {
                progressMessage += ` Warnings: ${warnings.join(' | ')}`;
            }

            setBulkQuestionProgress(progressMessage);
            setSendSuccessMessage(progressMessage);

            const refreshApiCall = () => axios.post(
                config.api + '/getQuestions.php',
                { topicid: selectedTopic },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                }
            );
            await handleApiCall(
                refreshApiCall,
                setQuestions,
                setIsLoading,
                null,
                setSendErrorMessage,
                'Questions refreshed',
                'Failed to refresh questions'
            );

            setQuestionCsvFile(null);

            if (skippedCount === 0 && warnings.length === 0) {
                setTimeout(() => {
                    setShowBulkQuestionModal(false);
                    setBulkQuestionProgress('');
                }, 1500);
            }
        } else {
            const errorMessage = response.data.message || 'Bulk question upload failed';
            setSendErrorMessage(errorMessage);
            setBulkQuestionProgress(`Upload failed: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Bulk question upload error:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
        setSendErrorMessage(`Error uploading questions: ${errorMessage}`);
        setBulkQuestionProgress(`Upload failed: ${errorMessage}`);
    } finally {
        setIsLoading(false);
    }
};

// Bulk operations
const handleQuestionSelect = (questionId, isSelected) => {
    if (isSelected) {
        setSelectedQuestions(prev => [...prev, questionId]);
    } else {
        setSelectedQuestions(prev => prev.filter(id => id !== questionId));
    }
};

const handleBulkDelete = () => {
    if (selectedQuestions.length === 0) return;
    
    setDeleteTarget({ 
        type: 'bulk', 
        item: { 
            ids: selectedQuestions, 
            count: selectedQuestions.length 
        } 
    });
    setShowDeleteModal(true);
};

const handleBulkDeleteConfirm = async () => {
    if (!selectedQuestions.length) return;

    const apiCall = () => axios.post(config.api + '/deleteBulkQuestions.php',
        { ids: selectedQuestions },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        }
    );

    try {
        setIsLoading(true);
        const response = await apiCall();
        
        if (response.data.status_code === 200) {
            setSendSuccessMessage(`${selectedQuestions.length} questions deleted successfully`);
            setShowDeleteModal(false);
            setDeleteTarget(null);
            setSelectedQuestions([]);
            setShowBulkActions(false);
            
            // Refresh questions list
            const refreshApiCall = () => axios.post(config.api + '/getQuestions.php',
                { topicid: selectedTopic },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                }
            );
            handleApiCall(refreshApiCall, setQuestions, setIsLoading, null, setSendErrorMessage);
        } else {
            setSendErrorMessage('Failed to delete questions');
        }
    } catch (error) {
        console.error('Error deleting questions:', error);
        setSendErrorMessage('Error deleting questions');
    } finally {
        setIsLoading(false);
    }
};

// Arrow-based reordering handlers
const handleMoveUp = async (index) => {
    if (index === 0) return; // Can't move first item up
    
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(index, 1);
    newQuestions.splice(index - 1, 0, removed);
    
    // Update local state immediately for smooth UX
    setQuestions(newQuestions);
    
    // Send reorder request to backend
    await updateQuestionOrder(newQuestions);
};

const handleMoveDown = async (index) => {
    if (index === questions.length - 1) return; // Can't move last item down
    
    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(index, 1);
    newQuestions.splice(index + 1, 0, removed);
    
    // Update local state immediately for smooth UX
    setQuestions(newQuestions);
    
    // Send reorder request to backend
    await updateQuestionOrder(newQuestions);
};

const updateQuestionOrder = async (newQuestions) => {
    try {
        const reorderData = newQuestions.map((q, index) => ({
            id: q.id,
            order: index + 1
        }));

        const jsonData = { questions: reorderData };
        // console.log("Reordering questions with data:", jsonData);

        const apiCall = () => axios.post(config.api + '/reorderQuestions.php',
            jsonData,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            }
        );

        const response = await apiCall();
        if (response.data.status_code === 200) {
            setSendSuccessMessage('Questions reordered successfully');
        } else {
            // Revert on failure
            setSendErrorMessage('Failed to save question order');
            // Refresh to get correct order
            const refreshApiCall = () => axios.post(config.api + '/getQuestions.php',
                { topicid: selectedTopic },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${currentUser.token}`
                    }
                }
            );
            handleApiCall(refreshApiCall, setQuestions, setIsLoading, null, setSendErrorMessage);
        }
    } catch (error) {
        console.error('Error reordering questions:', error);
        setSendErrorMessage('Error saving question order');
        // Refresh to get correct order
        const refreshApiCall = () => axios.post(config.api + '/getQuestions.php',
            { topicid: selectedTopic },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.token}`
                }
            }
        );
        handleApiCall(refreshApiCall, setQuestions, setIsLoading, null, setSendErrorMessage);
    }
};

// Statistics handler
const loadStatistics = async () => {
    // console.log('Loading statistics...');
    const apiCall = () => axios.post(config.api + '/getStatistics.php', {}, {
        headers: { 
            'Authorization': `Bearer ${currentUser.token}`,
            'Content-Type': 'application/json'
        }
    });

    handleApiCall(
        apiCall,
        (data) => {
            //console.log('Statistics data received:', data);
            setStatistics(data);
        },
        setIsLoading,
        setSendSuccessMessage,
        setSendErrorMessage,
        '',
        'Failed to load statistics.'
    );
};

const toggleStatistics = () => {
    // console.log('Toggle statistics - current showStatistics:', showStatistics, 'statistics:', statistics);
    if (!showStatistics && !statistics) {
        loadStatistics();
    }
    setShowStatistics(!showStatistics);
};

const selectedTopicDetails = topics.find(topic => String(topic.id) === String(selectedTopic));

// Backup Data handlers
const handleExport = async (type, subjectId = null, topicId = null) => {
    try {
        const exportData = { type };
        if (subjectId) exportData.subjectId = subjectId;
        if (topicId) exportData.topicId = topicId;

        const response = await axios.post(config.api + '/exportData.php', exportData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            responseType: 'blob'
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        let filename = `quiz_export_${timestamp}.json`;
        
        if (type === 'subject' && selectedSubject) {
            const subject = subjects.find(s => s.id == selectedSubject);
            filename = `quiz_export_${subject?.subject || 'subject'}_${timestamp}.json`;
        } else if (type === 'topic' && selectedTopic) {
            const topic = topics.find(t => t.id == selectedTopic);
            filename = `quiz_export_${topic?.topic || 'topic'}_${timestamp}.json`;
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        setSendSuccessMessage('Data exported successfully');
    } catch (error) {
        console.error('Export error:', error);
        setSendErrorMessage('Failed to export data');
    }
};

const handleImportFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        setSendErrorMessage('Please select a JSON file');
        return;
    }

    try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // Validate import data structure
        if (!importData.metadata || !importData.metadata.version) {
            setSendErrorMessage('Invalid import file format');
            return;
        }

        const response = await axios.post(config.api + '/importData.php', importData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            }
        });

        if (response.data.status_code === 200) {
            setSendSuccessMessage('Data imported successfully');
            
            // Refresh all data
            const refreshSubjects = () => axios.post(config.api + '/getSubjects.php', {}, {
                headers: { 
                    'Authorization': `Bearer ${currentUser.token}`,
                    'Content-Type': 'application/json'
                }
            });
            handleApiCall(refreshSubjects, setSubjects, setIsLoading, null, setSendErrorMessage);
            
            // Clear selections to force refresh
            setSelectedSubject('');
            setSelectedTopic('');
            setTopics([]);
            setQuestions([]);
            
        } else {
            setSendErrorMessage('Failed to import data');
        }
    } catch (error) {
        console.error('Import error:', error);
        setSendErrorMessage('Failed to parse or import file');
    }

    // Reset file input
    event.target.value = '';
};

    return (
        <>
        {isLoading && <div className="central-overlay-spinner">
                <div className="spinner-text">&nbsp;&nbsp;
                    <Spin size="large" />
                    Processing...
                </div>
            </div>}
            <div className="quiz-builder-header">
                <h2>Quiz Builder</h2>
                <button 
                    onClick={toggleStatistics}
                    className="statistics-toggle-btn"
                >
                    {showStatistics ? 'Hide Statistics' : 'Show Statistics'}
                </button>
            </div>

            {showStatistics && (
                <div className="statistics-section">
                    <h3>Quiz Builder Statistics</h3>
                    {!statistics && <p>Loading statistics...</p>}
                    {statistics && (
                        <>
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-number">{statistics.subjects}</div>
                                    <div className="stat-label">Subjects</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-number">{statistics.topics}</div>
                                    <div className="stat-label">Topics</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-number">{statistics.questions}</div>
                                    <div className="stat-label">Questions</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-number">{statistics.questionsWithAttachments}</div>
                                    <div className="stat-label">With Attachments</div>
                                </div>
                            </div>

                            {statistics.subjectBreakdown && statistics.subjectBreakdown.length > 0 && (
                                <div className="subject-breakdown">
                                    <h4>Subject Breakdown</h4>
                                    <div className="breakdown-list">
                                        {statistics.subjectBreakdown.map(subject => (
                                            <div key={subject.subject_id} className="breakdown-item">
                                                <span className="breakdown-subject">{subject.subject}</span>
                                                <span className="breakdown-stats">
                                                    {subject.topic_count} topics, {subject.question_count} questions
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {statistics.recentQuestions && statistics.recentQuestions.length > 0 && (
                                <div className="recent-questions">
                                    <h4>Recent Questions</h4>
                                    <div className="recent-list">
                                        {statistics.recentQuestions.map(question => (
                                            <div key={question.id} className="recent-item">
                                                <span className="recent-id">Q{question.id}</span>
                                                <span className="recent-text">{truncateText(question.question, 100)}</span>
                                                <span className="recent-location">{question.subject} → {question.topic}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}


            
            <div className="subject-dropdown-container">
                <label htmlFor="subject-select">Subject:</label>
                <select 
                    id="subject-select"
                    value={selectedSubject} 
                    onChange={handleSubjectChange}
                    className="subject-dropdown"
                >
                    <option readOnly value="">-- Select a Subject --</option>
                    <option value="CREATE_NEW" className="create-new-option">
                        + Create New Subject
                    </option>
                    {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                            {subject.subject}
                        </option>
                    ))}
                </select>
            </div>

            {subjects.length > 0 && (
                <div className="subjects-management-section">
                    <h3>All Subjects:</h3>
                    <div className="subjects-list">
                        {subjects.map(subject => (
                            <div key={subject.id} className="subject-item">
                                <span className="subject-name">{subject.subject}</span>
                                <button 
                                    onClick={() => handleDeleteSubject(subject)}
                                    className="delete-btn small"
                                    title="Delete subject"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedSubject && (
                <div className="subject-dropdown-container">
                    <label htmlFor="topic-select">Topic:</label>
                    <select 
                    id="topic-select"
                    value={selectedTopic} 
                    onChange={handleTopicChange}
                    className="subject-dropdown"
                >
                    <option readOnly value="">-- Select a Topic --</option>
                    <option value="CREATE_NEW" className="create-new-option">
                        + Create New Topic
                    </option>
                    {topics.map(topic => (
                        <option key={topic.id} value={topic.id}>
                            {topic.topic}
                        </option>
                    ))}
                </select>
                </div>
            )}

            {selectedSubject && topics.length === 0 && (
                <div className="no-topics-message">
                    <p style={{ color: '#666', fontStyle: 'italic', marginTop: '15px' }}>
                        No topics found for this subject. Use the dropdown above to create your first topic.
                    </p>
                </div>
            )}

            {selectedSubject && topics.length > 0 && (
                <div className="topics-management-section">
                    <h3>Topics in this Subject:</h3>
                    <div className="topics-list">
                        {topics.map(topic => (
                            <div key={topic.id} className="topic-item">
                                <span className="topic-name">{topic.topic}</span>
                                <button 
                                    onClick={() => handleDeleteTopic(topic)}
                                    className="delete-btn small"
                                    title="Delete topic"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedTopic && (
                <div className="topics-section">
                    <div className="questions-header">
                        <h3>Questions:</h3>
                        <div className="bulk-actions">
                            <button 
                                onClick={() => {
                                    setShowBulkActions(!showBulkActions);
                                    if (showBulkActions) {
                                        // Clear selections when canceling bulk mode
                                        setSelectedQuestions([]);
                                    }
                                }}
                                className="bulk-toggle-btn"
                            >
                                {showBulkActions ? 'Cancel Bulk' : 'Bulk Actions'}
                            </button>
                            {showBulkActions && (
                                <button 
                                    onClick={handleBulkDelete}
                                    className="bulk-delete-btn"
                                    disabled={selectedQuestions.length === 0}
                                >
                                    Delete Selected ({selectedQuestions.length})
                                </button>
                            )}
                        </div>
                    </div>
                    <ul>
                        {questions.map((question, index) => {
                            // console.log('Rendering question:', question);
                            return (
                            <li 
                                key={question.id} 
                                className="question-item"
                            >
                                <div className="question-item-content">
                                    {!showBulkActions && (
                                        <div className="reorder-controls">
                                            <button 
                                                onClick={() => handleMoveUp(index)}
                                                className="reorder-btn"
                                                disabled={index === 0}
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                            <button 
                                                onClick={() => handleMoveDown(index)}
                                                className="reorder-btn"
                                                disabled={index === questions.length - 1}
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                        </div>
                                    )}
                                    {showBulkActions && (
                                        <input
                                            type="checkbox"
                                            checked={selectedQuestions.includes(question.id)}
                                            onChange={(e) => handleQuestionSelect(question.id, e.target.checked)}
                                            className="question-checkbox"
                                        />
                                    )}
                                    <div 
                                        onClick={() => !showBulkActions && handleEditQuestion(question)}
                                        className={`question-link ${showBulkActions ? 'bulk-mode' : ''}`}
                                        title={showBulkActions ? 'Bulk selection mode' : 'Click to edit question'}
                                    >
                                        <span className="question-id">Q{question.id}</span>
                                        <RichTextContent value={firstthreesentances(question.question)} className="question-text question-text-preview" />
                                    </div>
                                    {!showBulkActions && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteQuestion(question);
                                            }}
                                            className="delete-btn"
                                            title="Delete question"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </li>
                            );
                        })}
                    </ul>
                    <div className="question-action-buttons">
                        <button 
                            onClick={() => {
                                setNewQuestionTopic(selectedTopic);
                                setShowQuestionModal(true);
                            }}
                        >
                            + Add New Question
                        </button>
                        <button 
                            onClick={openBulkQuestionModal}
                            className="bulk-upload-questions-button"
                        >
                            📥 Bulk Upload Questions
                        </button>
                    </div>
                </div>
            )}

            {selectedSubject && topics.length === 0 && !isLoading && (
                <div className="no-topics-message">
                    <h3>No topics found for this subject.</h3>
                </div>
            )}

            {/* Subject Creation Modal */}
            {showSubjectModal && (
                <div className="modal">
                    <div className="modal-content">
                        <span 
                            className="close" 
                            onClick={() => {
                                setShowSubjectModal(false);
                                setNewSubject('');
                            }}
                        >
                            &times;
                        </span>
                        <h2>Create New Subject</h2>
                        <div className="subject-dropdown-container">
                            <label htmlFor="new-subject">Subject Name:</label>
                            <input
                                id="new-subject"
                                type="text"
                                value={newSubject}
                                onChange={(e) => setNewSubject(e.target.value)}
                                placeholder="Enter subject name (e.g., Computing, History)"
                                className="full-width-input"
                            />
                        </div>
                        <div className="form-group-button">
                            <button onClick={handleCreateSubject}>
                                Create Subject
                            </button>
                            <button 
                                onClick={() => {
                                    setShowSubjectModal(false);
                                    setNewSubject('');
                                }}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Topic Creation Modal */}
            {showTopicModal && (
                <div className="modal">
                    <div className="modal-content">
                        <span 
                            className="close" 
                            onClick={() => {
                                setShowTopicModal(false);
                                setNewTopic('');
                                setNewTopicSubject('');
                            }}
                        >
                            &times;
                        </span>
                        <h2>Create New Topic</h2>
                        <div className="subject-dropdown-container">
                            <label htmlFor="new-topic-subject">Parent Subject:</label>
                            <select
                                id="new-topic-subject"
                                value={newTopicSubject}
                                onChange={(e) => setNewTopicSubject(e.target.value)}
                                className="full-width-input"
                            >
                                <option value="">-- Select Parent Subject --</option>
                                {subjects.map(subject => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.subject}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="subject-dropdown-container">
                            <label htmlFor="new-topic">Topic Name:</label>
                            <input
                                id="new-topic"
                                type="text"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                placeholder="Enter topic name"
                                className="full-width-input"
                            />
                        </div>
                        <div className="form-group-button">
                            <button onClick={handleCreateTopic}>
                                Create Topic
                            </button>
                            <button 
                                onClick={() => {
                                    setShowTopicModal(false);
                                    setNewTopic('');
                                    setNewTopicSubject('');
                                }}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Question Creation Modal */}
            {showQuestionModal && (
                <div className="modal">
                    <div className="modal-content">
                        <span 
                            className="close" 
                            onClick={() => {
                                setShowQuestionModal(false);
                                setNewQuestion('');
                                setNewQuestionTopic('');
                                setNewQuestionMarkScheme('');
                                setNewQuestionFiles([]);
                            }}
                        >
                            &times;
                        </span>
                        <h2>Create New Question</h2>
                        <div className="subject-dropdown-container">
                            <label htmlFor="new-question-topic">Parent Topic:</label>
                            <select
                                id="new-question-topic"
                                value={newQuestionTopic}
                                onChange={(e) => setNewQuestionTopic(e.target.value)}
                                className="full-width-input"
                            >
                                <option value="">-- Select Parent Topic --</option>
                                {topics.map(topic => (
                                    <option key={topic.id} value={topic.id}>
                                        {topic.topic}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="subject-dropdown-container">
                            <label htmlFor="new-question">Question Text:</label>
                            <RichTextEditor
                                value={newQuestion}
                                onChange={setNewQuestion}
                                placeholder="Enter the question text..."
                                minHeight={180}
                                theme="light"
                            />
                        </div>
                        <div className="subject-dropdown-container">
                            <label htmlFor="new-question">Markscheme:</label>
                            <RichTextEditor
                                value={newQuestionMarkScheme}
                                onChange={setNewQuestionMarkScheme}
                                placeholder="Enter the markscheme..."
                                minHeight={160}
                                theme="light"
                            />
                        </div>
                        <div className="subject-dropdown-container">
                            <label htmlFor="new-question-files">Upload Files (Images will display, others will be attached):</label>
                            <div className="file-input-wrapper leftgap">
                                <input
                                    id="new-question-files"
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip"
                                    onChange={handleFileUpload}
                                    className="file-input-hidden"
                                />
                                <label htmlFor="new-question-files" className="file-input-button">
                                    Choose Files
                                </label>
                            </div>
                            
                            {newQuestionFiles.length > 0 && (
                                <div className="uploaded-files-list">
                                    <h4>Uploaded Files:</h4>
                                    {newQuestionFiles.map((file, index) => {
                                        const { label, classSuffix } = getFileIconMeta(file.type || '', file.name || '');
                                        const sizeLabel = formatAttachmentSize(file.size);

                                        return (
                                            <div key={index} className="uploaded-file-item">
                                                <div className="attachment-file-info">
                                                    <div className={`attachment-file-icon attachment-file-icon--${classSuffix}`}>
                                                        {label}
                                                    </div>
                                                    <div className="attachment-file-details">
                                                        <span className="file-info">{file.name}</span>
                                                        {sizeLabel && <span className="attachment-file-meta">{sizeLabel}</span>}
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="remove-file-btn"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            <div className="file-upload-info">
                                <small>
                                    Supported: Images, PDFs, Word docs, Excel, Powerpoint, Text and Zip files (Max 5MB each)
                                </small>
                            </div>
                        </div>
                        

                        <div className="form-group-button">
                            <button onClick={handleCreateQuestion}>
                                Create Question
                            </button>
                            <button 
                                onClick={() => {
                                    setShowQuestionModal(false);
                                    setNewQuestion('');
                                    setNewQuestionTopic('');
                                    setNewQuestionMarkScheme('');
                                    setNewQuestionFiles([]);
                                }}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Question Modal */}
            {showEditQuestionModal && editingQuestion && (
                <div className="modal">
                    <div className="modal-content">
                        <span 
                            className="close" 
                            onClick={() => {
                                setShowEditQuestionModal(false);
                                setEditingQuestion(null);
                                setEditQuestion('');
                                setEditQuestionTopic('');
                                setEditQuestionMarkScheme('');
                                setEditQuestionFiles([]);
                            }}
                        >
                            &times;
                        </span>
                        <h2>Edit Question Number: {editingQuestion.id}</h2>
                        <div className="subject-dropdown-container">
                            <label htmlFor="edit-question-topic">Parent Topic:</label>
                            <select
                                id="edit-question-topic"
                                value={editQuestionTopic}
                                onChange={(e) => setEditQuestionTopic(e.target.value)}
                                className="full-width-input"
                            >
                                <option value="">-- Select Parent Topic --</option>
                                {topics.map(topic => (
                                    <option key={topic.id} value={topic.id}>
                                        {topic.topic}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="subject-dropdown-container">
                            <label htmlFor="edit-question">Question Text:</label>
                            <RichTextEditor
                                value={editQuestion}
                                onChange={setEditQuestion}
                                placeholder="Enter the question text..."
                                minHeight={180}
                                theme="light"
                            />
                        </div>
                        <div className="subject-dropdown-container">
                            <label htmlFor="edit-question-markscheme">Markscheme:</label>
                            <RichTextEditor
                                value={editQuestionMarkScheme}
                                onChange={setEditQuestionMarkScheme}
                                placeholder="Enter the markscheme..."
                                minHeight={160}
                                theme="light"
                            />
                        </div>
                        <div className="subject-dropdown-container">
                            <label htmlFor="edit-question-files">Upload Files (Images, PDFs, Documents):</label>
                            <div className="file-input-wrapper leftgap">
                                <input
                                    id="edit-question-files"
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip"
                                    onChange={handleEditFileUpload}
                                    className="file-input-hidden"
                                />
                                <label htmlFor="edit-question-files" className="file-input-button">
                                    Choose Files
                                </label>
                            </div>
                            
                            {editQuestionFiles.length > 0 && (
                                <div className="uploaded-files-list">
                                    <h4>Uploaded Files:</h4>
                                    {editQuestionFiles.map((file, index) => {
                                        const { label, classSuffix } = getFileIconMeta(file.type || '', file.name || '');
                                        const sizeLabel = formatAttachmentSize(file.size);

                                        return (
                                            <div key={index} className="uploaded-file-item">
                                                <div className="attachment-file-info">
                                                    <div className={`attachment-file-icon attachment-file-icon--${classSuffix}`}>
                                                        {label}
                                                    </div>
                                                    <div className="attachment-file-details">
                                                        <span className="file-info">{file.name}</span>
                                                        {sizeLabel && <span className="attachment-file-meta">{sizeLabel}</span>}
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    onClick={() => removeEditFile(index)}
                                                    className="remove-file-btn"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            <div className="file-upload-info">
                                <small>
                                    Supported: Images, PDFs, Word docs, Text files (Max 5MB each)
                                </small>
                            </div>
                        </div>
                        

                        <div className="form-group-button">
                            <button onClick={handleUpdateQuestion}>
                                Update Question
                            </button>
                            <button 
                                onClick={() => {
                                    setShowEditQuestionModal(false);
                                    setEditingQuestion(null);
                                    setEditQuestion('');
                                    setEditQuestionTopic('');
                                    setEditQuestionMarkScheme('');
                                    setEditQuestionFiles([]);
                                }}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Question Upload Modal */}
            {showBulkQuestionModal && (
                <div className="modal">
                    <div className="modal-content bulk-upload-modal">
                        <span 
                            className="close" 
                            onClick={closeBulkQuestionModal}
                        >
                            &times;
                        </span>
                        <h2>📥 Bulk Upload Questions</h2>

                        <div className="bulk-upload-format-section">
                            <h4>CSV Format Required:</h4>
                            <p className="bulk-upload-format-description">
                                Your CSV file should include a header row with the following columns:
                            </p>
                            <code className="bulk-upload-format-code">
                                question,markscheme<br/>
                                What is a CPU?,The CPU executes instructions using the fetch-decode-execute cycle.<br/>
                                Define RAM.,RAM stores data and instructions currently needed by the CPU.
                            </code>
                            <p className="bulk-upload-format-notes">
                                • <strong>question</strong>: Required. The text of the question.<br/>
                                • <strong>markscheme</strong>: Optional. Leave blank if not needed.<br/>
                                Questions will be added to the currently selected topic.
                            </p>
                        </div>

                        <table border="1" className="edit-modal-table">
                            <tbody>
                                <tr>
                                    <td>Target Topic</td>
                                    <td>{selectedTopicDetails?.topic || 'Selected topic'}</td>
                                </tr>
                                <tr>
                                    <td>CSV File</td>
                                    <td>
                                        <div className="file-input-wrapper">
                                            <input 
                                                type="file" 
                                                id="question-csv-upload"
                                                className="file-input-hidden"
                                                accept=".csv"
                                                onChange={handleQuestionCsvSelect}
                                            />
                                            <label htmlFor="question-csv-upload" className="file-input-button">
                                                {questionCsvFile ? questionCsvFile.name : 'Choose CSV File'}
                                            </label>
                                        </div>
                                        {questionCsvFile && (
                                            <div className="bulk-upload-file-selected">
                                                ✓ File selected: {questionCsvFile.name} ({Math.round(questionCsvFile.size / 1024)} KB)
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {bulkQuestionProgress && (
                            <div className={`bulk-upload-progress-container ${bulkQuestionProgress.toLowerCase().includes('failed') ? 'bulk-upload-progress-error' : 'bulk-upload-progress-success'}`}>
                                {bulkQuestionProgress}
                            </div>
                        )}

                        <div className="form-group-button">
                            <button 
                                onClick={handleBulkQuestionUpload}
                                disabled={!questionCsvFile || isLoading}
                                className="bulk-upload-submit-button"
                            >
                                {isLoading ? 'Processing...' : 'Upload Questions'}
                            </button>
                            <button 
                                onClick={closeBulkQuestionModal}
                                className="topgap"
                                disabled={isLoading}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && deleteTarget && (
                <div className="modal">
                    <div className="modal-content delete-modal">
                        <span 
                            className="close" 
                            onClick={() => {
                                setShowDeleteModal(false);
                                setDeleteTarget(null);
                            }}
                        >
                            &times;
                        </span>
                        <h2>Confirm Delete</h2>
                        <div className="delete-warning">
                            <p>⚠️ Are you sure you want to delete this {deleteTarget.type}?</p>
                            {deleteTarget.type === 'bulk' ? (
                                <div className="delete-item-info">
                                    <strong>Selected Questions:</strong>
                                    <span className="delete-item-text">
                                        {deleteTarget.item.count} questions will be permanently deleted
                                    </span>
                                </div>
                            ) : (
                                <div className="delete-item-info">
                                    <strong>{deleteTarget.type === 'question' ? `Q${deleteTarget.item.id}` : deleteTarget.item[deleteTarget.type === 'subject' ? 'subject' : 'topic']}:</strong>
                                    <span className="delete-item-text">
                                        {deleteTarget.type === 'question' 
                                            ? deleteTarget.item.question 
                                            : deleteTarget.item[deleteTarget.type === 'subject' ? 'subject' : 'topic']
                                        }
                                    </span>
                                </div>
                            )}
                            {deleteTarget.type === 'subject' && (
                                <p className="cascade-warning">
                                    <strong>Warning:</strong> This will also delete all topics and questions within this subject.
                                </p>
                            )}
                            {deleteTarget.type === 'topic' && (
                                <p className="cascade-warning">
                                    <strong>Warning:</strong> This will also delete all questions within this topic.
                                </p>
                            )}
                        </div>
                        <div className="form-group-button">
                            <button 
                                onClick={deleteTarget.type === 'bulk' ? handleBulkDeleteConfirm : handleConfirmDelete}
                                className="delete-confirm-btn"
                            >
                                {deleteTarget.type === 'bulk' 
                                    ? `Yes, Delete ${deleteTarget.item.count} Questions`
                                    : `Yes, Delete ${deleteTarget.type}`
                                }
                            </button>
                            <button 
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteTarget(null);
                                }}
                                className="topgap"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Backup Data Section - placed at bottom */}
            <div className="backup-data-section">
                <button
                    type="button"
                    className={`backup-data-header ${showBackupData ? 'expanded' : ''}`}
                    onClick={() => setShowBackupData(!showBackupData)}
                    aria-expanded={showBackupData}
                >
                    <span className="backup-data-title">Backup Data</span>
                    <span
                        className={`backup-data-toggle ${showBackupData ? 'expanded' : ''}`}
                        aria-hidden="true"
                    >
                        ▼
                    </span>
                </button>
                <div className={`backup-data-content ${showBackupData ? 'expanded' : ''}`}>
                    <div className="backup-description">
                        <p>Export and import the complete quiz database for backup and restoration purposes.</p>
                    </div>
                    <div className="backup-data-controls">
                    <div className="export-controls">
                        <h4>Export</h4>
                        <div className="export-buttons">
                            <button 
                                onClick={() => handleExport('all')}
                                className="export-btn"
                            >
                                Export All Data
                            </button>
                            {selectedSubject && (
                                <button 
                                    onClick={() => handleExport('subject', selectedSubject)}
                                    className="export-btn"
                                >
                                    Export Current Subject
                                </button>
                            )}
                            {selectedTopic && (
                                <button 
                                    onClick={() => handleExport('topic', null, selectedTopic)}
                                    className="export-btn"
                                >
                                    Export Current Topic
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="import-controls">
                        <h4>Import</h4>
                        <div className="file-input-wrapper">
                            <input
                                id="import-file"
                                type="file"
                                accept=".json"
                                onChange={handleImportFile}
                                className="file-input-hidden"
                            />
                            <label htmlFor="import-file" className="file-input-button">
                                Choose JSON File
                            </label>
                        </div>
                        <small className="import-info">
                            Import quiz data from previously exported JSON file. <strong>Warning:</strong> This will merge with existing data.
                        </small>
                    </div>
                    </div>
                </div>
            </div>
        </>
    );
}
export default AdminSubjects;
