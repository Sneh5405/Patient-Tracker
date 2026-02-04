import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AddPrescription from './AddPrescription';
import { format } from 'date-fns';
import { Calendar, User, PlusCircle, FileText, ArrowLeft, Clock, Search } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';

function RetirevePatient({ onAddPrescription }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [error, setError] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        const response = await axios.get(
          'http://localhost:8000/doctor/retrievePatients',
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        // Ensure each patient has an id field for consistent key usage
        const patientsWithConsistentIds = response.data.map(patient => ({
          ...patient,
          // Use existing id or _id, or generate a fallback
          uniqueId: patient.id || patient._id || `patient-${Math.random().toString(36).substr(2, 9)}`
        }));

        setPatients(patientsWithConsistentIds);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching patients:', err);
        setError('Failed to load patients');
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const filteredPatients = patients.filter(patient => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return (
      patient.name.toLowerCase().includes(lowerSearchTerm) ||
      patient.email.toLowerCase().includes(lowerSearchTerm)
    );
  });

  const handleAddPrescription = (patient) => {
    // If handler provided by parent, use that (for integrated modal approach)
    if (onAddPrescription) {
      onAddPrescription(patient);
    } else {
      // Otherwise use local state for standalone component
      setSelectedPatient(patient);
      setShowPrescriptionModal(true);
    }
  };

  const handleClosePrescriptionModal = () => {
    setShowPrescriptionModal(false);
    setSelectedPatient(null);
  };

  const handleViewPatientDetails = async (patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
    setLoadingPrescriptions(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found');
        setLoadingPrescriptions(false);
        return;
      }
      
      const patientId = patient.id || patient._id || patient.uniqueId;
      const response = await axios.get(`http://localhost:8000/doctor/prescriptions/${patientId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setPatientPrescriptions(response.data);
      setLoadingPrescriptions(false);
    } catch (error) {
      console.error('Error fetching patient prescriptions:', error);
      setLoadingPrescriptions(false);
    }
  };

  const handleBackToPatientList = () => {
    setShowPatientDetails(false);
    setSelectedPatient(null);
    setPatientPrescriptions([]);
  };

  if (loading) {
    return <div className="text-center p-4 text-black">Loading patients...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  if (showPatientDetails && selectedPatient) {
    return (
      <div className="container mx-auto p-4">
        <button 
          onClick={handleBackToPatientList}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Patient List
        </button>
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedPatient.name}</h2>
              <p className="text-gray-600 mb-1">{selectedPatient.email}</p>
              <div className="flex flex-wrap gap-4 mt-3">
                <div className="bg-gray-100 px-3 py-1 rounded text-gray-700">
                  Age: {selectedPatient.age || 'Not specified'}
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded text-gray-700">
                  Gender: {selectedPatient.gender || 'Not specified'}
                </div>
                <div className="bg-gray-100 px-3 py-1 rounded text-gray-700">
                  Status: {selectedPatient.status || 'Active'}
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={() => handleAddPrescription(selectedPatient)}
                className="bg-blue-500 text-white px-4 py-2 rounded flex items-center hover:bg-blue-600"
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add New Prescription
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600" />
            Prescription History
          </h3>
          
          {loadingPrescriptions ? (
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading prescriptions...</p>
            </div>
          ) : patientPrescriptions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-600">
              No prescriptions found for this patient
            </div>
          ) : (
            <div className="space-y-4">
              {patientPrescriptions.map((prescription) => (
                <div key={prescription.id} className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                  <div className="flex justify-between items-start mb-4 pb-3 border-b">
                    <div>
                      <div className="flex items-center text-gray-700 mb-1">
                        <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                        <span className="font-medium">
                          {format(new Date(prescription.date), 'MMMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-gray-500" />
                        <span>{format(new Date(prescription.date), 'h:mm a')}</span>
                      </div>
                    </div>
                    <div className="bg-blue-50 px-2 py-1 rounded-full text-xs text-blue-600">
                      {prescription.medicines.length} medication{prescription.medicines.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {prescription.medicines.map((med) => (
                      <div key={med.id} className="bg-gray-50 p-3 rounded">
                        <h5 className="font-medium text-gray-800">{med.medicineName}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                          <div>
                            <span className="text-gray-700">Dosage:</span> {med.dosage}
                          </div>
                          <div>
                            <span className="text-gray-700">Duration:</span> {med.duration}
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-gray-700">Timing:</span> {Object.entries(med.timing)
                              .filter(([_, value]) => value === true)
                              .map(([key]) => key)
                              .join(', ')}
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-gray-700">Instructions:</span> {med.instructions}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 md:mb-0">My Patients</h2>
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            type="text"
            placeholder="Search patients..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-10 w-full"
          />
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">No patients found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map(patient => (
            <Card key={patient.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-0">
                <div className="bg-medical-green-light/20 p-4 flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-medical-green-light flex items-center justify-center mr-3">
                      <User className="h-5 w-5 text-medical-green-dark" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                      <p className="text-sm text-gray-500">{patient.email}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div>
                      <p className="text-xs text-gray-500">Patient ID</p>
                      <p className="text-sm font-medium">{patient.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className={`text-sm font-medium ${
                        patient.status === 'active' ? 'text-green-600' : 'text-orange-500'
                      }`}>
                        {patient.status || 'Pending'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleViewPatientDetails(patient)}
                      variant="outline"
                      size="sm"
                      className="w-full flex items-center justify-center"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Standalone Prescription Modal (only used when not integrated with parent) */}
      {!onAddPrescription && showPrescriptionModal && selectedPatient && (
        <AddPrescription 
          patientId={selectedPatient.id || selectedPatient._id || selectedPatient.uniqueId}
          patientName={selectedPatient.name}
          onClose={handleClosePrescriptionModal}
        />
      )}
    </div>
  );
}

export default RetirevePatient;