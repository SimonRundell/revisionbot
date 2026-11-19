import { useState } from 'react';
import { Modal } from 'antd';

/****************************************************************************
 * AvatarManager Component
 * Renders the avatar selection and management options for the user.
 * Includes image upload, preview, lightbox modal, and reset to default functionality.
 * Handles file validation (size/type) and base64 encoding for avatar storage.
 * 
 * @param {Object} props - Component props
 * @param {string|null} props.currentAvatar - Current avatar data (base64 or URL) or null for default
 * @param {Function} props.onAvatarChange - Callback function when avatar is changed or reset
 * @param {Function} props.setSendErrorMessage - Function to set error messages for validation failures
 * @param {number} [props.size=60] - Size in pixels for avatar display (width and height)
 * @param {string} [props.className="avatar"] - CSS class name for the avatar image element
 * @returns {JSX.Element} The AvatarManager component
****************************************************************************/

function AvatarManager  ({ currentAvatar, onAvatarChange, setSendErrorMessage, size = 60, className = "avatar"}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const avatarPreview = currentAvatar || '/images/default_avatar.png';

  /**
   * Handle file selection for avatar upload
   * Validates file size (max 5MB) and type (images only)
   * Converts selected image to base64 and calls onAvatarChange callback
   * 
   * @param {Event} event - File input change event containing selected file
   */
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

  /**
   * Reset avatar to default image
   * Calls onAvatarChange with null to use default avatar and closes modal
   */
  const resetAvatar = () => {
    onAvatarChange(null);
    setIsModalOpen(false);
  };

  /**
   * Open lightbox modal for avatar preview
   * Sets modal visibility state to true
   */
  const openLightbox = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="avatar-manager">
      <div className="avatar-container">
        <button
          type="button"
          onClick={openLightbox}
          aria-label="View avatar in full size"
          style={{
            padding: 0,
            border: 'none',
            background: 'none',
            boxShadow: 'none',
            borderRadius: '50%',
            minHeight: 0,
            cursor: 'pointer',
          }}
        >
          <img
            className={className}
            src={avatarPreview}
            alt=""
            style={{
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--color-brass-700)'
            }}
          />
        </button>
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
          <button key="reset" onClick={resetAvatar} style={{ marginLeft: '8px', backgroundColor: 'var(--color-danger)', color: 'var(--color-text-inverse)' }}>
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
          <div style={{ marginTop: '15px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Click the avatar image to view in full size
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AvatarManager;