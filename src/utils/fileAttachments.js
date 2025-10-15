export const MIME_TYPE_ICON_MAP = {
    'application/pdf': 'pdf',
    'application/msword': 'word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template': 'word',
    'application/vnd.ms-excel': 'excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template': 'excel',
    'application/vnd.ms-powerpoint': 'powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.template': 'powerpoint',
    'text/plain': 'text',
    'text/csv': 'csv',
    'application/zip': 'archive',
    'application/x-zip-compressed': 'archive',
    'application/json': 'code',
    'application/javascript': 'code',
    'text/javascript': 'code',
    'text/html': 'code'
};

export const FILE_EXTENSION_ICON_MAP = {
    pdf: 'pdf',
    doc: 'word',
    docx: 'word',
    dotx: 'word',
    xls: 'excel',
    xlsx: 'excel',
    xlsm: 'excel',
    csv: 'csv',
    txt: 'text',
    log: 'text',
    ppt: 'powerpoint',
    pptx: 'powerpoint',
    pptm: 'powerpoint',
    zip: 'archive',
    rar: 'archive',
    '7z': 'archive',
    gz: 'archive',
    tar: 'archive',
    json: 'code',
    js: 'code',
    jsx: 'code',
    ts: 'code',
    tsx: 'code',
    html: 'code',
    css: 'code',
    mp3: 'audio',
    wav: 'audio',
    m4a: 'audio',
    flac: 'audio',
    mp4: 'video',
    mov: 'video',
    avi: 'video',
    mkv: 'video',
    webm: 'video'
};

export const FILE_ICON_LABELS = {
    pdf: 'PDF',
    word: 'DOC',
    excel: 'XLS',
    powerpoint: 'PPT',
    text: 'TXT',
    csv: 'CSV',
    archive: 'ZIP',
    audio: 'AUD',
    video: 'VID',
    code: 'CODE',
    default: 'FILE'
};

export const getFileTypeKey = (mimeType = '', filename = '') => {
    const extension = filename.includes('.')
        ? filename.split('.').pop().toLowerCase()
        : '';

    if (extension && FILE_EXTENSION_ICON_MAP[extension]) {
        return FILE_EXTENSION_ICON_MAP[extension];
    }

    if (mimeType) {
        if (MIME_TYPE_ICON_MAP[mimeType]) {
            return MIME_TYPE_ICON_MAP[mimeType];
        }

        if (mimeType.startsWith('audio/')) {
            return 'audio';
        }

        if (mimeType.startsWith('video/')) {
            return 'video';
        }

        if (mimeType.startsWith('text/')) {
            return 'text';
        }
    }

    return 'default';
};

export const getFileIconMeta = (mimeType = '', filename = '') => {
    const typeKey = getFileTypeKey(mimeType, filename);
    const extension = filename.includes('.')
        ? filename.split('.').pop().toUpperCase()
        : '';

    const label = extension
        ? extension.slice(0, 4)
        : (FILE_ICON_LABELS[typeKey] || FILE_ICON_LABELS.default);

    return {
        label,
        classSuffix: typeKey
    };
};

export const ensureDataUrl = (rawData, mimeType) => {
    if (!rawData) {
        return '';
    }

    const trimmed = String(rawData).trim();

    if (trimmed.startsWith('data:')) {
        return trimmed;
    }

    return `data:${mimeType || 'application/octet-stream'};base64,${trimmed}`;
};

export const formatAttachmentSize = (size) => {
    if (size === undefined || size === null) {
        return '';
    }

    const numericSize = typeof size === 'number' ? size : parseInt(size, 10);

    if (Number.isNaN(numericSize) || numericSize <= 0) {
        return '';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    let value = numericSize;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const displayValue = value >= 10 || unitIndex === 0
        ? Math.round(value)
        : Math.round(value * 10) / 10;

    return `${displayValue} ${units[unitIndex]}`;
};
