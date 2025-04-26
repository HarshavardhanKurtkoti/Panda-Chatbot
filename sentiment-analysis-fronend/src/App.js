import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import AdminPanel from './AdminPanel'; // Import the new AdminPanel component

// Backend base URL (switches between env and localhost)
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:5000";

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

  // Use a unique initial session and keep activeSession in sync
  const createInitialSession = () => ({
    id: Date.now(),
    title: 'Welcome Chat',
    created: new Date(),
    messages: []
  });
  const [sessions, setSessions] = useState([createInitialSession()]);
  const [activeSession, setActiveSession] = useState(sessions[0].id);

  const [showDeleteDialog, setShowDeleteDialog] = useState({ open: false, sessionId: null });

  const [showProfile, setShowProfile] = useState(false);
  const [avatar, setAvatar] = useState(getRandomAvatar());

  const [showLoadingAnim, setShowLoadingAnim] = useState(false);

  // Sidebar collapsed by default on mobile
  const getInitialSidebarCollapsed = () => window.innerWidth <= 900;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(getInitialSidebarCollapsed());

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
    // Always check for string 'true'
    const is_admin = localStorage.getItem('is_admin') === 'true';
    if (token && name && email) {
      setUser({ name, email, token, is_admin });
    } else {
      setShowAuthModal(true);
    }
  }, []);

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
      const defaultSession = createInitialSession();
      setSessions([defaultSession]);
      setActiveSession(defaultSession.id);
      setChat([]);
    }
  }, [sessions]);

  // Fetch user chats from backend on login
  useEffect(() => {
    const fetchChats = async () => {
      if (user && user.token) {
        try {
          const res = await fetch(`${BACKEND_URL}/chats`, {
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
          // Only create a Welcome Chat if there are no sessions at all (not even a Welcome Chat)
          if (!chats.length) {
            chats = [createInitialSession()];
          } else {
            // Prevent duplicate Welcome Chat: filter out extra Welcome Chats, keep only the first one
            const welcomeChats = chats.filter(c => c.title === 'Welcome Chat');
            if (welcomeChats.length > 1) {
              // Keep only the first Welcome Chat, remove the rest
              const firstWelcome = welcomeChats[0];
              chats = [firstWelcome, ...chats.filter(c => c.title !== 'Welcome Chat')];
            }
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

  // Real-time polling for sidebar sessions
  useEffect(() => {
    if (!user || !user.token) return;
    const fetchChats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/chats`, {
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
        // Only create a Welcome Chat if there are no sessions at all (not even a Welcome Chat)
        if (!chats.length) {
          chats = [createInitialSession()];
        } else {
          // Prevent duplicate Welcome Chat: filter out extra Welcome Chats, keep only the first one
          const welcomeChats = chats.filter(c => c.title === 'Welcome Chat');
          if (welcomeChats.length > 1) {
            // Keep only the first Welcome Chat, remove the rest
            const firstWelcome = welcomeChats[0];
            chats = [firstWelcome, ...chats.filter(c => c.title !== 'Welcome Chat')];
          }
        }
        setSessions(chats);
        setActiveSession(chats[0].id);
        setChat(chats[0].messages);
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchChats();
    // WebSocket real-time updates
    const socket = io(BACKEND_URL);
    socket.on('chats_updated', (data) => {
      // If data.user_email is set, only update if it matches current user
      if (!data.user_email || data.user_email === user.email) {
        fetchChats();
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Save chat to backend whenever sessions change (except on initial load)
  useEffect(() => {
    if (!user || !user.token) return;
    sessions.forEach(session => {
      fetch(`${BACKEND_URL}/chats`, {
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
    setShowLoadingAnim(true);
    try {
      const res = await fetch(`${BACKEND_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: loginForm.name,
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      setShowLoadingAnim(false);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setAuthMode('login');
      setLoginForm({ name: '', email: '', password: '' });
      setAuthError('Registration successful! Please log in.');
    } catch (err) {
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
    setShowLoadingAnim(true);
    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,
          password: loginForm.password,
        }),
      });
      setShowLoadingAnim(false);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setUser({ name: data.name, email: data.email, token: data.token, is_admin: !!data.is_admin });
      localStorage.setItem('token', data.token);
      localStorage.setItem('name', data.name);
      localStorage.setItem('email', data.email);
      localStorage.setItem('is_admin', data.is_admin ? 'true' : 'false'); // always store as string
      setLoginForm({ name: '', email: '', password: '' });
      setAuthError('');
      setShowAuthModal(false); // Close the login/signup popup after successful login
    } catch (err) {
      setShowLoadingAnim(false);
      setAuthError(err.message);
    }
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
      const res = await fetch(`${BACKEND_URL}/analyze-sentiment`, {
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
  const handleDeleteSession = async (id) => {
    if (sessions.length <= 1) return;
    setShowDeleteDialog({ open: false, sessionId: null });
    if (user && user.token) {
      try {
        await fetch(`${BACKEND_URL}/chats/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: user.token,
          },
        });
        const res = await fetch(`${BACKEND_URL}/chats`, {
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
        if (!chats.length) {
          const defaultSession = createInitialSession();
          chats = [defaultSession];
          setActiveSession(defaultSession.id);
          setChat([]);
        } else {
          setActiveSession(chats[0].id);
          setChat(chats[0].messages);
        }
        setSessions(chats);
      } catch (err) {
        // Optionally handle error
      }
    }
  };

  // Track if the user has started a conversation in the current session
  const hasStarted = user && chat.length > 0;

  useEffect(() => {
    if (!sidebarCollapsed && window.innerWidth <= 900) {
      const handleClick = (e) => {
        const sidebar = document.querySelector('.gpt-sidebar');
        if (sidebar && !sidebar.contains(e.target)) {
          setSidebarCollapsed(true);
        }
      };
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('touchstart', handleClick);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('touchstart', handleClick);
      };
    }
  }, [sidebarCollapsed]);

  const [showDefaultHome, setShowDefaultHome] = useState(true); // Show default home page on first load
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add the missing handleLogout function at the top of App()
  const handleLogout = async () => {
    if (user && user.token) {
      await fetch(`${BACKEND_URL}/logout`, {
        method: 'POST',
        headers: { Authorization: user.token },
      });
    }
    setUser(null);
    setLoginForm({ name: '', email: '', password: '' });
    setChat([]);
    const defaultSession = createInitialSession();
    setSessions([defaultSession]);
    setActiveSession(defaultSession.id);
    localStorage.removeItem('token');
    localStorage.removeItem('name');
    localStorage.removeItem('email');
  };

  const [showAdminPanel, setShowAdminPanel] = useState(false); // State to control Admin Panel visibility
  const [isAdmin, setIsAdmin] = useState(false); // Track if the user is an admin

  useEffect(() => {
    if (user) {
      setIsAdmin(user.is_admin || false); // Set admin status from user state
    }
  }, [user]);

  // Function to close home tab and open admin panel
  const openAdminPanelDirect = () => {
    setShowDefaultHome(false);
    setShowAdminPanel(true);
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-[#181c2b] via-[#23263a] to-[#0a0f0c] fixed top-0 left-0 right-0 bottom-0 z-0 font-sans">
      <div className="h-screen w-screen relative z-10" style={{ padding: 0 }}>
        {/* Sidebar */}
        <aside
          className={
            [
              'bg-[#20232a] flex flex-col border-r border-[#23263a] shadow-2xl text-white',
              isMobile ? 'rounded-2xl' : 'rounded-tr-3xl rounded-br-3xl',
              'transition-transform duration-700 ease-[cubic-bezier(.4,2,.6,1)]',
              sidebarCollapsed ? '-translate-x-[120vw] pointer-events-none' : 'translate-x-0 pointer-events-auto',
              isMobile ? 'fixed left-0 top-0' : 'fixed left-0 top-0',
              'z-[1002]'
            ].join(' ')
          }
          style={{
            width: isMobile ? 'calc(100vw - 40px)' : (sidebarCollapsed ? 70 : 360),
            minWidth: isMobile ? 'calc(100vw - 40px)' : (sidebarCollapsed ? 70 : 360),
            maxWidth: isMobile ? 'calc(100vw - 40px)' : (sidebarCollapsed ? 70 : 380),
            height: isMobile ? 'calc(100vh - 40px)' : '100vh',
            margin: isMobile ? 20 : 0,
            position: 'fixed',
            boxSizing: 'border-box',
            borderRadius: isMobile ? 16 : undefined // 16px = rounded-2xl
          }}
        >
          <div className={`w-full flex items-center gap-3 font-semibold pb-4 px-6 pt-8 ${isMobile ? 'pr-16' : ''} text-white relative`}>
            {!sidebarCollapsed && (
              <button
                className="bg-gradient-to-tr from-green-400 to-blue-500 rounded-full w-10 h-10 flex items-center justify-center text-2xl shadow-lg border-4 border-[#23263a] mr-2 hover:scale-105 transition-transform"
                title="Account/Settings"
                onClick={() => user ? setShowLogoutModal(true) : setShowAuthModal(true)}
              >
                {user ? (
                  <span>{avatar}</span>
                ) : (
                  <UserIcon />
                )}
              </button>
            )}
            <span className="text-2xl mr-2">🐼</span>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg whitespace-nowrap truncate flex-1">Sentiment Analysis Chat</span>
            )}
            {/* Sidebar close button for all screen sizes, now inline */}
            {!sidebarCollapsed && (
              <button
                className="ml-2 bg-red-500 text-white rounded-xl text-2xl font-bold shadow-lg w-10 h-10 flex items-center justify-center transition-transform duration-200 hover:bg-red-600 hover:scale-110 z-[1100] border-none"
                aria-label="Close sidebar"
                onClick={() => setSidebarCollapsed(true)}
                style={{ minWidth: 40, minHeight: 40 }}
              >
                ×
              </button>
            )}
          </div>
          {!sidebarCollapsed && <button className="w-[85%] mx-auto mb-4 py-2 rounded-xl bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold shadow hover:from-green-500 hover:to-blue-600 transition-colors" onClick={handleNewSession}>New Analysis +</button>}
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between px-7 mb-2 mt-2">
              <div className="text-gray-400 font-semibold text-xs uppercase tracking-widest">My Analyses</div>
              <a
                href="#"
                className="text-xs text-red-400 hover:underline ml-2"
                style={{ fontWeight: 500 }}
                onClick={async e => {
                  e.preventDefault();
                  if (user && user.token) {
                    await fetch(`${BACKEND_URL}/chats`, {
                      method: 'DELETE',
                      headers: { Authorization: user.token },
                    });
                  }
                  setSessions([createInitialSession()]);
                  setActiveSession(Date.now());
                  setChat([]);
                  setShowDefaultHome(true);
                }}
              >
                clear all
              </a>
            </div>
          )}
          {!sidebarCollapsed && (
            <ul className="flex-1 overflow-y-auto px-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={`group relative flex flex-col gap-1 px-5 py-3 mb-2 rounded-xl cursor-pointer transition-colors ${activeSession === s.id ? 'bg-gradient-to-r from-green-500/80 to-blue-500/80 text-white shadow-lg' : 'hover:bg-[#23263a] text-gray-200'}`}
                  onClick={() => handleSelectSession(s.id)}
                >
                  <div className="font-bold text-base truncate flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 group-hover:bg-blue-400 transition-colors"></span>
                    {s.title}
                  </div>
                  <div className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors">{s.created.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  {sessions.length > 1 && (
                    <button
                      className="absolute right-3 top-3 text-gray-400 hover:text-red-400 bg-transparent border-none text-lg font-bold"
                      onClick={e => { e.stopPropagation(); setShowDeleteDialog({ open: true, sessionId: s.id }); }}
                      title="Delete analysis"
                    >
                      &#8942;
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isAdmin && (
            <button
              className="w-[85%] mx-auto mb-4 py-2 rounded-xl bg-gradient-to-r from-red-400 to-red-500 text-white font-bold shadow hover:from-red-500 hover:to-red-600 transition-colors"
              onClick={openAdminPanelDirect}
            >
              Admin Panel
            </button>
          )}
        </aside>

        {/* Main panel */}
        <main className="flex-1 flex flex-col items-center justify-start bg-none relative z-0 transition-all duration-300 px-2 md:px-8 min-h-screen w-screen"
          style={{ padding: isMobile ? 16 : 0, boxSizing: 'border-box' }}
        >
          {showAdminPanel ? (
            <AdminPanel onClose={() => setShowAdminPanel(false)} />
          ) : (
            <>
              {showDefaultHome ? (
                <div className="flex flex-col items-center justify-center h-[70vh] w-full animate-fadeIn mt-12">
                  <div className="relative w-full max-w-xl mx-auto rounded-[2.5rem] p-10 bg-gradient-to-br from-[#23263a]/80 via-[#1e293b]/80 to-[#0a0f0c]/80 backdrop-blur-xl shadow-2xl border border-white/20 flex flex-col items-center transition-all duration-300">
                    <div className="flex w-full justify-center">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-tr from-green-400 to-blue-400 flex items-center justify-center shadow-xl border-4 border-white animate-bounce-slow z-10">
                        <img src="/favicon.ico" alt="Panda Logo" className="w-16 h-16" />
                      </div>
                    </div>
                    <h1 className="text-4xl md:text-5xl mb-3 text-green-400 font-extrabold text-center tracking-tight leading-tight drop-shadow-lg mt-16">Welcome to Panda Sentiment Chat!</h1>
                    <p className="text-lg md:text-xl text-gray-100 max-w-2xl text-center mb-8 font-medium">
                      Instantly analyze the sentiment of your messages. Register or log in to chat with Panda and get real-time feedback on your text's mood.
                    </p>
                    <button
                      className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-2xl px-10 py-3 text-xl font-bold shadow-xl mb-3 hover:scale-105 hover:from-green-600 hover:to-blue-600 transition-all duration-200 animate-pulse"
                      onClick={() => setShowDefaultHome(false)}
                    >
                      Start your positive journey!
                    </button>
                    <div className="mt-6 text-center text-white/80 text-base italic">
                      "Panda AI helps you understand the mood of your words. Try it now!"
                    </div>
                  </div>
                  <style>{`
                    @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
                    .animate-bounce-slow { animation: bounce-slow 2.5s infinite; }
                    /* Custom scrollbar styles for chat area only */
                    .custom-scrollbar::-webkit-scrollbar {
                      width: 10px;
                      background: #23263a;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                      background: linear-gradient(135deg, #22c55e 0%, #3b82f6 100%);
                      border-radius: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                      background: linear-gradient(135deg, #16a34a 0%, #2563eb 100%);
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                      background: #181c2b;
                      border-radius: 8px;
                    }
                    /* Firefox */
                    .custom-scrollbar {
                      scrollbar-width: thin;
                      scrollbar-color: #22c55e #181c2b;
                    }
                  `}</style>
                </div>
              ) : (
                <>
                  {/* Only show the chat and welcome panel logic, no activeTab checks */}
                  {hasStarted ? (
                    <div className="flex flex-col w-full max-w-3xl h-[70vh] bg-gradient-to-br from-[#23263a]/80 via-[#1e293b]/80 to-[#0a0f0c]/80 rounded-[2.5rem] shadow-2xl px-16 py-12 text-white animate-popIn text-center backdrop-blur-xl border border-white/20 transition-all duration-300 overflow-hidden">
                      <div ref={chatWindowRef} className="flex-1 overflow-y-auto space-y-3 pr-2 text-center custom-scrollbar">
                        {chat.map((msg, idx) => (
                          <div
                            key={idx}
                            className={
                              msg.sender === 'user'
                                ? 'flex justify-end'
                                : 'flex justify-start'
                            }
                          >
                            <div className={
                              msg.sender === 'user'
                                ? 'bg-gradient-to-r from-green-500 to-green-400 text-white rounded-2xl px-5 py-3 max-w-xs shadow-md text-right font-bold'
                                : 'bg-[#181c2b] text-white rounded-2xl px-5 py-3 max-w-xs shadow-md text-left font-bold'
                            }>
                              <span className="text-white" style={{wordBreak: 'break-word'}}>{msg.text}</span>
                              <div className="text-xs text-gray-300 mt-1 text-right">{msg.time}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form className="flex items-center mt-4 gap-2" onSubmit={handleSend}>
                        <input
                          className="flex-1 rounded-lg px-4 py-2 bg-[#23263a]/80 text-white border border-[#2e3250] focus:border-blue-400 focus:ring-2 focus:ring-blue-400 outline-none transition text-center"
                          placeholder={user ? "Type your message..." : "Login to start chatting..."}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          disabled={!user || loading}
                        />
                        <button className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg px-5 py-2 font-bold text-lg shadow hover:scale-105 hover:from-green-600 hover:to-blue-600 transition-all duration-200 text-center" type="submit" disabled={!user || loading || !message.trim()}>
                          →
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center mx-auto mt-4 bg-gradient-to-br from-[#23263a]/80 via-[#1e293b]/80 to-[#0a0f0c]/80 rounded-[2.5rem] shadow-2xl px-16 py-12 min-w-[320px] max-w-3xl w-[90vw] min-h-[220px] max-h-[600px] text-white animate-popIn text-center backdrop-blur-xl border border-white/20 transition-all duration-300">
                      <div className="flex w-full justify-center">
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-gradient-to-tr from-green-400 to-blue-400 flex items-center justify-center shadow-xl border-4 border-white animate-bounce-slow z-10">
                          <img src="/favicon.ico" alt="Panda Logo" className="w-16 h-16" />
                        </div>
                      </div>
                      <h2 className="text-3xl font-bold mb-2 text-center text-green-400 mt-16">Welcome to Panda Sentiment Chat!</h2>
                      <div className="text-gray-100 text-lg mb-4 text-center font-medium">
                        Analyze the sentiment of your messages instantly. Register or log in to start chatting with Panda and get real-time feedback on your text's mood.
                      </div>
                      <form className="flex items-center w-full bg-[#23272a]/80 rounded-xl shadow px-4 py-2 mb-4 mt-2" onSubmit={handleSend}>
                        <input
                          className="flex-1 bg-transparent text-white text-base px-2 py-2 outline-none text-center"
                          placeholder={user ? "Type your message for sentiment analysis..." : "Login to start chatting..."}
                          value={message}
                          onChange={e => setMessage(e.target.value)}
                          disabled={!user || loading}
                        />
                        <button className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg px-4 py-2 font-bold text-lg shadow hover:scale-105 hover:from-green-600 hover:to-blue-600 transition-all duration-200 ml-2" type="submit" disabled={!user || loading || !message.trim()}>
                          →
                        </button>
                      </form>
                      <div ref={chatWindowRef} className="w-full max-h-80 min-h-28 overflow-y-auto mt-2 bg-transparent rounded-xl p-3 text-center custom-scrollbar">
                        {user && chat.length > 0 && chat.map((msg, idx) => (
                          <div key={idx} className={`flex items-end mb-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex items-center ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-xl text-white font-bold mr-2 ml-2">
                                {msg.sender === 'user' ? (user ? user.name[0]?.toUpperCase() : 'U') : '🐼'}
                              </div>
                              <div className={`rounded-2xl px-4 py-2 max-w-xs shadow-md ${msg.sender === 'user' ? 'bg-gradient-to-r from-blue-500 to-blue-400 text-white' : 'bg-[#23263a] text-green-400'} text-center`}> 
                                <b>{msg.sender === 'user' ? (user ? user.name : 'You') : 'Panda'}:</b> {msg.text}
                                <div className="text-xs text-gray-400 mt-1 text-right">{msg.time}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {!user && !showAuthModal && (
                          <div className="w-full flex justify-center mt-6">
                            <button
                              className="bg-[#232b3a] text-white font-bold text-lg rounded-xl px-8 py-6 w-full max-w-xl shadow hover:bg-green-500 hover:text-[#181a1b] transition text-center"
                              onClick={() => setShowAuthModal(true)}
                            >
                              Sign in or Sign up to chat
                            </button>
                          </div>
                        )}
                        {user && !hasStarted && (
                          <div className="w-full text-center font-bold text-2xl text-green-500 mt-6 tracking-wide">
                            Start your positive journey! 🚀
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* Delete confirmation popup */}
      {showDeleteDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[2000] flex items-center justify-center animate-fadeIn">
          <div className="bg-[#23263a] rounded-2xl shadow-2xl p-8 min-w-[260px] max-w-[90vw] flex flex-col items-center relative animate-popIn text-center">
            <h2 className="text-lg font-bold mb-3 text-red-400">Delete Analysis?</h2>
            <p className="mb-5 text-white">Are you sure you want to delete this chat log?</p>
            <div className="flex gap-4 w-full justify-center">
              <button
                className="flex-1 bg-red-500 text-white rounded-lg py-2 font-bold text-lg shadow hover:bg-red-600 transition-colors"
                onClick={() => handleDeleteSession(showDeleteDialog.sessionId)}
                disabled={sessions.length <= 1}
              >
                Delete
              </button>
              <button
                className="flex-1 bg-gray-600 text-white rounded-lg py-2 font-bold text-lg shadow hover:bg-gray-700 transition-colors"
                onClick={() => setShowDeleteDialog({ open: false, sessionId: null })}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[2000] flex items-center justify-center animate-fadeIn">
          <div className="bg-[#23263a] rounded-3xl shadow-2xl p-10 min-w-[350px] max-w-[95vw] flex flex-col items-center relative animate-popIn" style={{boxShadow: '0 8px 40px 0 rgba(0,0,0,0.45)'}}>
            <button
              className="absolute top-6 right-7 text-gray-300 text-3xl font-bold hover:text-green-400 transition-colors focus:outline-none"
              aria-label="Close"
              onClick={() => setShowAuthModal(false)}
              style={{lineHeight: 1}}
            >
              ×
            </button>
            <h2 className="mb-6 text-3xl font-extrabold text-green-400 text-center tracking-tight">{authMode === 'login' ? 'Login' : 'Register'}</h2>
            {showLoadingAnim && <LoadingSpinner />}
            {!showLoadingAnim && (
              <form className="w-full flex flex-col gap-5" onSubmit={authMode === 'login' ? handleLogin : handleRegister}>
                {authMode === 'register' && (
                  <input
                    type="text"
                    name="name"
                    placeholder="Name"
                    value={loginForm.name || ''}
                    onChange={handleLoginChange}
                    required
                    className="w-full p-3 rounded-xl bg-[#181c2b] text-white text-base shadow focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-400"
                  />
                )}
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={loginForm.email || ''}
                  onChange={handleLoginChange}
                  required
                  className="w-full p-3 rounded-xl bg-[#181c2b] text-white text-base shadow focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-400"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={loginForm.password || ''}
                  onChange={handleLoginChange}
                  required
                  className="w-full p-3 rounded-xl bg-[#181c2b] text-white text-base shadow focus:outline-none focus:ring-2 focus:ring-green-400 placeholder-gray-400"
                />
                {authError && (
                  <div className={`mb-2 text-center font-semibold ${authError.includes('successful') ? 'text-green-400' : 'text-red-400'}`}>{authError}</div>
                )}
                <button type="submit" className="w-full bg-green-500 text-white rounded-xl py-3 font-extrabold text-lg shadow-lg hover:bg-green-600 transition-colors mt-2">
                  {authMode === 'login' ? 'Login' : 'Register'}
                </button>
                <div className="mt-2 text-center text-base text-gray-300">
                  {authMode === 'login' ? (
                    <span>Don't have an account?{' '}
                      <button type="button" className="text-green-400 underline ml-1 font-semibold hover:text-green-300" onClick={() => { setAuthMode('register'); setAuthError(''); }}>Register</button>
                    </span>
                  ) : (
                    <span>Already have an account?{' '}
                      <button type="button" className="text-green-400 underline ml-1 font-semibold hover:text-green-300" onClick={() => { setAuthMode('login'); setAuthError(''); }}>Login</button>
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {showLogoutModal && user && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-[2000] flex items-center justify-center animate-fadeIn">
          <div className="bg-[#23263a] rounded-2xl shadow-2xl p-9 min-w-[320px] max-w-[90vw] flex flex-col items-center relative animate-popIn text-center">
            <button
              className="absolute top-4 right-5 text-gray-400 text-3xl font-bold hover:text-blue-400 transition-colors"
              aria-label="Close"
              onClick={() => setShowLogoutModal(false)}
            >
              ×
            </button>
            <div className="flex flex-col items-center mb-4">
              <div className="text-5xl mb-2">{avatar}</div>
              <div className="font-bold text-lg text-white mb-1">{user.name}</div>
              <div className="text-gray-400 text-base mb-2">{user.email}</div>
            </div>
            {user.is_admin && (
              <button
                className="w-full bg-gradient-to-r from-red-400 to-red-500 text-white rounded-xl py-2 font-bold shadow hover:from-red-500 hover:to-red-600 transition-colors mb-4"
                onClick={() => {
                  setShowLogoutModal(false);
                  openAdminPanelDirect();
                }}
              >
                Admin Controls
              </button>
            )}
            <h2 className="text-2xl font-bold mb-3 text-green-500">Confirm Logout</h2>
            <p className="mb-5 text-white">Are you sure you want to logout?</p>
            <div className="flex gap-4 w-full">
              <button
                className="flex-1 bg-red-500 text-white rounded-lg py-2 font-bold text-lg shadow hover:bg-red-600 transition-colors"
                onClick={() => { handleLogout(); setShowLogoutModal(false); }}
              >
                Logout
              </button>
              <button
                className="flex-1 bg-gray-600 text-white rounded-lg py-2 font-bold text-lg shadow hover:bg-gray-700 transition-colors"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
