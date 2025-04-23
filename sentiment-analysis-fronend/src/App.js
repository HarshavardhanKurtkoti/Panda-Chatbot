import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Replace the avatar icon with a user icon SVG for login/signup
const UserIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" fill="#22c55e"/>
    <rect x="4" y="16" width="16" height="6" rx="3" fill="#22c55e"/>
  </svg>
);

// Helper to generate a random avatar emoji
const getRandomAvatar = () => {
  const avatars = ['🐼', '🦊', '🐧', '🐨', '🦁', '🐸', '🐵', '🐻', '🐯', '🦄', '🐶', '🐱', '🐰', '🦉', '🐢', '🐙', '🦋', '🐝', '🐳', '🐬'];
  return avatars[Math.floor(Math.random() * avatars.length)];
};

function App() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null); // { name, email, token }
  const [loginForm, setLoginForm] = useState({ name: '', email: '', password: '' });
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const chatWindowRef = useRef(null);

  const [sessions, setSessions] = useState([
    { id: 1, title: 'Welcome Chat', created: new Date(), messages: [] }
  ]);
  const [activeSession, setActiveSession] = useState(1);

  const [showDeleteDialog, setShowDeleteDialog] = useState({ open: false, sessionId: null });

  // const chats = [
  //   { title: 'Plan a 3-day trip', desc: 'A 3-day trip to see the northern lights in Norway...' },
  //   { title: 'Ideas for a customer loyalty program', desc: 'Here are seven ideas for a customer loyalty...' },
  //   { title: 'Help me pick', desc: 'Here are some gift ideas for your fishing-loving...' },
  // ];

  const [showProfile, setShowProfile] = useState(false);
  const [avatar, setAvatar] = useState(getRandomAvatar());

  const [showServerCold, setShowServerCold] = useState(false);
  const [showLoadingAnim, setShowLoadingAnim] = useState(false);

  // Loading animation component
  const LoadingSpinner = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{
        border: '6px solid #23263a',
        borderTop: '6px solid #22c55e',
        borderRadius: '50%',
        width: 56,
        height: 56,
        animation: 'spin 1s linear infinite',
        marginBottom: 18
      }} />
      <style>{`@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`}</style>
      <div style={{ color: '#22c55e', fontWeight: 600, fontSize: 18 }}>Waking up Panda server...</div>
      <div style={{ color: '#b0b3c6', fontSize: 14, marginTop: 6 }}>This may take 20-40 seconds on free tier.</div>
    </div>
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');
    const email = localStorage.getItem('email');
    if (token && name && email) {
      setUser({ name, email, token });
    } else {
      setShowAuthModal(true);
    }
  }, []);

  useEffect(() => {
    if (!user) setShowAuthModal(true);
    else setShowAuthModal(false);
  }, [user]);

  useEffect(() => {
    if (chatWindowRef.current) {
      chatWindowRef.current.scrollTo({
        top: chatWindowRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chat]);

  useEffect(() => {
    if (user) setAvatar(getRandomAvatar());
  }, [user]);

  // Ensure at least one session always exists
  useEffect(() => {
    if (sessions.length === 0) {
      const defaultSession = {
        id: 1,
        title: 'Default Analysis',
        created: new Date(),
        messages: []
      };
      setSessions([defaultSession]);
      setActiveSession(1);
      setChat([]);
    }
  }, [sessions]);

  // Fetch user chats from backend on login
  useEffect(() => {
    const fetchChats = async () => {
      if (user && user.token) {
        try {
          const res = await fetch('https://panda-chatbot.onrender.com/chats', {
            headers: { Authorization: user.token },
          });
          const data = await res.json();
          let chats = [];
          if (res.ok && data.chats) {
            chats = data.chats.map(chat => {
              let createdDate;
              try {
                createdDate = new Date(chat.created);
                if (isNaN(createdDate.getTime()) || createdDate.getFullYear() === 1970) {
                  createdDate = new Date();
                }
              } catch {
                createdDate = new Date();
              }
              return {
                ...chat,
                created: createdDate,
              };
            });
          }
          // If no chats, create a default session
          if (!chats.length) {
            chats = [{
              id: Date.now(),
              title: 'Default Analysis',
              created: new Date(),
              messages: []
            }];
          }
          setSessions(chats);
          setActiveSession(chats[0].id);
          setChat(chats[0].messages);
        } catch (err) {
          // Optionally handle error
        }
      }
    };
    fetchChats();
  }, [user]);

  // Save chat to backend whenever sessions change (except on initial load)
  useEffect(() => {
    if (!user || !user.token) return;
    sessions.forEach(session => {
      fetch('https://panda-chatbot.onrender.com/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token,
        },
        body: JSON.stringify({
          ...session,
          created: session.created instanceof Date ? session.created.toISOString() : session.created,
        }),
      });
    });
  }, [sessions, user]);

  // Helper to get current time as HH:MM
  const getTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setShowServerCold(true);
    setShowLoadingAnim(true);
    let coldTimeout = setTimeout(() => setShowServerCold(true), 2000);
    try {
      const res = await fetch('https://panda-chatbot.onrender.com/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loginForm.name,
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      clearTimeout(coldTimeout);
      setShowServerCold(false);
      setShowLoadingAnim(false);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setAuthMode('login');
      setLoginForm({ name: '', email: '', password: '' });
      setAuthError('Registration successful! Please log in.');
    } catch (err) {
      setShowServerCold(false);
      setShowLoadingAnim(false);
      setAuthError(err.message);
    }
  };

  const handleLoginChange = (e) => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setShowServerCold(true);
    setShowLoadingAnim(true);
    let coldTimeout = setTimeout(() => setShowServerCold(true), 2000);
    try {
      const res = await fetch('https://panda-chatbot.onrender.com/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      clearTimeout(coldTimeout);
      setShowServerCold(false);
      setShowLoadingAnim(false);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setUser({ name: data.name, email: data.email, token: data.token });
      localStorage.setItem('token', data.token);
      localStorage.setItem('name', data.name);
      localStorage.setItem('email', data.email);
      setLoginForm({ name: '', email: '', password: '' });
      setAuthError('');
    } catch (err) {
      setShowServerCold(false);
      setShowLoadingAnim(false);
      setAuthError(err.message);
    }
  };

  const handleLogout = async () => {
    if (user && user.token) {
      await fetch('https://panda-chatbot.onrender.com/logout', {
        method: 'POST',
        headers: { Authorization: user.token },
      });
    }
    setUser(null);
    setLoginForm({ name: '', email: '', password: '' });
    setChat([]);
    setSessions([{ id: 1, title: 'Welcome Chat', created: new Date(), messages: [] }]); // Clear all sessions
    setActiveSession(1);
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
  };

  // When creating a new session, clear chat window
  const handleNewSession = () => {
    const newId = Date.now();
    const newSession = {
      id: newId,
      title: 'New Analysis',
      created: new Date(),
      messages: []
    };
    setSessions([newSession, ...sessions]);
    setActiveSession(newId);
    setChat([]);
  };

  // When sending a message, update the active session's messages and set the session title if it's the first message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || !user) return;
    setLoading(true);
    const userMsg = { sender: 'user', text: message, time: getTime() };
    setChat([...chat, userMsg]);
    setSessions(sessions => sessions.map(s => {
      if (s.id === activeSession) {
        // If this is the first message, set the session title to the message (truncate if long)
        const isFirst = s.messages.length === 0;
        return {
          ...s,
          title: isFirst ? (message.length > 30 ? message.slice(0, 30) + '...' : message) : s.title,
          messages: [...s.messages, userMsg]
        };
      }
      return s;
    }));
    try {
      const res = await fetch('https://panda-chatbot.onrender.com/analyze-sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat failed');
      const botMsg = { sender: 'bot', text: `Sentiment: ${data.sentiment} (Confidence: ${data.confidence.toFixed(2)})`, time: getTime() };
      setChat(prev => [...prev, botMsg]);
      setSessions(sessions => sessions.map(s =>
        s.id === activeSession ? { ...s, messages: [...s.messages, botMsg] } : s
      ));
    } catch (err) {
      const botMsg = { sender: 'bot', text: 'Error connecting to server.', time: getTime() };
      setChat(prev => [...prev, botMsg]);
      setSessions(sessions => sessions.map(s =>
        s.id === activeSession ? { ...s, messages: [...s.messages, botMsg] } : s
      ));
    }
    setMessage('');
    setLoading(false);
  };

  // When switching sessions, update chat window to show that session's messages
  const handleSelectSession = (id) => {
    setActiveSession(id);
    const found = sessions.find(s => s.id === id);
    setChat(found ? found.messages : []);
  };

  // Delete a session (only if more than one session exists)
  const handleDeleteSession = (id) => {
    if (sessions.length <= 1) return; // Prevent deleting the last session
    setSessions(sessions => sessions.filter(s => s.id !== id));
    // Remove from backend
    if (user && user.token) {
      fetch('https://panda-chatbot.onrender.com/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user.token,
        },
        body: JSON.stringify({ id }),
      });
    }
    // If the deleted session is active, switch to the first available session
    if (activeSession === id) {
      const next = sessions.find(s => s.id !== id);
      setActiveSession(next ? next.id : null);
      setChat(next ? next.messages : []);
    }
    setShowDeleteDialog({ open: false, sessionId: null });
  };

  // Track if the user has started a conversation in the current session
  const hasStarted = user && chat.length > 0;

  return (
    <div className="gpt-app-bg">
      <div className="gpt-app-container">
        {/* Sidebar */}
        <aside className="gpt-sidebar">
          <div className="gpt-sidebar-header">
            <span
              className="gpt-logo"
              style={{ fontSize: 32 }}
            >
              🐼
            </span>
            <span className="gpt-sidebar-title">Sentiment Analyses</span>
            <button
              className="gpt-sidebar-settings"
              title="Account/Settings"
              onClick={() => user ? setShowProfile(true) : setShowAuthModal(true)}
              style={{ background: 'none', border: 'none', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              {user ? (
                <span style={{ fontSize: 32 }}>{avatar}</span>
              ) : (
                <UserIcon />
              )}
            </button>
          </div>
          <button className="gpt-new-chat-btn" onClick={handleNewSession}>New Analysis +</button>
          <div className="gpt-sidebar-section">My Analyses</div>
          <ul className="gpt-sidebar-chats">
            {sessions.map((s) => (
              <li
                key={s.id}
                className={`gpt-sidebar-chat${activeSession === s.id ? ' gpt-sidebar-chat-active' : ''}`}
                onClick={() => handleSelectSession(s.id)}
                style={{ position: 'relative' }}
              >
                <div className="gpt-chat-title">{s.title}</div>
                <div className="gpt-chat-desc">{s.created.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                {sessions.length > 1 && (
                  <button
                    className="chat-three-dot"
                    onClick={e => { e.stopPropagation(); setShowDeleteDialog({ open: true, sessionId: s.id }); }}
                    title="More options"
                    style={{ position: 'absolute', right: 8, top: 12, background: 'none', border: 'none', color: '#b0b3c6', fontSize: 20, cursor: 'pointer', padding: 0 }}
                  >
                    &#8942;
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>
        {/* Main panel */}
        <main className="gpt-main-panel">
          <div className="gpt-main-header">
            <span className="gpt-main-back">&lt;</span>
            <span className="gpt-main-title">Sentiment Analysis Chat</span>
            <span className="gpt-main-model">Panda AI</span>
          </div>
          {hasStarted ? (
            <div className="whatsapp-chat-log">
              <div ref={chatWindowRef} className="whatsapp-chat-window">
                {chat.map((msg, idx) => (
                  <div
                    key={idx}
                    className={
                      msg.sender === 'user'
                        ? 'whatsapp-msg whatsapp-msg-user'
                        : 'whatsapp-msg whatsapp-msg-bot'
                    }
                  >
                    <div className="whatsapp-msg-bubble">
                      {msg.text}
                      <div className="whatsapp-msg-timestamp">{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form className="gpt-prompt-form" onSubmit={handleSend}>
                <input
                  className="gpt-prompt-input"
                  placeholder={user ? "Type your message..." : "Login to start chatting..."}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={!user || loading}
                />
                <button className="gpt-prompt-send" type="submit" disabled={!user || loading || !message.trim()}>
                  →
                </button>
              </form>
            </div>
          ) : (
            <div className="gpt-welcome-panel">
              <div className="gpt-welcome-logo">🐼</div>
              <h2>Welcome to Panda Sentiment Chat!</h2>
              <div className="gpt-welcome-desc">
                Analyze the sentiment of your messages instantly. Register or log in to start chatting with Panda and get real-time feedback on your text's mood.
              </div>
              <div className="gpt-feature-cards">
                <div className="gpt-feature-card">Real-time Sentiment Analysis</div>
                <div className="gpt-feature-card">User Authentication</div>
                <div className="gpt-feature-card">Secure MongoDB Storage</div>
              </div>
              <div className="gpt-prompt-tabs">
                <span className="gpt-prompt-tab gpt-prompt-tab-active">All</span>
                <span className="gpt-prompt-tab">Positive</span>
                <span className="gpt-prompt-tab">Negative</span>
                <span className="gpt-prompt-tab">Neutral</span>
              </div>
              <form className="gpt-prompt-form" onSubmit={handleSend}>
                <input
                  className="gpt-prompt-input"
                  placeholder={user ? "Type your message for sentiment analysis..." : "Login to start chatting..."}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  disabled={!user || loading}
                />
                <button className="gpt-prompt-send" type="submit" disabled={!user || loading || !message.trim()}>
                  →
                </button>
              </form>
              <div ref={chatWindowRef} style={{width: '100%', maxHeight: 320, minHeight: 120, overflowY: 'auto', marginTop: 24, background: 'rgba(24,26,27,0.92)', borderRadius: 12, padding: 12}}>
                {user && chat.length > 0 && chat.map((msg, idx) => (
                  <div key={idx} className={msg.sender === 'user' ? 'user-msg' : 'bot-msg'} style={{marginBottom: 8}}>
                    <div className="msg-avatar">
                      {msg.sender === 'user' ? (user ? user.name[0]?.toUpperCase() : 'U') : '🐼'}
                    </div>
                    <div className="msg-bubble">
                      <b>{msg.sender === 'user' ? (user ? user.name : 'You') : 'Panda'}:</b> {msg.text}
                      <div className="msg-timestamp">{msg.time}</div>
                    </div>
                  </div>
                ))}
                {!user && !showAuthModal && (
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                    <button
                      style={{
                        background: '#232b3a',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: 22,
                        border: 'none',
                        borderRadius: 16,
                        padding: '24px 0',
                        width: '100%',
                        maxWidth: 520,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px #0002'
                      }}
                      onClick={() => setShowAuthModal(true)}
                    >
                      Sign in or Sign up to chat
                    </button>
                  </div>
                )}
                {user && !hasStarted && (
                  <div style={{ width: '100%', textAlign: 'center', fontWeight: 700, fontSize: 22, color: '#22c55e', marginTop: 24, letterSpacing: 0.5 }}>
                    Start your positive journey! 🚀
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      {/* Auth Modal for Login/Signup */}
      {showAuthModal && (
        <div className="modal-overlay">
          <div className="auth-modal">
            <button
              className="modal-close-x"
              aria-label="Close"
              onClick={() => setShowAuthModal(false)}
            >
              ×
            </button>
            {showLoadingAnim && <LoadingSpinner />}
            {!showLoadingAnim && (
              <form className="login-form" onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                <h2>{authMode === 'login' ? 'Login' : 'Register'}</h2>
                {authMode === 'register' && (
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={loginForm.name || ''}
                    onChange={handleLoginChange}
                    required
                  />
                )}
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={loginForm.email || ''}
                  onChange={handleLoginChange}
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={loginForm.password || ''}
                  onChange={handleLoginChange}
                  required
                />
                {authError && (
                  <div style={{ color: authError.includes('successful') ? 'limegreen' : 'red', marginBottom: 8 }}>{authError}</div>
                )}
                <button type="submit">{authMode === 'login' ? 'Login' : 'Register'}</button>
                <div style={{ marginTop: 12 }}>
                  {authMode === 'login' ? (
                    <span>Don't have an account?{' '}
                      <button type="button" className="modal-link" onClick={() => { setAuthMode('register'); setAuthError(''); }}>Register</button>
                    </span>
                  ) : (
                    <span>Already have an account?{' '}
                      <button type="button" className="modal-link" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Login</button>
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="auth-modal">
            <button
              className="modal-close-x"
              aria-label="Close"
              onClick={() => setShowLogoutModal(false)}
            >
              ×
            </button>
            <div style={{ textAlign: 'center' }}>
              <h2>Confirm Logout</h2>
              <p>Are you sure you want to logout?</p>
              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <button
                  className="logout-btn-theme"
                  style={{ width: '100%', fontWeight: 600 }}
                  onClick={() => { handleLogout(); setShowLogoutModal(false); }}
                >
                  Logout
                </button>
                <button
                  className="logout-btn-theme"
                  style={{ width: '100%', fontWeight: 600 }}
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteDialog.open && (
        <div className="modal-overlay">
          <div className="auth-modal" style={{ minWidth: 260, minHeight: 120, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', marginBottom: 18 }}>Delete Analysis?</h2>
            <p style={{ marginBottom: 18 }}>Are you sure you want to delete this chat log?</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                className="logout-btn-theme"
                style={{ width: 100, fontWeight: 600 }}
                onClick={() => handleDeleteSession(showDeleteDialog.sessionId)}
                disabled={sessions.length <= 1}
              >
                Delete
              </button>
              <button
                className="logout-btn-theme"
                style={{ width: 100, fontWeight: 600 }}
                onClick={() => setShowDeleteDialog({ open: false, sessionId: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showProfile && user && (
        <div className="modal-overlay">
          <div className="auth-modal" style={{ minWidth: 280, minHeight: 180, textAlign: 'center', padding: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{avatar}</div>
            <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 4 }}>{user.name}</div>
            <div style={{ color: '#b0b3c6', fontSize: 15, marginBottom: 18 }}>{user.email}</div>
            <button
              style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', width: '100%', fontWeight: 600, fontSize: 16, marginTop: 8, cursor: 'pointer', boxShadow: '0 2px 8px #ef444422' }}
              onClick={() => { handleLogout(); setShowProfile(false); }}
            >
              Logout
            </button>
            <button
              className="modal-close-x"
              aria-label="Close"
              onClick={() => setShowProfile(false)}
              style={{ position: 'absolute', top: 16, right: 20 }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
