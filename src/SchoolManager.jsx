import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Drawer, Spin } from 'antd';
import CryptoJS from 'crypto-js';
import { createJsonHeaders } from './utils/apiHeaders';
import { parseApiResponse } from './utils/apiHelpers';

/****************************************************************************
 * SchoolManager Component
 *
 * Super-admin console for onboarding and maintaining schools, their
 * departments, and each school's admin accounts. The operator does NOT manage
 * department Gemini API keys here (those are department-managed); only a
 * read-only "AI key configured" status is shown.
 *
 * @param {Object} props
 * @param {Object} props.config - App config containing the api base URL
 * @param {Object} props.currentUser - Authenticated super-admin (token)
 * @param {boolean} props.open - Whether the drawer is visible
 * @param {Function} props.setOpen - Toggle drawer visibility
 * @param {Function} props.setSendSuccessMessage - Parent success message setter
 * @param {Function} props.setSendErrorMessage - Parent error message setter
 * @returns {JSX.Element}
 ****************************************************************************/

function SchoolManager({ config, currentUser, open, setOpen,
                        setSendSuccessMessage, setSendErrorMessage }) {

    const [isLoading, setIsLoading] = useState(false);
    const [schools, setSchools] = useState([]);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [departments, setDepartments] = useState([]);

    const [newSchoolName, setNewSchoolName] = useState('');
    const [editingSchool, setEditingSchool] = useState(null);
    const [editingSchoolName, setEditingSchoolName] = useState('');

    const [newDeptName, setNewDeptName] = useState('');

    // Onboard-admin modal state
    const [adminModalDept, setAdminModalDept] = useState(null);
    const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '' });

    const headers = useCallback(() => createJsonHeaders(currentUser), [currentUser]);

    const loadSchools = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.api}/getSchools.php`, {}, { headers: headers() });
            const parsed = parseApiResponse(response.data, null, setSendErrorMessage, '', 'Failed to load schools.');
            if (Array.isArray(parsed)) setSchools(parsed);
        } catch (error) {
            console.error('Error loading schools:', error);
            setSendErrorMessage('Unable to load schools.');
        } finally {
            setIsLoading(false);
        }
    }, [config.api, headers, setSendErrorMessage]);

    const loadDepartments = useCallback(async (schoolId) => {
        try {
            const response = await axios.post(`${config.api}/getDepartments.php`, { school_id: schoolId }, { headers: headers() });
            const parsed = parseApiResponse(response.data, null, setSendErrorMessage, '', 'Failed to load departments.');
            setDepartments(Array.isArray(parsed) ? parsed : []);
        } catch (error) {
            console.error('Error loading departments:', error);
            setDepartments([]);
        }
    }, [config.api, headers, setSendErrorMessage]);

    // Load schools when the drawer opens. Only async work happens here; the
    // selection/department list is cleared on close (handleClose) rather than
    // synchronously on the open prop change.
    useEffect(() => {
        if (open) {
            loadSchools();
        }
    }, [open, loadSchools]);

    const handleClose = () => {
        setSelectedSchool(null);
        setDepartments([]);
        setOpen(false);
    };

    useEffect(() => {
        if (selectedSchool) loadDepartments(selectedSchool.id);
    }, [selectedSchool, loadDepartments]);

    /** Generic POST helper that refreshes after a successful mutation. */
    const mutate = async (endpoint, payload, successMsg, after) => {
        setIsLoading(true);
        try {
            const response = await axios.post(`${config.api}/${endpoint}`, payload, { headers: headers() });
            if (response.data.status_code === 200) {
                setSendSuccessMessage(response.data.message || successMsg);
                if (after) await after();
                return true;
            }
            setSendErrorMessage(response.data.message || 'Operation failed.');
            return false;
        } catch (error) {
            console.error(`Error calling ${endpoint}:`, error);
            setSendErrorMessage(error.response?.data?.message || 'Operation failed.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateSchool = async () => {
        if (newSchoolName.trim() === '') { setSendErrorMessage('School name is required.'); return; }
        if (await mutate('createSchool.php', { school_name: newSchoolName.trim() }, 'School created.', loadSchools)) {
            setNewSchoolName('');
        }
    };

    const handleSaveSchoolEdit = async () => {
        if (editingSchoolName.trim() === '') { setSendErrorMessage('School name is required.'); return; }
        if (await mutate('updateSchool.php', { id: editingSchool.id, school_name: editingSchoolName.trim() }, 'School updated.', loadSchools)) {
            setEditingSchool(null);
            setEditingSchoolName('');
        }
    };

    const handleDeleteSchool = async (school) => {
        await mutate('deleteSchool.php', { id: school.id }, 'School deleted.', async () => {
            if (selectedSchool?.id === school.id) { setSelectedSchool(null); setDepartments([]); }
            await loadSchools();
        });
    };

    const handleCreateDepartment = async () => {
        if (!selectedSchool) return;
        if (newDeptName.trim() === '') { setSendErrorMessage('Department name is required.'); return; }
        if (await mutate('createDepartment.php', { school_id: selectedSchool.id, department_name: newDeptName.trim() },
            'Department created.', () => loadDepartments(selectedSchool.id))) {
            setNewDeptName('');
        }
    };

    const handleDeleteDepartment = async (dept) => {
        await mutate('deleteDepartment.php', { id: dept.id }, 'Department deleted.', () => loadDepartments(selectedSchool.id));
    };

    const openAdminModal = (dept) => {
        setAdminModalDept(dept);
        setAdminForm({ name: '', email: '', password: '' });
    };

    const handleCreateAdmin = async () => {
        const { name, email, password } = adminForm;
        if (!name.trim() || !email.trim() || !password.trim()) {
            setSendErrorMessage('Name, email and password are all required.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) { setSendErrorMessage('Please enter a valid email address.'); return; }

        const payload = {
            email: email.trim(),
            passwordHash: CryptoJS.MD5(password).toString(),
            userName: name.trim(),
            userClass: '',
            userStatus: 1,
            userLocale: 'en-GB',
            avatar: '',
            admin: 1,
            department_id: adminModalDept.id,
            userAccess: JSON.stringify({ '1': 'all' }),
        };

        const ok = await mutate('InsertUser.php', payload, 'Department admin created.', null);
        if (ok) {
            // Best-effort welcome email so the new admin gets their credentials.
            try {
                await axios.post(`${config.api}/sendWelcomeEmail.php`,
                    { email: email.trim(), userName: name.trim(), password },
                    { headers: headers() });
            } catch (emailError) {
                console.warn('Welcome email failed:', emailError);
            }
            setAdminModalDept(null);
        }
    };

    return (
        <>
            <Drawer
                title="Schools & Departments"
                closable={{ 'aria-label': 'Close Button' }}
                onClose={handleClose}
                open={open}
                width={'80%'}
            >
                {isLoading && (
                    <div className="central-overlay-spinner">
                        <div className="spinner-text">&nbsp;&nbsp;<Spin size="large" /> Processing...</div>
                    </div>
                )}

                <div className="school-manager">
                    <h3>Schools</h3>
                    <div className="class-manager-form-row">
                        <input
                            type="text"
                            className="full-width-input"
                            value={newSchoolName}
                            onChange={(e) => setNewSchoolName(e.target.value)}
                            placeholder="New school name"
                        />
                        <button onClick={handleCreateSchool} className="leftgap">Add School</button>
                    </div>

                    <table border="1" className="admin-user-table topgap">
                        <thead>
                            <tr><th>School</th><th>Status</th><th>Actions</th></tr>
                        </thead>
                        <tbody>
                            {schools.length === 0 && (
                                <tr><td colSpan={3}>No schools yet.</td></tr>
                            )}
                            {schools.map((school) => (
                                <tr key={school.id} className={selectedSchool?.id === school.id ? 'active' : ''}>
                                    <td>
                                        {editingSchool?.id === school.id ? (
                                            <input
                                                type="text"
                                                className="full-width-input"
                                                value={editingSchoolName}
                                                onChange={(e) => setEditingSchoolName(e.target.value)}
                                            />
                                        ) : school.school_name}
                                    </td>
                                    <td>{Number(school.is_active) === 0 ? 'Inactive' : 'Active'}</td>
                                    <td>
                                        {editingSchool?.id === school.id ? (
                                            <>
                                                <button className="admin-action-btn admin-action-edit rightgap" onClick={handleSaveSchoolEdit}>Save</button>
                                                <button className="admin-action-btn" onClick={() => setEditingSchool(null)}>Cancel</button>
                                            </>
                                        ) : (
                                            <>
                                                <button className="admin-action-btn admin-action-edit rightgap" onClick={() => setSelectedSchool(school)}>Departments</button>
                                                <button className="admin-action-btn rightgap" onClick={() => { setEditingSchool(school); setEditingSchoolName(school.school_name); }}>Rename</button>
                                                <button className="admin-action-btn admin-action-delete" onClick={() => handleDeleteSchool(school)}>Delete</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {selectedSchool && (
                        <div className="topgap">
                            <h3>Departments in {selectedSchool.school_name}</h3>
                            <div className="class-manager-form-row">
                                <input
                                    type="text"
                                    className="full-width-input"
                                    value={newDeptName}
                                    onChange={(e) => setNewDeptName(e.target.value)}
                                    placeholder="New department name"
                                />
                                <button onClick={handleCreateDepartment} className="leftgap">Add Department</button>
                            </div>

                            <table border="1" className="admin-user-table topgap">
                                <thead>
                                    <tr><th>Department</th><th>AI key</th><th>Status</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {departments.length === 0 && (
                                        <tr><td colSpan={4}>No departments yet.</td></tr>
                                    )}
                                    {departments.map((dept) => (
                                        <tr key={dept.id}>
                                            <td>{dept.department_name}</td>
                                            <td>{dept.hasGeminiKey ? `Configured (••••${dept.gemini_key_last4 ?? ''})` : 'Not set'}</td>
                                            <td>{Number(dept.is_active) === 0 ? 'Inactive' : 'Active'}</td>
                                            <td>
                                                <button className="admin-action-btn admin-action-edit rightgap" onClick={() => openAdminModal(dept)}>Add Admin</button>
                                                <button className="admin-action-btn admin-action-delete" onClick={() => handleDeleteDepartment(dept)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="department-key-hint topgap">
                                Note: department Gemini API keys are set by each department&apos;s own admin, not here.
                            </p>
                        </div>
                    )}
                </div>
            </Drawer>

            {/* Onboard department admin modal */}
            {adminModalDept && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={() => setAdminModalDept(null)}>&times;</span>
                        <h2>Add Admin to {adminModalDept.department_name}</h2>
                        <table border="1" className="edit-modal-table">
                            <tbody>
                                <tr>
                                    <td>Name *</td>
                                    <td><input type="text" className="full-width-input" value={adminForm.name}
                                        onChange={(e) => setAdminForm(p => ({ ...p, name: e.target.value }))} /></td>
                                </tr>
                                <tr>
                                    <td>Email *</td>
                                    <td><input type="email" className="full-width-input" value={adminForm.email}
                                        onChange={(e) => setAdminForm(p => ({ ...p, email: e.target.value }))} /></td>
                                </tr>
                                <tr>
                                    <td>Password *</td>
                                    <td><input type="password" className="full-width-input" value={adminForm.password}
                                        onChange={(e) => setAdminForm(p => ({ ...p, password: e.target.value }))} /></td>
                                </tr>
                            </tbody>
                        </table>
                        <div className="form-group-button">
                            <button onClick={handleCreateAdmin}>Create Admin</button>
                            <button onClick={() => setAdminModalDept(null)} className="topgap">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default SchoolManager;
