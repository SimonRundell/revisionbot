import { useEffect, useState } from 'react';
import { Spin } from 'antd';

/****************************************************************
 * SelectLocale Component
 * Renders a dropdown for selecting a user's locale.
 * Fetches locale data from a JSON file and displays it in the dropdown.
*****************************************************************/

function SelectLocale({ config, userLocale, setUserLocale, setSendErrorMessage }) {
    const [locales, setLocales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/locales.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setLocales(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching locales:', error);
                setSendErrorMessage('Error fetching locales');
                setLoading(false);
            });
    }, [config.api, setSendErrorMessage]);

    const handleLocaleSelect = (code) => {
        setUserLocale(code);
        // console.log("Selected Locale:", code);
    };

    return (
        <div>
            {loading ? (
                <span className="inplace-spinner"><Spin size="small" /></span>
            ) : (
                <select
                    className="locale-dropdown"
                    value={userLocale || ''}
                    onChange={(e) => handleLocaleSelect(e.target.value)}
                >
                    <option value="" disabled>Select a Locale</option>
                    {locales.map((locale) => (
                        <option key={locale.code} value={locale.code}>
                            {locale.label}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}

export default SelectLocale;