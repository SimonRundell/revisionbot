import { useEffect, useState } from 'react';
import { Spin } from 'antd';

/****************************************************************
 * SelectCountry Component
 * Renders a dropdown for selecting a user's country.
 * Fetches country data from a JSON file and displays it in the dropdown.
*****************************************************************/

function SelectCountry({ config, userLocation, setUserLocation, setSendErrorMessage }) {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/country_codes.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                setCountries(data);
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching countries:', error);
                setSendErrorMessage('Error fetching countries');
                setLoading(false);
            });
    }, [config.api, setSendErrorMessage]);

    const handleCountrySelect = (abbreviation) => {
        setUserLocation(abbreviation);
        // console.log("Selected country:", abbreviation);
        // setSendSuccessMessage(`Selected country: ${abbreviation}`);
    };

    return (
        <div>
            {loading ? (
                <span className="inplace-spinner"><Spin size="small" /></span>
            ) : (
                <select
                    className="country-dropdown"
                    value={userLocation || ''}
                    onChange={(e) => handleCountrySelect(e.target.value)}
                >
                    <option value="" disabled>Select a country</option>
                    {countries.map((country) => (
                        <option key={country.abbreviation} value={country.abbreviation}>
                            {country.country}
                        </option>
                    ))}
                </select>
            )}
        </div>
    );
}

export default SelectCountry;