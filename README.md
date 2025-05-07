# Panda Sentiment Chat

A modern, full-stack sentiment analysis chat application with user authentication, persistent chat history, real-time admin controls, and a beautiful UI inspired by ChatGPT and WhatsApp.

## Features
- Real-time Sentiment Analysis
- User Authentication (JWT)
- Persistent Chat History (MongoDB)
- Multi-Session Support
- Modern UI/UX (React + Tailwind)
- Admin Panel (user/chat management, stats)
- Real-time updates (WebSocket)

## Tech Stack
- **Frontend:** React (Create React App), Tailwind CSS
- **Backend:** Flask, Flask-CORS, PyMongo, JWT, TextBlob
- **Database:** MongoDB Atlas
- **Deployment:** Docker, Render (backend), Vercel (frontend)

## Project Structure
```
Sentiment-Analysis/
├── Dockerfile
├── README.md
├── sentiment-analysis-backend/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
└── sentiment-analysis-fronend/
    ├── package.json
    ├── postcss.config.js
    ├── tailwind.config.js
    ├── public/
    │   ├── favicon.ico
    │   ├── index.html
    │   └── ...
    └── src/
        ├── App.js
        ├── AdminPanel.js
        ├── index.js
        └── ...
```

## Environment Setup

### Backend (.env)
Copy `sentiment-analysis-backend/.env.example` to `.env` and fill in:
```
SECRET_KEY=your-very-secret-key
MONGODB_URI=your-mongodb-uri
ADMIN_CODE=letmeinadmin
FRONTEND_URL=https://your-production-frontend.com,http://localhost:3000
```
- `FRONTEND_URL` can be a comma-separated list of allowed frontend origins (e.g., your Vercel domain).

### Frontend (.env)
Create `sentiment-analysis-fronend/.env` and set:
```
REACT_APP_BACKEND_URL=https://your-production-backend.com
REACT_APP_BACKEND_URL_LOCAL=http://localhost:5000
```
- Set `REACT_APP_BACKEND_URL` to your Render backend URL in Vercel project settings for production.

## Production Build & Deployment

### 1. Build Frontend
```
cd sentiment-analysis-fronend
npm install
npm run build
```
- Deploy the `build/` folder to your static hosting (Vercel, Netlify, nginx, etc.)

### 2. Build & Run Backend (Docker or Render)
```
docker build -t panda-sentiment-backend .
docker run -d -p 5000:5000 --env-file sentiment-analysis-backend/.env panda-sentiment-backend
```
- Or deploy to Render and set environment variables in the Render dashboard.

### 3. Environment Variables
- Set all secrets and URIs via environment variables in production.
- Never commit real secrets to git.

### 4. Security & Best Practices
- Use HTTPS for both frontend and backend.
- Use a strong, unique SECRET_KEY.
- Restrict CORS to your frontend domain(s).
- Validate all user input on backend.
- Monitor logs and errors in production.

## Usage
1. Register or log in with your email and password.
2. Start a new analysis or continue previous ones from the sidebar.
3. Use the admin panel for user/chat management (if admin).
4. Log out to clear your data from the device.

## Troubleshooting
- **CORS Issues:** Ensure `FRONTEND_URL` in backend `.env` matches your deployed frontend URL(s) exactly (no trailing slash, no wildcards).
- **Environment Variables:** After changing environment variables, always redeploy/restart your backend.
- **Preview Deployments:** For Vercel preview URLs, add each preview domain to `FRONTEND_URL` if needed.
- **MongoDB Connection:** Make sure your MongoDB URI is correct and accessible from your backend host.

## License
MIT

---

