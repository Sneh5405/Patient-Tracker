import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Calendar, User, Stethoscope } from 'lucide-react';

function ViewPrescription({ patientId }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // newest first by default

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(
          `http://localhost:8000/patient/prescriptions/${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        setPrescriptions(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching prescriptions:', err);
        setError('Failed to load prescriptions');
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [patientId]);

  const handleSort = (field) => {
    if (sortBy === field) {
      // Toggle direction if same field clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, set default direction
      setSortBy(field);
      setSortDirection('desc');
    }
  };

  const sortedPrescriptions = [...prescriptions].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortBy === 'doctor') {
      const doctorA = a.doctor.name.toLowerCase();
      const doctorB = b.doctor.name.toLowerCase();
      return sortDirection === 'asc' 
        ? doctorA.localeCompare(doctorB) 
        : doctorB.localeCompare(doctorA);
    }
    return 0;
  });

  if (loading) {
    return <div className="text-center p-4 text-black">Loading prescriptions...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Prescription History</h2>
        <div className="flex space-x-4 mt-2 md:mt-0">
          <button 
            onClick={() => handleSort('date')}
            className={`flex items-center space-x-1 ${sortBy === 'date' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
          >
            <Calendar className="h-4 w-4" />
            <span>Date</span>
            {sortBy === 'date' && (
              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button 
            onClick={() => handleSort('doctor')}
            className={`flex items-center space-x-1 ${sortBy === 'doctor' ? 'text-blue-600 font-medium' : 'text-gray-600'}`}
          >
            <User className="h-4 w-4" />
            <span>Doctor</span>
            {sortBy === 'doctor' && (
              sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      
      {prescriptions.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <p className="text-gray-600">You have no prescriptions yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedPrescriptions.map((prescription) => (
            <div 
              key={prescription.id} 
              className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row justify-between mb-4 pb-3 border-b">
                <div>
                  <div className="flex items-center text-gray-700 mb-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      {format(new Date(prescription.date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex items-center text-gray-600 mb-1">
                    <User className="h-4 w-4 mr-2" />
                    <span>Dr. {prescription.doctor.name}</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    <span>Condition: {prescription.condition || 'General'}</span>
                  </div>
                </div>
                <div className="mt-2 md:mt-0 text-sm bg-blue-50 px-2 py-1 rounded-full text-blue-600 self-start">
                  {prescription.medicines.length} medication{prescription.medicines.length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Medications</h4>
                <div className="space-y-3">
                  {prescription.medicines.map((med) => (
                    <div key={med.id} className="bg-blue-50 p-3 rounded border border-blue-100">
                      <h5 className="font-medium text-gray-800 mb-2">{med.medicineName}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium text-gray-700">Dosage:</span> {med.dosage}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Duration:</span> {med.duration}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Timing:</span> {Object.entries(med.timing)
                            .filter(([_, value]) => value === true)
                            .map(([key]) => key)
                            .join(', ')}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Instructions:</span> {med.instructions}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ViewPrescription;
