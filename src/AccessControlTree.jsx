import { useState, useEffect } from 'react';
import axios from 'axios';
import { handleApiCall, parseApiResponse } from './utils/apiHelpers';

/****************************************************************
 * AccessControlTree Component
 * Renders the access control tree for subjects and topics.
*****************************************************************/

function AccessControlTree ({ 
    currentUser, 
    config, 
    userAccess = {}, 
    onAccessChange, 
    setSendErrorMessage 
}) {
    const [subjects, setSubjects] = useState([]);
    const [topics, setTopics] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSubjects, setExpandedSubjects] = useState(new Set());

    // Load subjects and topics on component mount
    useEffect(() => {
        const loadSubjects = async () => {
            const apiCall = () => axios.post(`${config.api}/getSubjects.php`, {}, {
                headers: { 
                    'Authorization': `Bearer ${currentUser.token}`,
                    'Content-Type': 'application/json'
                }
            });

            await handleApiCall(
                apiCall,
                setSubjects,
                setIsLoading,
                null, // No success message needed
                setSendErrorMessage,
                '', // No success message
                'Failed to load subjects'
            );
        };

        loadSubjects();
    }, [config.api, currentUser.token, setSendErrorMessage]);

    // Load topics when subjects change
    useEffect(() => {
        const loadAllTopics = async () => {
            if (subjects.length === 0) return;

            try {
                const topicsData = {};
                for (const subject of subjects) {
                    try {
                        const topicsResponse = await axios.post(`${config.api}/getTopics.php`, 
                            { subjectid: subject.id },
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${currentUser.token}`
                                }
                            }
                        );
                        
                        const parsedTopics = parseApiResponse(
                            topicsResponse.data,
                            null, // No success message
                            setSendErrorMessage,
                            '',
                            `Failed to load topics for ${subject.subject}`
                        );
                        
                        if (parsedTopics !== null) {
                            topicsData[subject.id] = parsedTopics;
                        }
                    } catch (error) {
                        console.error(`Error loading topics for subject ${subject.id}:`, error);
                    }
                }
                setTopics(topicsData);
            } catch (error) {
                console.error('Error loading topics:', error);
                setSendErrorMessage('Failed to load topics');
            }
        };

        loadAllTopics();
    }, [subjects, config.api, currentUser.token, setSendErrorMessage]);

    const toggleSubjectExpansion = (subjectId) => {
        const newExpanded = new Set(expandedSubjects);
        if (newExpanded.has(subjectId)) {
            newExpanded.delete(subjectId);
        } else {
            newExpanded.add(subjectId);
        }
        setExpandedSubjects(newExpanded);
    };

    const handleSubjectToggle = (subjectId, checked) => {
        const newAccess = { ...userAccess };
        
        if (checked) {
            // Grant access to entire subject (all topics)
            newAccess[subjectId] = 'all';
        } else {
            // Remove access to subject
            delete newAccess[subjectId];
        }
        
        onAccessChange(newAccess);
    };

    const handleTopicToggle = (subjectId, topicId, checked) => {
        const newAccess = { ...userAccess };
        
        if (checked) {
            // Add specific topic access
            if (!newAccess[subjectId] || newAccess[subjectId] === 'all') {
                newAccess[subjectId] = [topicId];
            } else if (Array.isArray(newAccess[subjectId])) {
                if (!newAccess[subjectId].includes(topicId)) {
                    newAccess[subjectId] = [...newAccess[subjectId], topicId];
                }
            }
        } else {
            // Remove specific topic access
            if (newAccess[subjectId] === 'all') {
                // If was 'all', convert to array of all other topics
                const allTopics = topics[subjectId] || [];
                newAccess[subjectId] = allTopics
                    .filter(topic => topic.id !== topicId)
                    .map(topic => topic.id);
            } else if (Array.isArray(newAccess[subjectId])) {
                newAccess[subjectId] = newAccess[subjectId].filter(id => id !== topicId);
                // If no topics left, remove subject entirely
                if (newAccess[subjectId].length === 0) {
                    delete newAccess[subjectId];
                }
            }
        }
        
        onAccessChange(newAccess);
    };

    const isSubjectChecked = (subjectId) => {
        return userAccess[subjectId] === 'all' || 
               (Array.isArray(userAccess[subjectId]) && userAccess[subjectId].length > 0);
    };

    const isSubjectIndeterminate = (subjectId) => {
        const access = userAccess[subjectId];
        if (access === 'all') return false;
        if (!access || !Array.isArray(access)) return false;
        
        const totalTopics = topics[subjectId]?.length || 0;
        return access.length > 0 && access.length < totalTopics;
    };

    const isTopicChecked = (subjectId, topicId) => {
        const access = userAccess[subjectId];
        return access === 'all' || 
               (Array.isArray(access) && access.includes(topicId));
    };

    if (isLoading) {
        return (
            <div className="access-control-tree">
                <div className="access-tree-loading">
                    Loading subjects and topics...
                </div>
            </div>
        );
    }

    return (
        <div className="access-control-tree">
            <div className="access-control-header">
                <h4>Subject & Topic Access Control</h4>
                <p style={{ fontSize: '12px', color: '#666', margin: '5px 0' }}>
                    Select which subjects and topics Student user can access. Admin users can access everything by default.
                </p>
            </div>
            
            <div className="access-tree">
                {subjects.map(subject => (
                    <div key={subject.id} className="subject-node">
                        <div className="subject-header">
                            <button 
                                className="expand-button"
                                onClick={() => toggleSubjectExpansion(subject.id)}
                            >
                                {expandedSubjects.has(subject.id) ? '▼' : '▶'}
                            </button>
                            
                            <label className="tree-checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isSubjectChecked(subject.id)}
                                    ref={input => {
                                        if (input) input.indeterminate = isSubjectIndeterminate(subject.id);
                                    }}
                                    onChange={e => handleSubjectToggle(subject.id, e.target.checked)}
                                />
                                <strong>{subject.subject}</strong>
                            </label>
                        </div>
                        
                        {expandedSubjects.has(subject.id) && topics[subject.id] && (
                            <div className="topics-container">
                                {topics[subject.id].map(topic => (
                                    <div key={topic.id} className="topic-node">
                                        <label className="tree-checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={isTopicChecked(subject.id, topic.id)}
                                                onChange={e => handleTopicToggle(subject.id, topic.id, e.target.checked)}
                                            />
                                            {topic.topic}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {subjects.length === 0 && (
                <div className="access-tree-empty">
                    No subjects available
                </div>
            )}
        </div>
    );
};

export default AccessControlTree;