import { createRoot } from 'react-dom/client'
import '@fortawesome/fontawesome-free/css/all.min.css'
import App from './App.jsx'

/****************************************************************
 * Main Component
 * Renders the main application layout and components.
*****************************************************************/

createRoot(document.getElementById('root')).render(<App />)
