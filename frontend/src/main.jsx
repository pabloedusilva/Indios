import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#1C1410',
            border: '1px solid #EDE9E3',
            borderRadius: '12px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px',
            boxShadow: '0 4px 20px rgba(28,20,16,0.10)',
          },
          success: {
            iconTheme: { primary: '#E8650A', secondary: '#FFFFFF' },
          },
          error: {
            iconTheme: { primary: '#C93517', secondary: '#FFFFFF' },
          },
          duration: 3000,
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
