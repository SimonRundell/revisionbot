import { useState, useEffect } from 'react';
import { Select, message, Spin } from 'antd';
import SubjectTopicList from './subjectTopics';
import axios from 'axios';
import './App.css'; 

const { Option } = Select;

const SubjectList = ({ config, schoolId, selectedTopic, setSelectedTopic, selectedSubject, setSelectedSubject }) => {
  const [subjects, setSubjects] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const fetchSubjects = async () => {
      try {
        const response = await axios.post(config.api + '/getSubjects.php', { school: schoolId }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = response.data;

        // Handle the response data here
        if (data.status_code === 200) {
          const records = JSON.parse(data.message); // Parse the JSON string
          
          if (records && (Array.isArray(records) ? records.length > 0 : Object.keys(records).length > 0)) {
            setSubjects(Array.isArray(records) ? records : [records]); // Ensure records is an array
            console.log('Subjects found:', records);
            setIsLoading(false);
          } else {
            console.log('No records found');
            setIsLoading(false);
          }
        } else {
          console.log('No data found');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, [config.api, schoolId]);

  const handleSubjectChange = (value, option) => {
    setSelectedSubject(value);
    console.log('Selected subject:', { id: value, name: option.children });
  };

  return (
    <>
    {isLoading && <div className="central-overlay-spinner">            <div className="spinner-content">
              <Spin size="large" />
            </div></div>}
    <div>
      {contextHolder}
      {subjects.length > 0 ? (
      <div className="select-container"> 
      <select
          style = {{width: '200px'}}
          value={selectedSubject || ""}
          placeholder="Select a subject"
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="custom-select"
        >
          <option value="" disabled>Select a subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.subject}
            </option>
          ))}
    </select>
    </div>
      ) : (
        <div>Loading subjects</div>
      )}
      {selectedSubject && (
        <div>
          <SubjectTopicList config={config} schoolId={schoolId} selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject} selectedTopic={selectedTopic} setSelectedTopic={setSelectedTopic} />
        </div>
      )}
    </div>
    </>
  );
};

export default SubjectList;