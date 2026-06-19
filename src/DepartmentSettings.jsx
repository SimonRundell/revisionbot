import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Drawer, Spin } from 'antd';
import { createJsonHeaders } from './utils/apiHeaders';
import { parseApiResponse } from './utils/apiHelpers';

/****************************************************************************
 * DepartmentSettings Component
 *
 * Department-admin panel for managing the department's own Gemini API key.
 * AI assessment runs against (and is billed to) this key, so each department
 * supplies its own. The key is write-only from the UI: the server never returns
 * it, only whether one is configured and its last four characters.
 *
 * The super-admin deliberately has no access here; keys are department-managed.
 *
 * @param {Object} props
 * @param {Object} props.config - App config containing the api base URL
 * @param {Object} props.currentUser - Authenticated department admin (token, department_id)
 * @param {boolean} props.open - Whether the drawer is visible
 * @param {Function} props.setOpen - Toggle drawer visibility
 * @param {Function} props.setSendSuccessMessage - Parent success message setter
 * @param {Function} props.setSendErrorMessage - Parent error message setter
 * @returns {JSX.Element}
 ****************************************************************************/

function DepartmentSettings({ config, currentUser, open, setOpen,
                             setSendSuccessMessage, setSendErrorMessage }) {

    const [isLoading, setIsLoading] = useState(false);
    const [department, setDepartment] = useState(null);
    const [keyInput, setKeyInput] = useState('');

    /**
     * Load the caller's own department (the endpoint scopes to it automatically).
     */
    const loadDepartment = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(
                `${config.api}/getDepartments.php`,
                {},
                { headers: createJsonHeaders(currentUser) }
            );
            const parsed = parseApiResponse(response.data, null, setSendErrorMessage, '', 'Failed to load department.');
            if (Array.isArray(parsed) && parsed.length > 0) {
                setDepartment(parsed[0]);
            }
        } catch (error) {
            console.error('Error loading department:', error);
            setSendErrorMessage('Unable to load department settings.');
        } finally {
            setIsLoading(false);
        }
    }, [config.api, currentUser, setSendErrorMessage]);

    useEffect(() => {
        if (open) {
            setKeyInput('');
            loadDepartment();
        }
    }, [open, loadDepartment]);

    /**
     * Save (or replace) the department's Gemini key.
     */
    const handleSaveKey = async () => {
        const trimmed = keyInput.trim();
        if (trimmed === '') {
            setSendErrorMessage('Please enter a Gemini API key.');
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post(
                `${config.api}/setDepartmentGeminiKey.php`,
                { gemini_key: trimmed },
                { headers: createJsonHeaders(currentUser) }
            );
            if (response.data.status_code === 200) {
                setSendSuccessMessage(response.data.message || 'Gemini API key saved.');
                setKeyInput('');
                await loadDepartment();
            } else {
                setSendErrorMessage(response.data.message || 'Unable to save the key.');
            }
        } catch (error) {
            console.error('Error saving Gemini key:', error);
            setSendErrorMessage(error.response?.data?.message || 'Unable to save the key.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Drawer
            title="Department Settings"
            closable={{ 'aria-label': 'Close Button' }}
            onClose={() => setOpen(false)}
            open={open}
            width={520}
        >
            {isLoading && (
                <div className="central-overlay-spinner">
                    <div className="spinner-text">&nbsp;&nbsp;<Spin size="large" /> Processing...</div>
                </div>
            )}

            {department && (
                <div className="department-settings">
                    <table border="1" className="edit-modal-table">
                        <tbody>
                            <tr>
                                <td>School</td>
                                <td>{department.school_name}</td>
                            </tr>
                            <tr>
                                <td>Department</td>
                                <td>{department.department_name}</td>
                            </tr>
                            <tr>
                                <td>AI key status</td>
                                <td>
                                    {department.hasGeminiKey
                                        ? `Configured (ending ••••${department.gemini_key_last4 ?? ''})`
                                        : 'Not configured — AI assessment is unavailable until a key is added.'}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="department-key-form topgap">
                        <h4>{department.hasGeminiKey ? 'Replace Gemini API key' : 'Add Gemini API key'}</h4>
                        <p className="department-key-hint">
                            Your department&apos;s AI assessment uses this key, and Google bills usage to it.
                            Get a key from Google AI Studio. The key is stored encrypted and never shown again.
                        </p>
                        <input
                            type="password"
                            className="full-width-input"
                            value={keyInput}
                            onChange={(e) => setKeyInput(e.target.value)}
                            placeholder="Paste your Gemini API key"
                            autoComplete="off"
                        />
                        <div className="form-group-button">
                            <button onClick={handleSaveKey} disabled={isLoading || keyInput.trim() === ''}>
                                Save Key
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Drawer>
    );
}

export default DepartmentSettings;
