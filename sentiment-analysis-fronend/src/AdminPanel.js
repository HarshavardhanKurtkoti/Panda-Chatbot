import React, { useState, useEffect } from 'react';

const BACKEND_URL = "http://127.0.0.1:5000";

function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [chats, setChats] = useState([]);
  const [stats, setStats] = useState({ users: 0, chats: 0, admins: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const [usersRes, chatsRes, statsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/admin/users`, { headers }),
          fetch(`${BACKEND_URL}/admin/chats`, { headers }),
          fetch(`${BACKEND_URL}/admin/stats`, { headers }),
        ]);
        const usersData = await usersRes.json();
        const chatsData = await chatsRes.json();
        const statsData = await statsRes.json();
        if (usersRes.ok) setUsers(usersData.users);
        if (chatsRes.ok) setChats(chatsData.chats);
        if (statsRes.ok) setStats(statsData);
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
    return () => {};
  }, []);

  const handleDeleteUser = async (email) => {
    if (!window.confirm(`Are you sure you want to delete user ${email}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/admin/users/${email}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(users.filter(user => user.email !== email));
        alert('User deleted successfully');
      } else {
        alert('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleDeleteChat = async (chatId) => {
    if (!window.confirm(`Are you sure you want to delete chat ${chatId}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${BACKEND_URL}/admin/chats/${chatId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setChats(chats.filter(chat => chat.id !== chatId));
        alert('Chat deleted successfully');
      } else {
        alert('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  if (loading) return <div>Loading admin data...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto bg-[#23263a] rounded-2xl shadow-2xl mt-8 mb-8 animate-popIn overflow-y-auto max-h-[80vh]">
      <button onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-semibold mb-8 shadow-lg transition-all duration-150">Close Admin Panel</button>

      <h2 className="text-2xl font-extrabold mb-4 text-green-400">Admin Stats</h2>
      <div className="flex gap-8 mb-8 text-lg">
        <div><span className="font-bold text-white">Total Users:</span> <span className="text-green-300">{stats.users}</span></div>
        <div><span className="font-bold text-white">Total Chats:</span> <span className="text-blue-300">{stats.chats}</span></div>
        <div><span className="font-bold text-white">Total Admins:</span> <span className="text-red-300">{stats.admins}</span></div>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4 text-white">Manage Users</h2>
      <table className="w-full mb-8 rounded-xl overflow-hidden shadow">
        <thead>
          <tr className="bg-[#20232a] text-green-400 text-left">
            <th className="py-2 px-4">Name</th>
            <th className="py-2 px-4">Email</th>
            <th className="py-2 px-4">Admin</th>
            <th className="py-2 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.email} className="border-b border-[#23263a] hover:bg-[#23263a]/60 transition">
              <td className="py-2 px-4 text-white">{user.name}</td>
              <td className="py-2 px-4 text-blue-200">
                <button
                  className={`underline hover:text-blue-400 ${selectedUser === user.email ? 'font-bold text-green-400' : ''}`}
                  onClick={() => setSelectedUser(user.email)}
                  title="Filter chats by this user"
                >
                  {user.email}
                </button>
              </td>
              <td className="py-2 px-4">{user.is_admin ? <span className="text-red-400 font-bold">Yes</span> : <span className="text-gray-400">No</span>}</td>
              <td className="py-2 px-4">
                <button
                  onClick={() => handleDeleteUser(user.email)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow font-semibold text-sm transition-all duration-150"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedUser && (
        <button
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold"
          onClick={() => setSelectedUser(null)}
        >
          Show All Chats
        </button>
      )}

      <h2 className="text-xl font-bold mt-8 mb-4 text-white">Manage Chats</h2>
      <table className="w-full rounded-xl overflow-hidden shadow">
        <thead>
          <tr className="bg-[#20232a] text-blue-400 text-left">
            <th className="py-2 px-4">Title</th>
            <th className="py-2 px-4">ID</th>
            <th className="py-2 px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(selectedUser ? chats.filter(chat => chat.user_email === selectedUser) : chats).map(chat => (
            <tr key={chat.id} className="border-b border-[#23263a] hover:bg-[#23263a]/60 transition">
              <td className="py-2 px-4 text-white">{chat.title}</td>
              <td className="py-2 px-4 text-green-300">{chat.id}</td>
              <td className="py-2 px-4">
                <button
                  onClick={() => handleDeleteChat(chat.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow font-semibold text-sm transition-all duration-150"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPanel;