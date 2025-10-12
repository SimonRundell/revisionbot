import React, { useState, useEffect, useRef } from 'react';
import { Spin, message, Modal } from 'antd';
import TeacherEmailDropdown from './teacherEmailDropdown';
import axios from 'axios';

const Question = ({ config, schoolId, userId, selectedTopic, selectedSubject, selectedQuestion }) => {
  const [question, setQuestion] = useState('');
  const [markscheme, setMarkscheme] = useState('');
  const [useranswer, setUseranswer] = useState('');
  const [fileList, setFileList] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLightBox, setShowLightbox] = useState(false);
  const [lightBoxImage, setLightBoxImage] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [selectedTeacherEmail, setSelectedTeacherEmail] = useState(null); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const feedbackRef = useRef(null);

  useEffect(() => {
    setQuestion('');
    setMarkscheme('');
    setUseranswer('');
    setIsLoading(true);

    const fetchQuestion = async () => {
      try {
        const response = await axios.post(config.api + '/getSingleQuestion.php', { id: selectedQuestion }, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = response.data;
        console.log('Response:', data);

        const parsedData = JSON.parse(data.message)[0]; // Parse the JSON string and get the first object
        setQuestion(parsedData.question);
        setMarkscheme(parsedData.markscheme);
        setFileList(parsedData.fileList);
        console.log('Parsed question:', parsedData.question);
        console.log('Parsed markscheme:', parsedData.markscheme);
        setIsLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false);
      }
    };

    fetchQuestion();
  }, [config, selectedTopic, selectedQuestion]);

  const recordAnswer = async (markscheme, useranswer, airesponse, modelresponse) => {
    try {
      const jsonData = { userId: userId, selectedQuestion: selectedQuestion, 
                         markscheme: markscheme, useranswer: useranswer, 
                         airesponse: airesponse, modelresponse: modelresponse,
                         teacherEmail: selectedTeacherEmail };
      console.log("Recording Answer:", jsonData);

      const response = await axios.post(config.api + '/addResponse.php', jsonData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;
      console.log('tblResponse:', data);
      if (data.status_code === 200) {
        message.info('Response recorded successfully');
      } else {
        message.info('Error recording response');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTeacherEmail) {
      messageApi.error('Please select a teacher email');
      return;
    }
  
    try {
      setIsLoading(true);
  
      const jsonData = { question, markscheme, useranswer };
  
      console.log("Submitting:", jsonData);
  
      const response = await axios.post(config.api + '/geminiAPI.php', jsonData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      const data = response.data;
      console.log('The AI Response:', data);
  
      if (data && data.content) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(data.content, 'text/html');
  
        const questionElement = doc.querySelector('h4:nth-of-type(1) + p');
        const markschemeElement = doc.querySelector('h4:nth-of-type(2) + p');
        const userResponseElement = doc.querySelector('h4:nth-of-type(3) + p');
        const aiFeedbackElement = doc.querySelector('h4:nth-of-type(4) + p');
        const modelExampleElement = doc.querySelector('h4:nth-of-type(5) + p');
  
        const parsedFeedback = {
          question: questionElement ? questionElement.innerHTML : '',
          markscheme: markschemeElement ? markschemeElement.innerHTML : '',
          userResponse: userResponseElement ? userResponseElement.innerHTML : '',
          aiFeedback: aiFeedbackElement ? aiFeedbackElement.innerHTML : '',
          modelExample: modelExampleElement ? modelExampleElement.innerHTML : '',
        };
  
        console.log('Parsed Feedback:', parsedFeedback);
  
        setFeedback(parsedFeedback);
        setIsLoading(false);
        recordAnswer(parsedFeedback.markscheme, parsedFeedback.userResponse, parsedFeedback.aiFeedback, parsedFeedback.modelExample);
        setError(null);
        showModal(); // display feedback
      } else {
        setError("Error: Missing content in response");
        setFeedback(null);
        setIsLoading(false);
        messageApi.error('Error: Missing content in response');
      }
    } catch (error) {
      setError("ERROR: " + error.message);
      setFeedback(null);
      setIsLoading(false);
      messageApi.error('Error recording response');
    }
  };

  const handleShowLightBox = (image) => {
    console.log("Showing Lightbox:");
    setShowLightbox(true);
    setLightBoxImage(image);
  } 

  const showSelectedTeacherEmail = () => {
    if (selectedTeacherEmail) {
      return selectedTeacherEmail;
    } else {
      return "(your teacher's email)";
    }
  }

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <>
      <div className="form-container">
        {contextHolder}
        <form onSubmit={handleSubmit} className="question-form">
          {fileList && (
            <div className="form-group">
              <div className="admin-column-container top">
                <div className="question-image-container">
                  {JSON.parse(fileList).map((file, index) => (
                    <img
                      key={index}
                      src={file.thumbUrl}
                      alt={file.name}
                      onClick={() => handleShowLightBox(file.thumbUrl)}
                      className="question-image-lightbox"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="form-group">
            <label>IMPORTANT: This question is for {showSelectedTeacherEmail()}</label> 
            <TeacherEmailDropdown 
              config={config}
              selectedSchool={schoolId}
              selectedTeacherEmail={selectedTeacherEmail}
              setSelectedTeacherEmail={setSelectedTeacherEmail}
            />
          </div>
          <div className="form-group">
            <label>Question:</label>
            <div>{question}</div>
          </div>
          <div className="form-group">
            <label>Your Answer:</label>
            <textarea value={useranswer} onChange={(e) => setUseranswer(e.target.value)} required/>
          </div>
          <button type="submit">{isLoading ? 'Submitting...' : 'Submit'}</button>
        </form>
        {showLightBox && (
          <div className="lightbox" onClick={() => setShowLightbox(false)}>
            <span className="lightbox-close">&times;</span>
            <div className="lightbox-content">
              <img src={lightBoxImage} alt="Lightbox" />
            </div>
          </div>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {isLoading && <div className="central-overlay-spinner">            <div className="spinner-content">
              <Spin size="large" />
            </div></div>}
      
        <Modal
          title="Feedback on your answer (awaiting teacher review)"
          open={isModalVisible}
          onOk={handleOk}
          onCancel={handleCancel}
          footer={null}
          width="80%"
          style={{ top: 20 }}
        >           
              <h4>The Question</h4>
              <p dangerouslySetInnerHTML={{ __html: feedback?.question }} className="no-select" />
              <h4>Your Response</h4>
              <p dangerouslySetInnerHTML={{ __html: feedback?.userResponse }} className="no-select" />
              <h4>AI Feedback</h4>
              <p dangerouslySetInnerHTML={{ __html: feedback?.aiFeedback }} className="no-select" />
              <h4>Model Example</h4>
              <p dangerouslySetInnerHTML={{ __html: feedback?.modelExample }} className="no-select" />
            
            <button onClick={handleOk}>Close</button>
          
        </Modal>
      </div>
    </>
  );
};

export default Question;