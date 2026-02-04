import { useState, useEffect } from 'react';
import axios from 'axios';

function MedicationTracker({ patientId, initialTab = 'current' }) {
  // Helper functions defined first
  // Get current time period (morning, afternoon, evening)
  const getCurrentTimePeriod = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  };
  
  // State definitions
  const [medications, setMedications] = useState([]);
  const [medicationHistory, setMedicationHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastTimeCheck, setLastTimeCheck] = useState(getCurrentTimePeriod());

  // Force refresh the data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    if (activeTab === 'current') {
      fetchTodayMedications();
    } else {
      fetchMedicationHistory();
    }
  }, [patientId, activeTab, refreshTrigger]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      if (activeTab === 'current') {
        fetchTodayMedications();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(timer);
  }, [activeTab, patientId]);

  // Check for time period changes to auto-mark missed medications
  useEffect(() => {
    const timePeriodChecker = setInterval(() => {
      const currentTimePeriod = getCurrentTimePeriod();
      
      // If time period has changed
      if (currentTimePeriod !== lastTimeCheck) {
        console.log(`Time period changed from ${lastTimeCheck} to ${currentTimePeriod}`);
        setLastTimeCheck(currentTimePeriod);
        
        // Check for missed medications from the previous time period
        const missableMeds = medications.filter(med => 
          med.adherenceStatus === 'Pending' && 
          isPreviousTimePeriod(med.scheduledTime, currentTimePeriod)
        );
        
        // Auto-mark these as missed
        if (missableMeds.length > 0) {
          console.log(`Auto-marking ${missableMeds.length} medications as missed`);
          
          // Update each missed medication
          missableMeds.forEach(med => {
            updateMedicationStatus(med, 'Missed');
          });
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(timePeriodChecker);
  }, [medications, lastTimeCheck]);

  // Helper to determine if a medication's scheduled time is now in the past
  const isPreviousTimePeriod = (medicationTime, currentTime) => {
    const timeOrder = ['morning', 'afternoon', 'evening'];
    const medTimeIndex = timeOrder.indexOf(medicationTime);
    const currentTimeIndex = timeOrder.indexOf(currentTime);
    
    // If it's the same day and medication time is earlier than current time
    return medTimeIndex < currentTimeIndex;
  };

  const fetchTodayMedications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(
        `http://localhost:8000/patient/medications/today/${patientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMedications(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching medications:', err);
      setError('Failed to load medications');
      setLoading(false);
    }
  };

  const fetchMedicationHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get(
        `http://localhost:8000/patient/medications/history/${patientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMedicationHistory(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching medication history:', err);
      setError('Failed to load medication history');
      setLoading(false);
    }
  };

  const updateMedicationStatus = async (medication, status) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // For medications generated from prescriptions, they might not have an ID yet
      // In that case, we need to create a new record rather than update
      const isNewMedication = !medication.id;
      
      console.log("Updating medication:", {
        id: medication.id || 'new-medication', 
        status,
        patientId,
        medication: medication.medicineName || medication.medication
      });

      await axios.post(
        `http://localhost:8000/patient/medications/update-status`,
        {
          id: medication.id || `temp-${Date.now()}`, // Provide a temporary ID if none exists
          status,
          patientId: parseInt(patientId),
          medication: medication.medicineName || medication.medication,
          prescriptionId: medication.prescriptionId,
          medicineId: medication.medicineId,
          scheduledTime: medication.scheduledTime,
          isNewMedication: isNewMedication // Tell the backend this is a new record
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Refresh the medication list and trigger parent component refresh
      fetchTodayMedications();
      
      // Create a custom event to notify parent components that medication data has changed
      const event = new CustomEvent('medicationUpdated', { detail: { patientId } });
      window.dispatchEvent(event);
      
      // Force refresh for adherence stats
      refreshData();
    } catch (err) {
      console.error('Error updating medication status:', err.response?.data || err.message);
      setError('Failed to update medication status. Please try again.');
    }
  };

  const getTimeEmoji = (time) => {
    switch(time) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌙';
      default: return '⏰';
    }
  };

  // Group medications by scheduled time
  const groupMedicationsByTime = (meds) => {
    return meds.reduce((groups, med) => {
      const time = med.scheduledTime || 'unscheduled';
      if (!groups[time]) {
        groups[time] = [];
      }
      groups[time].push(med);
      return groups;
    }, {});
  };

  const timeOrder = ['morning', 'afternoon', 'evening', 'unscheduled'];

  // Get medications sorted by time
  const getSortedTimeGroups = () => {
    const groups = groupMedicationsByTime(medications);
    return timeOrder
      .filter(time => groups[time] && groups[time].length > 0)
      .map(time => ({
        time,
        medications: groups[time]
      }));
  };

  // Get time display name
  const getTimeDisplayName = (time) => {
    switch(time) {
      case 'morning': return 'Morning';
      case 'afternoon': return 'Afternoon';
      case 'evening': return 'Evening';
      default: return 'Unscheduled';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <div className="text-center p-4 text-black">
          <svg className="animate-spin h-10 w-10 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading medications...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error}</span>
        <button 
          onClick={refreshData} 
          className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-4 justify-between">
        <div className="flex">
          <button 
            onClick={() => setActiveTab('current')}
            className={`px-4 py-2 mr-2 ${activeTab === 'current' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded`}
          >
            Today's Medications
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 ${activeTab === 'history' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded`}
          >
            Medication History
          </button>
        </div>
        
        <button 
          onClick={refreshData}
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {activeTab === 'current' ? (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-black">Today's Medications</h2>
          
          {medications.length === 0 ? (
            <p className="text-black">No medications scheduled for today.</p>
          ) : (
            <>
              {/* Current time period highlight */}
              <div className="mb-4 p-3 bg-yellow-100 rounded-md border border-yellow-300">
                <p className="text-yellow-800 font-medium">
                  Current time: {getTimeDisplayName(getCurrentTimePeriod())} {getTimeEmoji(getCurrentTimePeriod())}
                </p>
              </div>
              
              {/* Group medications by time period regardless of status */}
              {getSortedTimeGroups().map(group => (
                <div key={group.time} className="mb-6">
                  <h3 className="text-xl font-semibold mb-3 text-black border-b pb-2">
                    {getTimeEmoji(group.time)} {getTimeDisplayName(group.time)} Medications
                  </h3>
                  
                  {/* Show counts for this time period */}
                  <div className="mb-2 flex text-sm space-x-4">
                    <span className="text-green-700">
                      Taken: {group.medications.filter(m => m.adherenceStatus === 'Taken').length}
                    </span>
                    <span className="text-yellow-700">
                      Pending: {group.medications.filter(m => m.adherenceStatus === 'Pending').length}
                    </span>
                    <span className="text-red-700">
                      Missed: {group.medications.filter(m => m.adherenceStatus === 'Missed').length}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.medications.map((medication, index) => (
                      <div 
                        key={medication.id || index} 
                        className={`border p-4 rounded shadow-sm ${
                          getCurrentTimePeriod() === group.time ? 'bg-blue-50 border-blue-200' : ''
                        } ${
                          medication.adherenceStatus === 'Taken' ? 'bg-green-50' :
                          medication.adherenceStatus === 'Missed' ? 'bg-red-50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-lg text-black">
                            {medication.medicineName || medication.medication}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            medication.adherenceStatus === 'Taken' ? 'bg-green-200 text-green-800' :
                            medication.adherenceStatus === 'Missed' ? 'bg-red-200 text-red-800' :
                            'bg-yellow-200 text-yellow-800'
                          }`}>
                            {medication.adherenceStatus}
                          </span>
                        </div>
                        
                        <p className="text-gray-600">Dosage: {medication.dosage}</p>
                        <p className="text-gray-600">Instructions: {medication.instructions}</p>
                        
                        {medication.adherenceStatus === 'Pending' ? (
                          <div className="mt-3 flex space-x-2">
                            <button 
                              onClick={() => updateMedicationStatus(medication, 'Taken')}
                              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                            >
                              Mark as Taken ✓
                            </button>
                            <button 
                              onClick={() => updateMedicationStatus(medication, 'Missed')}
                              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                            >
                              Mark as Missed ✗
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3">
                            {medication.adherenceStatus === 'Taken' ? (
                              <span className="text-green-700 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Taken
                              </span>
                            ) : (
                              <span className="text-red-700 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                                Missed
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Adherence statistics */}
              <div className="mt-6 bg-white p-4 rounded-md border">
                <h3 className="text-lg font-semibold text-black mb-2">Today's Adherence</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-100 p-2 rounded">
                    <p className="text-green-800 text-xl font-bold">
                      {medications.filter(m => m.adherenceStatus === 'Taken').length}
                    </p>
                    <p className="text-sm text-green-800">Taken</p>
                  </div>
                  <div className="bg-yellow-100 p-2 rounded">
                    <p className="text-yellow-800 text-xl font-bold">
                      {medications.filter(m => m.adherenceStatus === 'Pending').length}
                    </p>
                    <p className="text-sm text-yellow-800">Pending</p>
                  </div>
                  <div className="bg-red-100 p-2 rounded">
                    <p className="text-red-800 text-xl font-bold">
                      {medications.filter(m => m.adherenceStatus === 'Missed').length}
                    </p>
                    <p className="text-sm text-red-800">Missed</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4 text-black">Medication History</h2>
          
          {medicationHistory.length === 0 ? (
            <p className="text-black">No medication history available.</p>
          ) : (
            <>
            <div className="overflow-x-auto"></div>
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b">Date</th>
                    <th className="py-2 px-4 border-b">Time</th>
                    <th className="py-2 px-4 border-b">Medication</th>
                    <th className="py-2 px-4 border-b">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {medicationHistory.map((record) => (
                    <tr key={record.id} className={
                      record.adherenceStatus === 'Taken' ? 'bg-green-50' :
                      record.adherenceStatus === 'Missed' ? 'bg-red-50' : 'bg-yellow-50'
                    }>
                      <td className="py-2 px-4 border-b">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {record.scheduledTime} {getTimeEmoji(record.scheduledTime)}
                      </td>
                      <td className="py-2 px-4 border-b">
                        {record.medication}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          record.adherenceStatus === 'Taken' ? 'bg-green-200 text-green-800' :
                          record.adherenceStatus === 'Missed' ? 'bg-red-200 text-red-800' :
                          'bg-yellow-200 text-yellow-800'
                        }`}>
                          {record.adherenceStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            
          )}
        </div>
      )}
    </div>
  );
}

export default MedicationTracker;
