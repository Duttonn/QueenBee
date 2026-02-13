import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Patch global fetch to always send credentials (session cookie) for cross-origin API calls
const _fetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
  return _fetch(input, { ...init, credentials: init?.credentials || 'include' });
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
