import { useState } from 'react';
import { Modal } from 'antd';

function AvatarManager  ({ currentAvatar, onAvatarChange, setSendErrorMessage, size = 60, className = "avatar"}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const avatarPreview = currentAvatar || '/default_avatar.png';

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setSendErrorMessage('Image file size must be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setSendErrorMessage('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target.result;
        onAvatarChange(base64String);
      };
      reader.onerror = () => {
        setSendErrorMessage('Error reading image file');
      };
      reader.readAsDataURL(file);
    }
    // Clear the input
    event.target.value = '';
  };

  // Reset avatar to default
  const resetAvatar = () => {
    onAvatarChange(null);
    setIsModalOpen(false);
  };

  // Open lightbox
  const openLightbox = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="avatar-manager">
      <div className="avatar-container">
        <img 
          className={className}
          src={avatarPreview} 
          alt="Avatar" 
          style={{ 
            width: `${size}px`, 
            height: `${size}px`, 
            borderRadius: '50%', 
            objectFit: 'cover',
            cursor: 'pointer',
            border: '2px solid #ddd'
          }}
          onClick={openLightbox}
        />
        <div className="avatar-controls">
          <div className="file-input-wrapper" style={{ marginBottom: '5px' }}>
            <input 
              type="file" 
              id="avatar-upload"
              className="file-input-hidden"
              accept="image/*" 
              onChange={handleFileSelect}
            />
            <label htmlFor="avatar-upload" className="file-input-button">
              Choose Image
            </label>
          </div>
          <button 
            type="button" 
            onClick={resetAvatar}
            className="avatar-reset-button"
          >
            Reset to Default
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      <Modal
        title="Avatar Preview"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <button key="close" onClick={() => setIsModalOpen(false)}>
            Close
          </button>,
          <button key="reset" onClick={resetAvatar} style={{ marginLeft: '8px', backgroundColor: '#dc3545', color: 'white' }}>
            Reset to Default
          </button>
        ]}
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <img 
            src={avatarPreview} 
            alt="Avatar Preview" 
            style={{ 
              maxWidth: '300px', 
              maxHeight: '300px', 
              borderRadius: '50%',
              objectFit: 'cover'
            }}
          />
          <div style={{ marginTop: '15px', color: '#666', fontSize: '14px' }}>
            Click the avatar image to view in full size
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AvatarManager;