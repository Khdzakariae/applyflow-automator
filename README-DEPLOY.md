# ApplyFlow Automator - Deployment Guide

## 🚀 Netlify Deployment Setup

### Frontend Deployment (Netlify)

Your frontend is configured to deploy to `applyflow-automator.netlify.app`.

#### Steps to Deploy:

1. **Connect to Netlify:**
   - Go to [Netlify](https://netlify.app)
   - Connect your GitHub repository
   - Select this repository

2. **Build Settings:**
   - Build command: `npm run build:netlify`
   - Publish directory: `front/dist`
   - Base directory: `front/`

3. **Environment Variables:**
   - No frontend environment variables needed for basic setup

### Backend Deployment (Required)

⚠️ **Important**: You need to deploy your backend separately before the frontend will work in production.

#### Recommended Backend Hosting Options:

1. **Railway** (Recommended for Node.js)
   - Go to [Railway](https://railway.app)
   - Connect your GitHub repo
   - Deploy the `backend/` folder
   - Set environment variables in Railway dashboard

2. **Render**
   - Go to [Render](https://render.com)
   - Create new Web Service
   - Connect GitHub repo
   - Root directory: `backend`

3. **Heroku**
   - Install Heroku CLI
   - Create new app
   - Deploy backend folder

#### Backend Environment Variables:
```
DATABASE_URL=your_database_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

#### After Backend Deployment:
1. Update `front/src/config/api.ts`
2. Replace `https://your-backend-api.railway.app` with your actual backend URL
3. Redeploy the frontend on Netlify

### Database Setup

You'll need a hosted database. Options:
- **Railway PostgreSQL** (if using Railway)
- **Supabase** (PostgreSQL)
- **PlanetScale** (MySQL)
- **Neon** (PostgreSQL)

### Domain Configuration

Your app will be available at: `https://applyflow-automator.netlify.app`

### Build Commands

- **Local development**: `npm run dev`
- **Build for Netlify**: `npm run build:netlify`
- **Preview build**: `npm run preview`

### Troubleshooting

1. **API calls failing**: Make sure backend URL is correct in `api.ts`
2. **Database errors**: Check DATABASE_URL environment variable
3. **CORS errors**: Update CORS configuration in backend to include Netlify domain

## 📁 File Structure

```
applyflow-automator/
├── backend/          # Node.js backend (deploy separately)
├── front/           # React frontend (deploy to Netlify)
├── netlify.toml     # Netlify configuration
└── README-DEPLOY.md # This file
```

## 🔧 Next Steps

1. Deploy backend to Railway/Render/Heroku
2. Update API configuration with backend URL
3. Connect repository to Netlify
4. Deploy frontend to applyflow-automator.netlify.app