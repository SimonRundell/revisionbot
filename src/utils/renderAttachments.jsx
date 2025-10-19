import {
    ensureDataUrl,
    formatAttachmentSize,
    getFileIconMeta
} from './fileAttachments';

/**************************************************************************************
 * 
 * Render attachment previews/download links for question and response content.
 * Accepts `attachments` in either serialized JSON string form or as an array.
 * 
 **************************************************************************************/
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

export default renderAttachments;
