import { useState, useEffect, useCallback } from 'react';
import ViewPrescription from '../Components/ViewPrescription';
import MedicationTracker from '../Components/MedicationTracker';
import AppointmentBooking from '../Components/AppointmentBooking';
import AppointmentList from '../Components/AppointmentList';
import MessagesInterface from '../Components/Chat/MessagesInterface';
import axios from 'axios';
import { Calendar, PieChart, PillIcon, Scroll, RefreshCw, MessageSquare } from 'lucide-react';
import io from 'socket.io-client';

function PatientDashboard({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'medications');
  const [patientId, setPatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [upcomingMedications, setUpcomingMedications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [userName, setUserName] = useState('');
  const [viewMedications, setViewMedications] = useState(true);
  const [viewPrescriptions, setViewPrescriptions] = useState(false);
  const [stats, setStats] = useState({
    totalPrescriptions: 0,
    activeMedications: 0,
    adherenceRate: 0,
    upcomingAppointments: 0
  });
  const [socket, setSocket] = useState(null);

  const fetchUpcomingMedications = useCallback(async (id, token) => {
    try {
      setIsLoading(true);
      const response = await axios.get(
        `http://localhost:8000/patient/medications/today/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          },
          params: {
            _t: new Date().getTime()
          }
        }
      );

      const pendingMedications = response.data.filter(
        med => med.adherenceStatus === 'Pending'
      );

      setUpcomingMedications(pendingMedications);
      setIsLoading(false);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching upcoming medications:', error);
      setIsLoading(false);
      setError("Failed to load medication data. Please try refreshing the page.");
    }
  }, []);

  useEffect(() => {
    // Setup socket connection
    const newSocket = io('http://localhost:8000');
    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Listen for medication updates via socket if patientId is available
    if (socket && patientId) {
      const handleMedicationUpdate = (data) => {
        // Check if this update is for the current patient
        if (data.patientId === patientId) {
          console.log('Received medication update via WebSocket:', data);
          
          // Show a notification to the user
          if (data.message) {
            // You could use a toast notification library here
            alert(data.message);
          }
          
          // Refresh the data
          handleRefresh();
        }
      };

      // Listen for medication update events
      socket.on('medications-updated', handleMedicationUpdate);

      // Cleanup listener on unmount or when patientId/socket changes
      return () => {
        socket.off('medications-updated', handleMedicationUpdate);
      };
    }
  }, [socket, patientId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError("No authentication token found. Please log in again.");
          setIsLoading(false);
          return;
        }

        const decodedToken = JSON.parse(atob(token.split('.')[1]));
        const id = decodedToken.id;
        const name = decodedToken.name || 'Patient';
        setPatientId(id);
        setPatientData(decodedToken);
        setUserName(name);

        if (id) {
          // Fetch medications
          fetchUpcomingMedications(id, token);
          
          // Fetch prescriptions
          const prescriptionsResponse = await axios.get(
            `http://localhost:8000/patient/prescriptions/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setPrescriptions(prescriptionsResponse.data);
          
          // Fetch adherence stats
          const statsResponse = await axios.get(
            `http://localhost:8000/patient/medications/adherence-stats/${id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          // Fetch upcoming appointments count
          const appointmentsResponse = await axios.get(
            'http://localhost:8000/patient/appointments',
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          const upcomingAppointments = appointmentsResponse.data.filter(
            appointment => 
              new Date(appointment.appointmentDate) > new Date() && 
              appointment.status === 'scheduled'
          ).length;
          
          setStats({
            totalPrescriptions: prescriptionsResponse.data.length,
            activeMedications: statsResponse.data.summary?.totalMedications || 0,
            adherenceRate: statsResponse.data.summary?.adherenceRate || 0,
            upcomingAppointments
          });
        }
      } catch (err) {
        console.error("Error loading patient data:", err);
        setError("Failed to load patient data. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchUpcomingMedications]);

  useEffect(() => {
    if (!patientId) return;

    const refreshInterval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token && patientId) {
        fetchUpcomingMedications(patientId, token);
      }
    }, 60000);

    // Add event listener for medication updates
    const handleMedicationUpdate = () => {
      handleRefresh();
    };
    
    window.addEventListener('medicationUpdated', handleMedicationUpdate);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('medicationUpdated', handleMedicationUpdate);
    };
  }, [patientId, fetchUpcomingMedications]);

  // Manual refresh function
  const handleRefresh = () => {
    const token = localStorage.getItem('token');
    if (token && patientId) {
      fetchUpcomingMedications(patientId, token);
      
      // Also refresh adherence stats, prescriptions, and appointments
      axios.get(
        `http://localhost:8000/patient/medications/adherence-stats/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(statsResponse => {
        setStats(prevStats => ({
          ...prevStats,
          activeMedications: statsResponse.data.summary?.totalMedications || 0,
          adherenceRate: statsResponse.data.summary?.adherenceRate || 0
        }));
      }).catch(err => console.error("Error refreshing adherence stats:", err));
      
      // Refresh prescriptions
      axios.get(
        `http://localhost:8000/patient/prescriptions/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(prescriptionsResponse => {
        setPrescriptions(prescriptionsResponse.data);
        setStats(prevStats => ({
          ...prevStats,
          totalPrescriptions: prescriptionsResponse.data.length
        }));
      }).catch(err => console.error("Error refreshing prescriptions:", err));
      
      // Refresh appointments
      axios.get(
        'http://localhost:8000/patient/appointments',
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(appointmentsResponse => {
        const upcomingAppointments = appointmentsResponse.data.filter(
          appointment => 
            new Date(appointment.appointmentDate) > new Date() && 
            appointment.status === 'scheduled'
        ).length;
        
        setStats(prevStats => ({
          ...prevStats,
          upcomingAppointments
        }));
      }).catch(err => console.error("Error refreshing appointments:", err));
    }
  };

  const getCurrentTimePeriod = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  };

  const getTimeEmoji = (time) => {
    switch (time) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌙';
      default: return '⏰';
    }
  };

  const currentTimeMedications = upcomingMedications.filter(
    med => med.scheduledTime === getCurrentTimePeriod()
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
            <button
              onClick={handleRefresh}
              className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const switchToTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'medications') {
      setViewMedications(true);
      setViewPrescriptions(false);
    } else if (tab === 'prescriptions') {
      setViewMedications(false);
      setViewPrescriptions(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome back, {userName}!</h1>
              <p className="text-gray-600">Here's your health overview for today</p>
            </div>
            <div className="flex items-center mt-4 md:mt-0">
              {lastRefreshed && (
                <span className="text-sm text-gray-500 mr-3">
                  Last updated: {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleRefresh}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center transition duration-200"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-100 mr-4">
                  <Scroll className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prescriptions</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalPrescriptions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100 mr-4">
                  <PillIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Medications</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.activeMedications}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-amber-100 mr-4">
                  <PieChart className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Adherence Rate</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.adherenceRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-100 mr-4">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Upcoming Appointments</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.upcomingAppointments}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medication Reminders */}
        {!isLoading && currentTimeMedications.length > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-md p-6 mb-6 text-white">
            <div className="flex items-center mb-4">
              <span className="text-3xl mr-3">{getTimeEmoji(getCurrentTimePeriod())}</span>
              <h2 className="text-2xl font-semibold">Time for your {getCurrentTimePeriod()} medications!</h2>
            </div>
            <p className="mb-4">
              You have {currentTimeMedications.length} medication{currentTimeMedications.length > 1 ? 's' : ''} to take now:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {currentTimeMedications.map((med, index) => (
                <div key={med.id || index} className="bg-white bg-opacity-20 p-3 rounded-lg backdrop-blur-sm">
                  <div className="font-medium">{med.medicineName || med.medication}</div>
                  <div className="text-sm opacity-80">{med.dosage}</div>
                </div>
              ))}
            </div>
            <button
              onClick={() => switchToTab('medications')}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-gray-100 font-medium transition duration-200"
            >
              Mark as Taken
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex mb-6 border-b border-gray-200 bg-white rounded-t-xl shadow-md px-4 overflow-x-auto">
          <button
            onClick={() => switchToTab('dashboard')}
            className={`${activeTab === 'dashboard' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap`}
          >
            <div className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Dashboard
            </div>
          </button>
          <button
            onClick={() => switchToTab('medications')}
            className={`${activeTab === 'medications' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap`}
          >
            <div className="flex items-center">
              <PillIcon className="h-5 w-5 mr-2" />
              Medication Tracker
            </div>
          </button>
          <button
            onClick={() => switchToTab('prescriptions')}
            className={`${activeTab === 'prescriptions' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap`}
          >
            <div className="flex items-center">
              <Scroll className="h-5 w-5 mr-2" />
              My Prescriptions
            </div>
          </button>
          <button
            onClick={() => switchToTab('appointments')}
            className={`${activeTab === 'appointments' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap`}
          >
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Appointments
            </div>
          </button>
          <button
            onClick={() => switchToTab('messages')}
            className={`${activeTab === 'messages' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'} px-4 py-3 font-medium text-sm focus:outline-none whitespace-nowrap`}
          >
            <div className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Messages
            </div>
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-b-xl shadow-md p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">Recent Prescriptions</h3>
                    <button 
                      onClick={() => switchToTab('prescriptions')}
                      className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                    >
                      View All Prescriptions
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {prescriptions.length === 0 ? (
                    <p className="text-gray-500">No prescriptions found</p>
                  ) : (
                    <div className="space-y-4">
                      {prescriptions.slice(0, 5).map((prescription) => (
                        <div key={prescription.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div>
                              <p className="font-medium text-gray-800">Dr. {prescription.doctor.name}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(prescription.date).toLocaleDateString()} 
                                <span className="mx-2">•</span>
                                {prescription.medicines.length} medication{prescription.medicines.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => switchToTab('prescriptions')}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Details
                            </button>
                          </div>
                          
                          {/* Show a preview of medicines */}
                          {prescription.medicines.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {prescription.medicines.slice(0, 3).map(med => (
                                <div key={med.id} className="bg-blue-50 px-2 py-1 rounded text-xs text-blue-700">
                                  {med.medicineName}
                                </div>
                              ))}
                              {prescription.medicines.length > 3 && (
                                <div className="bg-gray-100 px-2 py-1 rounded text-xs text-gray-600">
                                  +{prescription.medicines.length - 3} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {prescriptions.length > 5 && (
                        <div className="text-center pt-2">
                          <button 
                            onClick={() => switchToTab('prescriptions')}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            See {prescriptions.length - 5} more prescriptions
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'medications' && patientId && <MedicationTracker patientId={patientId} />}
              {activeTab === 'prescriptions' && patientId && <ViewPrescription patientId={patientId} />}
              {activeTab === 'appointments' && (
                <div className="space-y-8">
                  <AppointmentBooking />
                  <AppointmentList userRole="patient" />
                </div>
              )}
              {activeTab === 'messages' && (
                <div className="h-full">
                  <MessagesInterface userRole="patient" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default PatientDashboard;