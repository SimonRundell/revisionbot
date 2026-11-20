import { createRoot } from 'react-dom/client'
import '@fortawesome/fontawesome-free/css/all.min.css'
import { ConfigProvider, theme as antdTheme } from 'antd'
import App from './App.jsx'
import { initGenericModalA11y } from './utils/genericModalA11y.js'

/****************************************************************
 * Main Component
 * Renders the main application layout and components.
 * Wraps the app in an antd ConfigProvider so every antd component
 * (Table, Modal, Form, Tabs, DatePicker, Upload, etc.) picks up the
 * steampunk palette instead of antd's default theme. Token values
 * reference the CSS custom properties in src/styles/tokens.css so
 * there is a single source of truth for color across plain CSS and
 * antd.
*****************************************************************/

const steampunkAntdTheme = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: 'var(--color-brass-500)',
    colorLink: 'var(--color-verdigris-500)',
    colorLinkHover: 'var(--color-verdigris-300)',
    colorSuccess: 'var(--color-success)',
    colorWarning: 'var(--color-warning)',
    colorError: 'var(--color-danger)',
    colorInfo: 'var(--color-info)',
    colorTextBase: 'var(--color-text-primary)',
    colorBgBase: 'var(--color-ground-primary)',
    colorBorder: 'var(--color-brass-700)',
    // Text drawn on solid-filled primary surfaces (e.g. Primary button face) —
    // verified 7.3:1 against --color-brass-500.
    colorTextLightSolid: 'var(--color-text-inverse)',
    borderRadius: 8,
    fontFamily: "'Spectral', Georgia, 'Times New Roman', serif",
  },
  components: {
    Layout: {
      bodyBg: 'var(--color-ground-primary)',
      headerBg: 'var(--color-ground-elevated)',
    },
    Modal: {
      contentBg: 'var(--color-ground-raised)',
      headerBg: 'var(--color-ground-raised)',
    },
  },
}

createRoot(document.getElementById('root')).render(
  <ConfigProvider theme={steampunkAntdTheme}>
    <App />
  </ConfigProvider>
)

initGenericModalA11y()
