import { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageSquare, Plus, Users, Search } from 'lucide-react';

function ChatList({ userRole, onChatSelect, onNewChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchChats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        const endpoint = userRole === 'doctor' 
          ? 'http://localhost:8000/doctor/chats' 
          : 'http://localhost:8000/patient/chats';
          
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setChats(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching chats:', error);
        setError('Failed to load chats. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchChats();
  }, [userRole]);
  
  // Format timestamp relative to now (e.g., "2 hours ago", "Yesterday", etc.)
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
      return 'Yesterday';
    }
    
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }
    
    // For older messages, show the date
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Filter chats based on search query
  const filteredChats = chats.filter(chat => {
    const otherPartyName = userRole === 'doctor' 
      ? chat.patient?.name 
      : chat.doctor?.name;
      
    return otherPartyName?.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  const getLastMessage = (chat) => {
    if (chat.messages && chat.messages.length > 0) {
      return chat.messages[0].content;
    }
    return 'No messages yet';
  };
  
  const getRecipientName = (chat) => {
    return userRole === 'doctor' 
      ? chat.patient?.name 
      : chat.doctor?.name;
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-sm flex flex-col">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Messages</h2>
          <button
            onClick={onNewChat}
            className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">{error}</div>
        ) : filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500 h-full">
            {searchQuery ? (
              <>
                <Search className="h-8 w-8 mb-2 text-gray-400" />
                <p>No chats found matching "{searchQuery}"</p>
              </>
            ) : (
              <>
                <MessageSquare className="h-12 w-12 mb-3 text-gray-300" />
                <p className="mb-2">No conversations yet</p>
                <p className="text-sm">
                  Click the + button to start a new conversation
                </p>
              </>
            )}
          </div>
        ) : (
          <ul className="divide-y">
            {filteredChats.map((chat) => (
              <li key={chat.id}>
                <button
                  onClick={() => onChatSelect(chat)}
                  className="w-full hover:bg-gray-50 p-3 text-left flex transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-medium text-gray-900 truncate">{getRecipientName(chat)}</h3>
                      <span className="text-xs text-gray-500">
                        {chat.messages && chat.messages.length > 0
                          ? formatRelativeTime(chat.messages[0].createdAt)
                          : formatRelativeTime(chat.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{getLastMessage(chat)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ChatList; 