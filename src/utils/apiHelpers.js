/****************************************************************************************
 
Utility functions for handling API responses


 * Parses the standard backend response format: {message: "JSON_STRING", status_code: 200}
 * @param {Object} responseData - The response data from axios
 * @param {Function} setSendSuccessMessage - Success message setter function
 * @param {Function} setSendErrorMessage - Error message setter function
 * @param {string} successMessage - Message to show on success (optional)
 * @param {string} errorMessage - Message to show on error (optional)
 * @returns {Object|Array|null} - Parsed data or null if error
 *
 ***************************************************************************************/
export const parseApiResponse = (
    responseData, 
    setSendSuccessMessage, 
    setSendErrorMessage, 
    successMessage = 'Data loaded successfully', 
    errorMessage = 'Failed to load data'
) => {
    try {
        if (responseData.status_code === 200) {
            let parsedData;
            
            // Try to parse as JSON first, if it fails treat as plain string
            try {
                parsedData = JSON.parse(responseData.message);
            } catch (jsonError) {
                // If JSON parsing fails, treat as plain string response
                // console.log(jsonError)
                parsedData = responseData.message;
            }
            
            if (setSendSuccessMessage) {
                setSendSuccessMessage(successMessage);
            }
            return parsedData;
        } else {
            if (setSendErrorMessage) {
                setSendErrorMessage(errorMessage);
            }
            return null;
        }
    } catch (parseError) {
        console.error('Error parsing API response:', parseError);
        if (setSendErrorMessage) {
            setSendErrorMessage('Error parsing server response');
        }
        return null;
    }
};

/******************************************************************************
 * 
 * Handles common API call pattern with loading state and error handling
 * @param {Function} apiCall - The axios API call function
 * @param {Function} setData - Function to set the parsed data
 * @param {Function} setIsLoading - Loading state setter
 * @param {Function} setSendSuccessMessage - Success message setter
 * @param {Function} setSendErrorMessage - Error message setter
 * @param {string} successMessage - Success message
 * @param {string} errorMessage - Error message
 * 
 *****************************************************************************/
export const handleApiCall = async (
    apiCall,
    setData,
    setIsLoading,
    setSendSuccessMessage,
    setSendErrorMessage,
    successMessage = 'Data loaded successfully',
    errorMessage = 'Failed to load data'
) => {
    setIsLoading(true);
    try {
        const response = await apiCall();
        const parsedData = parseApiResponse(
            response.data,
            setSendSuccessMessage,
            setSendErrorMessage,
            successMessage,
            errorMessage
        );
        
        if (parsedData !== null) {
            setData(parsedData);
        }
    } catch (error) {
        console.error('API call error:', error);
        setSendErrorMessage('Network error. Please try again.');
    } finally {
        setIsLoading(false);
    }
};