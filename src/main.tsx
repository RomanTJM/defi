import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import App from './App.tsx'
import './styles.css'

window.Buffer = window.Buffer || Buffer

createRoot(document.getElementById('root')!).render(
  <App />
)
