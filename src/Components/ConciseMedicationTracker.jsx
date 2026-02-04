import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';

function ConciseMedicationTracker({ patientId }) {
  const [summary, setSummary] = useState({ taken: 0, pending: 0, missed: 0 });
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchTodaySummary = async () => {
      if (!patientId) {
        setError('Patient ID not provided');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(
          `http://localhost:8000/doctor/patient-medications/today/${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const todayMeds = response.data;
        setMedications(todayMeds);
        
        const takenCount = todayMeds.filter(m => m.adherenceStatus === 'Taken').length;
        const pendingCount = todayMeds.filter(m => m.adherenceStatus === 'Pending').length;
        const missedCount = todayMeds.filter(m => m.adherenceStatus === 'Missed').length;

        setSummary({ taken: takenCount, pending: pendingCount, missed: missedCount });
        
      } catch (err) {
        console.error("Error fetching today's medication summary for doctor:", err);
        setError('Failed to load summary');
      } finally {
        setLoading(false);
      }
    };

    fetchTodaySummary();
    
    // Refresh summary periodically
    const interval = setInterval(fetchTodaySummary, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);

  }, [patientId]);

  // Group medications by time period
  const getMedicationsByTimePeriod = () => {
    const grouped = {
      morning: [],
      afternoon: [],
      evening: []
    };
    
    medications.forEach(med => {
      if (grouped[med.scheduledTime]) {
        grouped[med.scheduledTime].push(med);
      }
    });
    
    return grouped;
  };
  
  // Get icon for medication status
  const getStatusIcon = (status) => {
    switch(status) {
      case 'Taken':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'Missed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };
  
  const getTimePeriodIcon = (period) => {
    switch(period) {
      case 'morning':
        return '🌅';
      case 'afternoon':
        return '☀️';
      case 'evening':
        return '🌙';
      default:
        return '⏰';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 text-sm text-gray-500">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500 mr-2"></div>
        Loading adherence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center p-4 text-sm text-red-600 bg-red-50 rounded-md">
        <AlertTriangle className="h-4 w-4 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div>
      {/* Summary View */}
      <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
        <div className="bg-green-100 p-2 rounded flex flex-col items-center justify-center">
          <CheckCircle className="h-5 w-5 text-green-600 mb-1" />
          <p className="text-green-800 font-bold">{summary.taken}</p>
          <p className="text-xs text-green-800">Taken</p>
        </div>
        <div className="bg-yellow-100 p-2 rounded flex flex-col items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mb-1" />
          <p className="text-yellow-800 font-bold">{summary.pending}</p>
          <p className="text-xs text-yellow-800">Pending</p>
        </div>
        <div className="bg-red-100 p-2 rounded flex flex-col items-center justify-center">
          <XCircle className="h-5 w-5 text-red-600 mb-1" />
          <p className="text-red-800 font-bold">{summary.missed}</p>
          <p className="text-xs text-red-800">Missed</p>
        </div>
      </div>

      {/* Expand/Collapse Button */}
      {medications.length > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center w-full justify-center mb-1"
        >
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      )}
      
      {/* Detailed Medication List View */}
      {expanded && (
        <div className="text-sm mt-2 space-y-3">
          {Object.entries(getMedicationsByTimePeriod()).map(([period, meds]) => (
            meds.length > 0 && (
              <div key={period} className="border border-gray-200 rounded-md p-2">
                <h4 className="font-medium mb-2 text-gray-700 flex items-center">
                  <span className="mr-1">{getTimePeriodIcon(period)}</span>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </h4>
                <div className="space-y-1">
                  {meds.map((med, index) => (
                    <div 
                      key={med.id || index} 
                      className={`py-1 px-2 rounded-sm flex items-center justify-between ${
                        med.adherenceStatus === 'Taken' ? 'bg-green-50' : 
                        med.adherenceStatus === 'Missed' ? 'bg-red-50' : 'bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center">
                        {getStatusIcon(med.adherenceStatus)}
                        <span className="ml-2">{med.medication || med.medicineName}</span>
                      </div>
                      <span className="text-xs font-medium">
                        {med.adherenceStatus}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          
          {/* If no medications are found for today */}
          {medications.length === 0 && (
            <div className="text-gray-500 text-center py-2">
              No medications scheduled for today
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConciseMedicationTracker; 