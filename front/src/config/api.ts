// API Configuration for different environments
const API_CONFIG = {
  // Development (local)
  development: {
    baseURL: 'http://localhost:3000',
  },
  // Production (your deployed backend)
  production: {
    // IMPORTANT: You need to deploy your backend to a hosting service
    // Popular options: Railway, Render, Heroku, DigitalOcean App Platform
    // For now, we'll use a placeholder - replace with your actual backend URL
    baseURL: 'https://your-backend-api.railway.app', // Example: Railway deployment
  }
};

// Determine current environment
const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const environment = isProduction ? 'production' : 'development';

// Export the current config
export const apiConfig = API_CONFIG[environment];

// Helper function to build API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // In development, use proxy (relative URLs work with Vite proxy)
  if (isDevelopment) {
    return `/${cleanEndpoint}`;
  }
  
  // In production, use full URL to your deployed backend
  return `${apiConfig.baseURL}/${cleanEndpoint}`;
};

// Export common API endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: 'api/users/login',
  REGISTER: 'api/users/register',
  
  // Settings
  SETTINGS_INTEGRATION: 'api/settings/integration',
  SETTINGS_PROFILE: 'api/settings/profile',
  
  // Ausbildung
  AUSBILDUNG_READY_TO_SEND: 'api/ausbildung/ready-to-send',
  AUSBILDUNG_STATS: 'api/ausbildung/stats',
  AUSBILDUNG_GENERATE_LETTERS: 'api/ausbildung/generate-letters',
  AUSBILDUNG_SEND_EMAILS: 'api/ausbildung/email/send',
  AUSBILDUNG_DOCUMENTS: 'api/ausbildung/documents',
  
  // Jobs
  AUSBILDUNG_JOBS: 'api/ausbildung',
};