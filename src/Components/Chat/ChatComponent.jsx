import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, ChevronLeft } from 'lucide-react';

function ChatComponent({ chatId, onBack, userRole, recipientName, recipientId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  // Connect to the socket
  useEffect(() => {
    const newSocket = io('http://localhost:8000');
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // Join the chat room when socket and chatId are available
  useEffect(() => {
    if (socket && chatId) {
      socket.emit('join-chat', chatId);
      
      // Set up event listener for new messages
      socket.on('receive-message', (messageData) => {
        setMessages(prevMessages => [...prevMessages, messageData]);
      });
      
      // Clean up when leaving the component
      return () => {
        socket.emit('leave-chat', chatId);
        socket.off('receive-message');
      };
    }
  }, [socket, chatId]);

  // Load existing messages
  useEffect(() => {
    if (!chatId) return;

    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:8000/chats/${chatId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
      }
    };

    fetchMessages();
  }, [chatId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Get user ID from token
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      const userId = String(tokenData.id); // Convert ID to string
      
      const messageData = {
        content: newMessage,
        chatId: chatId,
        senderId: userId,
        senderType: userRole,
        createdAt: new Date().toISOString()
      };
      
      // Send to the server
      await axios.post(`http://localhost:8000/chats/${chatId}/messages`, 
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Emit through socket
      if (socket) {
        socket.emit('send-message', messageData);
      }
      
      // Clear the input
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Group messages by date
  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      messages
    }));
  };

  // Check if a message is from the current user
  const isCurrentUser = (message) => {
    return message.senderType === userRole;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="bg-white border-b p-4 flex items-center">
        <button 
          onClick={onBack} 
          className="mr-2 p-1 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </button>
        <div>
          <h3 className="font-medium">{recipientName || 'Chat'}</h3>
          <p className="text-xs text-gray-500">
            {userRole === 'doctor' ? 'Patient' : 'Dr.'} {recipientName}
          </p>
        </div>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center items-center h-full text-gray-500">
            No messages yet. Start the conversation!
          </div>
        ) : (
          <div className="space-y-4">
            {groupMessagesByDate().map((group, groupIndex) => (
              <div key={groupIndex}>
                <div className="flex justify-center my-4">
                  <div className="bg-gray-200 rounded-full px-3 py-1 text-xs text-gray-600">
                    {formatDate(new Date(group.date))}
                  </div>
                </div>
                {group.messages.map((message, messageIndex) => (
                  <div 
                    key={message.id || messageIndex} 
                    className="mb-4"
                  >
                    {/* Message container with alignment */}
                    <div className={`flex ${isCurrentUser(message) ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`max-w-[70%] rounded-lg p-3 shadow-sm border ${
                          isCurrentUser(message) 
                            ? 'bg-blue-600 text-white rounded-br-none border-blue-700' 
                            : 'bg-white text-gray-800 rounded-bl-none border-gray-200'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                    
                    {/* Timestamp - completely separate row */}
                    <div className={`flex ${isCurrentUser(message) ? 'justify-end' : 'justify-start'} mt-1`}>
                      <div 
                        className={`text-xs ${isCurrentUser(message) ? 'text-gray-600 mr-1' : 'text-gray-500 ml-1'}`}
                      >
                        {formatTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Message input */}
      <div className="bg-white border-t p-4">
        <form onSubmit={handleSendMessage} className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-l-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-r-lg p-2 h-full"
            disabled={!newMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChatComponent; 