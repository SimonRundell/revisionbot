/**
 * Date formatting utilities for consistent en-GB locale formatting
 * All dates will use British format (DD/MM/YYYY) and British time formatting
 */

// UK locale constant
const UK_LOCALE = 'en-GB';

/**
 * Format date as DD/MM/YYYY
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in DD/MM/YYYY format
 */
export const formatDate = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString(UK_LOCALE);
};

/**
 * Format time as HH:MM:SS (24-hour format) or HH:MM AM/PM based on UK preferences
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted time string
 */
export const formatTime = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleTimeString(UK_LOCALE);
};

/**
 * Format date and time together as DD/MM/YYYY, HH:MM:SS
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date and time string
 */
export const formatDateTime = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleString(UK_LOCALE);
};

/**
 * Format date for chart axis labels (shorter format)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string for charts (DD/MM/YY or DD/MM)
 */
export const formatChartDate = (date) => {
    if (!date) return '';
    const dateObj = date instanceof Date ? date : new Date(date);
    // Use shorter format for charts to save space
    return dateObj.toLocaleDateString(UK_LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
    });
};

/**
 * Format date range for reports (e.g., "from DD/MM/YYYY to DD/MM/YYYY")
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {string} Formatted date range string
 */
export const formatDateRange = (startDate, endDate) => {
    if (!startDate || !endDate) return '';
    return `from ${formatDate(startDate)} to ${formatDate(endDate)}`;
};