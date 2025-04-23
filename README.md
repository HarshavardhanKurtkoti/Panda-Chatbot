# Panda Sentiment Chat

A modern, full-stack sentiment analysis chat application with user authentication, persistent chat history, and a beautiful UI inspired by ChatGPT and WhatsApp.

## Features

- **Real-time Sentiment Analysis**: Instantly analyze the sentiment of your messages using NLP (TextBlob).
- **User Authentication**: Register and log in securely. Each user's chats are private and persistent.
- **Persistent Chat History**: All chat sessions are saved to MongoDB and available on any device after login.
- **Multi-Session Support**: Start, switch, and delete multiple chat analyses. Each session is saved per user.
- **Modern UI/UX**: Responsive, dark-themed interface with a sidebar, chat log, and profile management.
- **Profile & Logout**: View your profile and securely log out. All chat data is cleared on logout.

## Tech Stack

- **Frontend**: React (Create React App), CSS
- **Backend**: Flask, Flask-CORS, PyMongo, JWT, TextBlob
- **Database**: MongoDB Atlas

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.10+
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repository
```bash
# In your desired directory
$ git clone <your-repo-url>
$ cd Sentiment-Analysis
```

### 2. Backend Setup
```bash
$ cd sentiment-analysis-backend
$ pip install flask flask-cors pymongo werkzeug pyjwt textblob
# Set your MongoDB URI in main.py (already set for demo)
$ python main.py
```

### 3. Frontend Setup
```bash
$ cd sentiment-analysis-fronend
$ npm install
$ npm start
```

- Frontend: http://localhost:3000
- Backend: http://127.0.0.1:5000

## Usage
1. Register or log in with your email and password.
2. Start a new analysis or continue previous ones from the sidebar.
3. Type messages to get instant sentiment feedback.
4. Manage your chat sessions (create, switch, delete).
5. Log out to clear your data from the device.

## Folder Structure
```
sentiment-analysis-backend/   # Flask backend (main.py)
sentiment-analysis-fronend/   # React frontend (App.js, App.css, etc.)
```

## Customization
- Change the MongoDB URI in `main.py` for your own database.
- Tweak the UI in `App.css` and `App.js` for your branding.

## License
MIT

---

**Made with ❤️ for positive conversations!**
