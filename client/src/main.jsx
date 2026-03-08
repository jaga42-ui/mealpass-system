import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { GoogleOAuthProvider } from '@react-oauth/google' // <-- Bring in Google Provider

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. Google Provider grabs the Client ID securely from your .env file */}
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      
      {/* 2. Your custom Auth Provider manages the local session and roles */}
      <AuthProvider>
        <App />
      </AuthProvider>
      
    </GoogleOAuthProvider>
  </React.StrictMode>,
)