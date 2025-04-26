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
- **Frontend:** React (Create React App), Tailwind CSS, socket.io-client
- **Backend:** Flask, Flask-SocketIO, Flask-CORS, PyMongo, JWT, TextBlob
- **Database:** MongoDB Atlas
- **Deployment:** Docker

## Environment Setup

### Backend (.env)
Copy `sentiment-analysis-backend/.env.example` to `.env` and fill in:
```
SECRET_KEY=your-very-secret-key
MONGODB_URI=your-mongodb-uri
ADMIN_CODE=letmeinadmin
FRONTEND_URL=https://your-production-frontend.com
```

### Frontend (.env)
Create `sentiment-analysis-fronend/.env` and set:
```
REACT_APP_BACKEND_URL=https://your-production-backend.com
```

## Production Build & Deployment

### 1. Build Frontend
```
cd sentiment-analysis-fronend
npm install
npm run build
```
- Deploy the `build/` folder to your static hosting (Vercel, Netlify, nginx, etc.)

### 2. Build & Run Backend (Docker)
```
docker build -t panda-sentiment-backend .
docker run -d -p 5000:5000 --env-file sentiment-analysis-backend/.env panda-sentiment-backend
```
- Or use your preferred Python hosting (Render, Heroku, etc.)

### 3. Environment Variables
- Set all secrets and URIs via environment variables in production.
- Never commit real secrets to git.

### 4. Security & Best Practices
- Use HTTPS for both frontend and backend.
- Use a strong, unique SECRET_KEY.
- Restrict CORS to your frontend domain.
- Validate all user input on backend.
- Monitor logs and errors in production.

## Usage
1. Register or log in with your email and password.
2. Start a new analysis or continue previous ones from the sidebar.
3. Use the admin panel for user/chat management (if admin).
4. Log out to clear your data from the device.

## License
MIT

---

**Made with ❤️ for positive conversations!**
