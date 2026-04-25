
export const truncateText = (text, maxLength) => {
    if (text.length <= maxLength) {
        return text;
    }
    return text.substring(0, maxLength) + '...';
};

export const preservePlainTextLineBreaks = (text) => {
    return text.replace(/\n/g, '<br>');
};

export const firstthreesentances = (text) => {
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g);
    if (sentences && sentences.length > 3) {
        return sentences.slice(0, 3).join(' ')+'..';
    }
    return text;
};