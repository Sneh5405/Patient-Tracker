import { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, Search, Users, ArrowRightCircle } from 'lucide-react';

function NewChat({ userRole, onBack, onChatStart }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingContact, setProcessingContact] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // API endpoint depends on user role
        const endpoint = userRole === 'doctor' 
          ? 'http://localhost:8000/doctor/doctors' 
          : 'http://localhost:8000/doctor/retrievePatients'; // For patients, get their doctors
        
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setContacts(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setError('Failed to load contacts. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchContacts();
  }, [userRole]);
  
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (contact.email && contact.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const handleContactSelect = async (contact) => {
    try {
      setProcessingContact(contact.id);
      setStatusMessage('Accessing chat...');
      
      const token = localStorage.getItem('token');
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      
      // Create or get existing chat
      const chatData = {
        patientId: userRole === 'doctor' ? contact.id : tokenData.id,
        doctorId: userRole === 'doctor' ? tokenData.id : contact.id
      };
      
      const response = await axios.post('http://localhost:8000/chats', chatData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Give feedback about existing vs new chat
      if (response.data.isExisting) {
        setStatusMessage('Accessing existing conversation...');
      } else {
        setStatusMessage('Starting new conversation...');
      }
      
      // Short delay to show the status message
      setTimeout(() => {
        // Call the parent component's callback with the chat
        onChatStart(response.data);
        setProcessingContact(null);
        setStatusMessage('');
      }, 500);
      
    } catch (error) {
      console.error('Error creating/accessing chat:', error);
      setError('Failed to access chat. Please try again.');
      setProcessingContact(null);
      setStatusMessage('');
    }
  };

  return (
    <div className="h-full bg-white rounded-lg shadow-sm flex flex-col">
      <div className="p-4 border-b flex items-center">
        <button 
          onClick={onBack} 
          className="mr-3 p-1 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">New Message</h2>
      </div>
      
      <div className="p-4 border-b">
        <div className="relative">
          <input
            type="text"
            placeholder={`Search ${userRole === 'doctor' ? 'patients' : 'doctors'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {statusMessage && (
        <div className="p-3 bg-blue-50 text-blue-700 border-b border-blue-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
          {statusMessage}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500">{error}</div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 text-gray-500">
            <Search className="h-8 w-8 mb-2 text-gray-400" />
            <p>No {userRole === 'doctor' ? 'patients' : 'doctors'} found</p>
            {searchQuery && <p className="text-sm mt-1">Try a different search term</p>}
          </div>
        ) : (
          <ul className="divide-y">
            {filteredContacts.map((contact) => (
              <li key={contact.id}>
                <button
                  onClick={() => handleContactSelect(contact)}
                  disabled={processingContact !== null}
                  className={`w-full hover:bg-gray-50 p-3 text-left flex items-center transition-colors ${
                    processingContact === contact.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {userRole === 'patient' ? `Dr. ${contact.name}` : contact.name}
                    </h3>
                    {contact.email && (
                      <p className="text-sm text-gray-500">{contact.email}</p>
                    )}
                    {userRole === 'patient' && contact.specialization && (
                      <p className="text-xs text-gray-500">{contact.specialization}</p>
                    )}
                  </div>
                  {processingContact !== contact.id && (
                    <ArrowRightCircle className="h-5 w-5 text-gray-400" />
                  )}
                  {processingContact === contact.id && (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default NewChat; 