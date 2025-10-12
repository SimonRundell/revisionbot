import React, { useState, useEffect } from 'react';
import { Select, message, Spin } from 'antd';
import axios from 'axios';
import './App.css'; // Ensure you import your custom CSS file

const { Option } = Select;

const SubjectTopicList = ({ config, schoolId, selectedSubject, setSelectedSubject, selectedTopic, setSelectedTopic }) => {
  const [topics, setTopics] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const fetchTopics = async () => {
      if (!selectedSubject) return; // Ensure subjectId is defined before fetching topics

      const JSONData = { school: schoolId, subject: selectedSubject };
      console.log("JSONData:", JSONData);
      try {
        const response = await axios.post(config.api + '/getTopics.php', JSONData, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = response.data;

        // Handle the response data here
        if (data.status_code === 200) {
          const records = JSON.parse(data.message); // Parse the JSON string

          if (records && (Array.isArray(records) ? records.length > 0 : Object.keys(records).length > 0)) {
            setTopics(Array.isArray(records) ? records : [records]); // Ensure records is an array
            console.log('Topics found:', records);
            setIsLoading(false);
          } else {
            console.log('No Topics found');
            setTopics([]);
            setIsLoading(false);
          }
        } else {
          console.log('No data found');
          setTopics([]);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        setTopics([]);
        setIsLoading(false);
      }
    };

    fetchTopics();
  }, [config.api, schoolId, selectedSubject]); // Re-fetch topics when subjectId changes

  // Reset selected topic when subjectId changes
  useEffect(() => {
    setSelectedTopic(null);
  }, [selectedSubject]);

  const handleTopicChange = (value) => {
    setSelectedTopic(value);
    console.log('Selected Subject topic:', value);
    // Perform further actions based on the selected topic
  };

  return (
    <>
     {isLoading && <div className="central-overlay-spinner">            <div className="spinner-content">
              <Spin size="large" />
            </div></div>}
    <div>
      {contextHolder}
      {topics.length > 0 ? (
    <div className="select-container">
    <select
          style={{ width: 200 }}
          placeholder="Select a topic"
          onChange={(e) => handleTopicChange(e.target.value)}
          value={selectedTopic || ""} // Ensure the selected value is controlled
          className="custom-select"
        >
          <option value="" disabled>Select a topic</option>
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.subjectTopic}
            </option>
          ))}
      </select>
    </div>
      ) : (
        <div>Loading Topics</div>
          
      )}
      {selectedTopic && (
        <div>
          {/* <h3>Selected Topic ID: {selectedTopic}</h3> */}
          {/* Add further selection or actions here */}
        </div>
      )}
    </div>
    </>
  );
};

export default SubjectTopicList;