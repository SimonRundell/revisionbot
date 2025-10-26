# Documentation Standards Guide

## Overview

This guide establishes consistent JSDoc documentation standards for the AI Revision Bot codebase to improve maintainability, developer onboarding, and code understanding.

## JSDoc Standards

### Required Tags

All functions, components, and classes must include these JSDoc tags where applicable:

- `@param` - Document each parameter with type and description
- `@returns` - Document return value type and description
- `@async` - Mark asynchronous functions
- `@description` - Brief description of function purpose (can be omitted if description is in the initial comment)

### Component Documentation

React components should include comprehensive prop documentation:

```javascript
/**
 * Component description explaining purpose and key features
 * 
 * @param {Object} props - Component props
 * @param {string|number} props.userId - The current user's ID
 * @param {Object} props.config - Configuration object containing API endpoints
 * @param {Function} props.setSendErrorMessage - Function to set error messages
 * @returns {JSX.Element} The component JSX
 */
const MyComponent = ({ userId, config, setSendErrorMessage }) => {
```

### Function Documentation

#### Arrow Functions

```javascript
/**
 * Brief description of what the function does
 * More detailed explanation if needed
 * 
 * @param {string} inputParam - Description of parameter
 * @param {Array} arrayParam - Array of objects containing data
 * @returns {Object} Description of return value
 */
const myArrowFunction = (inputParam, arrayParam) => {
    // Implementation
};
```

#### Async Functions

```javascript
/**
 * Handle data submission and processing
 * Submits data to API and handles response/error states
 * 
 * @async
 * @param {Object} data - Data object to submit
 * @returns {Promise<void>} Promise that resolves when submission complete
 */
const handleSubmit = async (data) => {
    // Implementation
};
```

#### Callback Functions

```javascript
/**
 * Filter data based on user access permissions
 * Admin users can access all data, regular users are filtered
 * 
 * @param {Array} allData - Array of all available data objects
 * @returns {Array} Filtered array of data the user can access
 */
const filterByAccess = useCallback((allData) => {
    // Implementation
}, [dependencies]);
```

### Event Handlers

```javascript
/**
 * Handle form input change events
 * Updates state and validates input if required
 * 
 * @param {Event} event - The input change event
 */
const handleInputChange = (event) => {
    // Implementation
};
```

### Utility Functions

```javascript
/**
 * Convert file size in bytes to human-readable format
 * Supports KB, MB, GB formatting with proper rounding
 * 
 * @param {number|string} size - File size in bytes
 * @returns {string} Formatted size string (e.g., '1.5 MB') or empty if invalid
 */
export const formatFileSize = (size) => {
    // Implementation
};
```

## Type Documentation

### Common Types

- `{string}` - Text values
- `{number}` - Numeric values
- `{boolean}` - True/false values
- `{Array}` - Arrays (specify content if known: `{Array<Object>}`)
- `{Object}` - Objects (specify structure if complex)
- `{Function}` - Function references
- `{Event}` - DOM events
- `{JSX.Element}` - React components
- `{Promise<Type>}` - Async return values

### Union Types

```javascript
/**
 * @param {string|number} id - Can be either string or number ID
 */
```

### Optional Parameters

```javascript
/**
 * @param {string} [optionalParam] - Optional parameter (square brackets)
 * @param {string} [defaultParam='default'] - Optional with default value
 */
```

## Best Practices

### 1. Be Descriptive
- Explain **what** the function does
- Explain **why** it exists if not obvious
- Note any side effects or state changes

### 2. Document Complex Logic
- Add inline comments for complex algorithms
- Explain business logic and edge cases
- Document any workarounds or browser-specific code

### 3. Keep Documentation Current
- Update docs when changing function signatures
- Review docs during code reviews
- Remove outdated comments

### 4. Use Consistent Language
- Use present tense ("Handles", not "Will handle")
- Be concise but complete
- Use consistent terminology across the codebase

## Examples from Codebase

### Component Example (StudentInterface.jsx)
```javascript
/**
 * Handle student answer submission and AI assessment
 * Submits answer to database, requests AI feedback, and displays results
 * Manages loading states and error handling throughout the process
 * 
 * @async
 * @returns {Promise<void>} Promise that resolves when submission and AI assessment complete
 */
const handleSubmitAnswer = async () => {
    // Implementation
};
```

### Utility Example (fileAttachments.js)
```javascript
/**
 * Determine the file type key for icon display based on MIME type and filename extension
 * Prioritizes file extension over MIME type for accurate categorization
 * 
 * @param {string} mimeType - The MIME type of the file (e.g., 'application/pdf')
 * @param {string} filename - The filename with extension (e.g., 'document.pdf')
 * @returns {string} File type key for icon mapping (pdf, word, excel, etc.) or 'default'
 */
export const getFileTypeKey = (mimeType = '', filename = '') => {
    // Implementation
};
```

## Documentation Coverage Goals

- [ ] **100%** of exported functions documented
- [ ] **100%** of React components documented
- [ ] **100%** of public API functions documented
- [ ] **90%+** of internal helper functions documented
- [ ] **80%+** of complex logic blocks commented

## Tools and Validation

### VS Code Extensions
- **JSDoc Comments** - Auto-generate JSDoc templates
- **Document This** - Generate documentation for functions
- **ESLint JSDoc** - Validate JSDoc syntax

### ESLint Rules (Recommended)
```json
{
  "jsdoc/require-description": "error",
  "jsdoc/require-param": "error",
  "jsdoc/require-returns": "error",
  "jsdoc/valid-types": "error"
}
```

## Maintenance

This documentation standard should be:
- Reviewed quarterly for updates
- Applied to all new code
- Used during code reviews
- Updated when patterns change

Last Updated: 2025-01-03