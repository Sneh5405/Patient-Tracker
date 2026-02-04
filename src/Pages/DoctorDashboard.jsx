import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import RetirevePatient from '../Components/RetirevePatient';
import AddPatient from '../Components/AddPatient';
import AddPrescription from '../Components/AddPrescription';
import AppointmentList from '../Components/AppointmentList';
import EnhancedChatInterface from '../Components/Chat/EnhancedChatInterface';
import ConciseMedicationTracker from '../components/ConciseMedicationTracker';
import {
  AreaChart,
  Bell,
  Calendar,
  FileText,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  User,
  Users,
  Plus,
  ListFilter,
  MessageSquare,
  ArrowLeft,
  PlusCircle,
  Clock,
  Trash2,
  AlertCircle,
  X,
  Stethoscope,
} from "lucide-react";

// Import shadcn components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

function DoctorDashboard({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'patients'); 
  const [doctorData, setDoctorData] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedChatPatient, setSelectedChatPatient] = useState(null);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);
  const [showConfirmRemoveModal, setShowConfirmRemoveModal] = useState(false);
  const [patientToRemove, setPatientToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [appointmentCounts, setAppointmentCounts] = useState({
    today: 0,
    upcoming: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [prescriptionToDelete, setPrescriptionToDelete] = useState(null);
  const [isDeletingPrescription, setIsDeletingPrescription] = useState(false);
  const [deletePrescriptionError, setDeletePrescriptionError] = useState(null);
  const [deletePrescriptionSuccess, setDeletePrescriptionSuccess] = useState(null);
  const navigate = useNavigate();

  const fetchDoctorData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }

      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      console.log('Decoded token:', decodedToken);
      setDoctorData(decodedToken);

      // Fetch patients
      const patientsResponse = await axios.get('http://localhost:8000/doctor/retrievePatients', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(patientsResponse.data);
      console.log('Patients loaded:', patientsResponse.data);

      // Fetch appointment counts
      const appointmentsResponse = await axios.get('http://localhost:8000/doctor/appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = appointmentsResponse.data.filter(
        appointment => {
          const appointmentDate = new Date(appointment.appointmentDate);
          return appointmentDate >= today && appointmentDate < tomorrow && appointment.status === 'scheduled';
        }
      );

      const upcomingAppointments = appointmentsResponse.data.filter(
        appointment => {
          const appointmentDate = new Date(appointment.appointmentDate);
          return appointmentDate >= tomorrow && appointment.status === 'scheduled';
        }
      );

      setAppointmentCounts({
        today: todayAppointments.length,
        upcoming: upcomingAppointments.length,
        total: appointmentsResponse.data.length
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching doctor data:', error);
      setError('Failed to load data. Please refresh and try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Function to handle patient selection for prescription
  const handleSelectPatientForPrescription = (patient) => {
    setSelectedPatient(patient);
    setShowPrescriptionModal(true);
  };

  // Function to close the prescription modal
  const handleClosePrescriptionModal = () => {
    setShowPrescriptionModal(false);
    setSelectedPatient(null);
  };

  // Function to handle viewing patient details
  const handleViewPatient = async (patientId) => {
    if (!patientId) {
      console.error('Patient ID is undefined or null');
      return;
    }
    
    try {
      setLoadingPrescriptions(true);
      
      // Find the selected patient using various ID properties
      const patient = patients.find(p => 
        (p._id && p._id === patientId) || 
        (p.id && p.id === patientId) || 
        (p.uniqueId && p.uniqueId === patientId)
      );
      
      if (patient) {
        setSelectedPatient(patient);
        setShowPatientDetails(true);
        setActiveTab('patient-details');
        
        // Fetch patient's prescriptions
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:8000/doctor/prescriptions/${patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setPatientPrescriptions(response.data);
      } else {
        console.error(`Patient with ID ${patientId} not found`);
      }
      
      setLoadingPrescriptions(false);
      setPrescriptionToDelete(null);
      setDeletePrescriptionError(null);
      setDeletePrescriptionSuccess(null);
    } catch (error) {
      console.error('Error fetching patient prescriptions:', error);
      setLoadingPrescriptions(false);
    }
  };

  // Function to handle contacting a patient
  const handleContactPatient = (patient) => {
    setSelectedChatPatient(patient);
    setActiveTab('messages');
  };

  // Function to handle patient removal
  const handleRemovePatient = (patient) => {
    setPatientToRemove(patient);
    setShowConfirmRemoveModal(true);
  };

  // Function to confirm patient removal
  const confirmRemovePatient = async () => {
    if (!patientToRemove) return;
    
    try {
      setIsRemoving(true);
      const token = localStorage.getItem('token');
      
      // Get the patient ID, handling different ID properties
      const patientId = patientToRemove._id || patientToRemove.id || patientToRemove.uniqueId;
      
      // Make API call to remove doctor-patient relationship
      await axios.post(
        'http://localhost:8000/doctor/remove-patient', 
        { patientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state to remove the patient
      setPatients(patients.filter(p => 
        (p._id !== patientId) && (p.id !== patientId) && (p.uniqueId !== patientId)
      ));
      
      // Close the confirmation modal
      setShowConfirmRemoveModal(false);
      setPatientToRemove(null);
      
      // If we're in the patient details view, go back to patients list
      if (activeTab === 'patient-details') {
        setShowPatientDetails(false);
        setActiveTab('patients');
      }
      
      setIsRemoving(false);
    } catch (error) {
      console.error('Error removing patient:', error);
      setIsRemoving(false);
      // Handle error as needed
    }
  };

  // Function to handle opening the delete prescription confirmation
  const handleDeletePrescription = (prescriptionId) => {
    setPrescriptionToDelete(prescriptionId);
    setDeletePrescriptionError(null);
    setDeletePrescriptionSuccess(null);
  };

  // Function to confirm and execute prescription deletion
  const confirmDeletePrescription = async () => {
    if (!prescriptionToDelete) return;

    setIsDeletingPrescription(true);
    setDeletePrescriptionError(null);
    setDeletePrescriptionSuccess(null);

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:8000/doctor/prescription/${prescriptionToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update local state to remove the prescription
      setPatientPrescriptions(prev => prev.filter(p => p.id !== prescriptionToDelete));
      setDeletePrescriptionSuccess('Prescription deleted successfully.');
      setPrescriptionToDelete(null);

    } catch (error) {
      console.error('Error deleting prescription:', error);
      setDeletePrescriptionError(error.response?.data?.message || 'Failed to delete prescription.');
    } finally {
      setIsDeletingPrescription(false);
    }
  };

  // Function to close the delete prescription dialog
  const closeDeletePrescriptionDialog = () => {
    setPrescriptionToDelete(null);
    setDeletePrescriptionError(null);
    setDeletePrescriptionSuccess(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{patients.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {patients.length > 0 ? `${patients.length} patients registered` : 'No patients yet'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appointmentCounts.today}</div>
                  <p className="text-xs text-muted-foreground">
                    {appointmentCounts.today > 0 ? `${appointmentCounts.today} appointments scheduled today` : 'No appointments today'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                  <AreaChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{appointmentCounts.upcoming}</div>
                  <p className="text-xs text-muted-foreground">
                    {appointmentCounts.upcoming > 0 ? `${appointmentCounts.upcoming} upcoming appointments` : 'No upcoming appointments'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
      case 'patients':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-6">Patient List</h2>
            
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                <p>{error}</p>
                <Button onClick={() => fetchDoctorData()} className="mt-2">
                  Try Again
                </Button>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Patients Found</h3>
                <p className="text-gray-500 mb-4">You haven't added any patients yet.</p>
                <Button onClick={() => setActiveTab('add-patient')}>
                  Add Your First Patient
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="py-3 px-4 text-left">Name</th>
                      <th className="py-3 px-4 text-left">Age</th>
                      <th className="py-3 px-4 text-left">Last Visit</th>
                      <th className="py-3 px-4 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient._id || patient.id || `patient-${patient.name}`} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">{patient.name}</td>
                        <td className="py-3 px-4">{patient.age}</td>
                        <td className="py-3 px-4">{patient.lastVisit ? new Date(patient.lastVisit).toLocaleDateString() : 'Never'}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleSelectPatientForPrescription(patient)}
                            className="text-blue-600 hover:text-blue-800 mr-2"
                          >
                            Add Prescription
                          </button>
                          <button
                            onClick={() => {
                              const patientId = patient._id || patient.id || patient.uniqueId;
                              if (patientId) {
                                handleViewPatient(patientId);
                              } else {
                                console.error('Patient has no ID');
                              }
                            }}
                            className="text-green-600 hover:text-green-800 mr-2"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => handleContactPatient(patient)}
                            className="text-purple-600 hover:text-purple-800 mr-2"
                          >
                            <MessageSquare className="h-4 w-4 inline mr-1" />
                            Contact
                          </button>
                          <button
                            onClick={() => handleRemovePatient(patient)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4 inline mr-1" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      case 'add-patient':
        return (
          <div className="p-6">
            <AddPatient />
          </div>
        );
      case 'add-prescription':
        return (
          <div className="p-6">
            {selectedPatient ? (
              <AddPrescription 
                patientId={selectedPatient._id || selectedPatient.id || selectedPatient.uniqueId}
                patientName={selectedPatient.name}
                onClose={() => setSelectedPatient(null)}
              />
            ) : (
              <div className="text-center p-8">
                <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Patient Selected</h3>
                <p className="text-gray-500 mb-4">Please select a patient from the Patients tab to create a prescription.</p>
                <Button onClick={() => setActiveTab('patients')} variant="outline">
                  Go to Patients List
                </Button>
              </div>
            )}
          </div>
        );
      case 'appointments':
        return (
          <div className="p-6">
            <AppointmentList userRole="doctor" />
          </div>
        );
      case 'messages':
        return (
          <div className="p-6 h-full">
            <EnhancedChatInterface 
              userRole="doctor" 
              initialSelectedPatient={selectedChatPatient}
              onPatientSelect={() => setSelectedChatPatient(null)}
            />
          </div>
        );
      case 'patient-details':
        return (
          <div className="p-6">
            {selectedPatient ? (
              <div>
                {/* Patient Header */}
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <button 
                        onClick={() => {
                          setShowPatientDetails(false);
                          setActiveTab('patients');
                        }}
                        className="flex items-center text-blue-600 hover:text-blue-800 mr-2"
                      >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Patients
                      </button>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">{selectedPatient.name}</h2>
                    <p className="text-gray-600 mb-1">{selectedPatient.email}</p>
                    <div className="flex flex-wrap gap-4 mt-3">
                      <div className="bg-gray-100 px-3 py-1 rounded text-gray-700">
                        Age: {selectedPatient.age || 'Not specified'}
                      </div>
                      {selectedPatient.phone && (
                        <div className="bg-gray-100 px-3 py-1 rounded text-gray-700">
                          Phone: {selectedPatient.phone}
                        </div>
                      )}
                      <div className="bg-gray-100 px-3 py-1 rounded text-gray-700">
                        Last Visit: {selectedPatient.lastVisit ? new Date(selectedPatient.lastVisit).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSelectPatientForPrescription(selectedPatient)}
                      className="bg-blue-500 hover:bg-blue-600 flex items-center"
                    >
                      <PlusCircle className="h-5 w-5 mr-2" />
                      Add Prescription
                    </Button>
                    <Button
                      onClick={() => handleContactPatient(selectedPatient)}
                      variant="outline"
                      className="flex items-center"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Contact Patient
                    </Button>
                    <Button
                      onClick={() => handleRemovePatient(selectedPatient)}
                      variant="destructive"
                      className="flex items-center"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove Patient
                    </Button>
                  </div>
                </div>
                
                {/* Prescription Deletion Messages */} 
                {deletePrescriptionError && (
                  <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300">
                    {deletePrescriptionError}
                  </div>
                )}
                {deletePrescriptionSuccess && (
                  <div className="mb-4 p-3 rounded bg-green-100 text-green-700 border border-green-300">
                    {deletePrescriptionSuccess}
                  </div>
                )}

                {/* Patient Prescriptions */}
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
                      {patientPrescriptions.map((prescription, index) => (
                        <div key={prescription.id || `prescription-${index}`} className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                          <div className="flex justify-between items-start mb-4 pb-3 border-b">
                            <div>
                              <div className="flex items-center text-gray-700 mb-1">
                                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                                <span className="font-medium">
                                  {new Date(prescription.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center text-gray-600 mb-1">
                                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                                <span>{new Date(prescription.date).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: 'numeric'
                                })}</span>
                              </div>
                              <div className="flex items-center text-gray-600">
                                <Stethoscope className="h-4 w-4 mr-2 text-gray-500" />
                                <span className="font-medium">Condition:</span> <span className="ml-1">{prescription.condition || 'General'}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 items-center">
                              <div className="bg-blue-50 px-2 py-1 rounded-full text-xs text-blue-600">
                                {prescription.medicines.length} medication{prescription.medicines.length !== 1 ? 's' : ''}
                              </div>
                              {/* Delete Prescription Button Trigger */} 
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:bg-red-100 h-7 w-7"
                                    onClick={() => handleDeletePrescription(prescription.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                {/* The content is rendered separately below */}
                              </AlertDialog>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {prescription.medicines.map((med, index) => (
                              <div key={med.id || `med-${index}`} className="bg-gray-50 p-3 rounded">
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

                {/* Medication Tracker Section */}
                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-green-600" />
                    Medication Adherence
                  </h3>
                  <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                    <ConciseMedicationTracker 
                      patientId={selectedPatient._id || selectedPatient.id || selectedPatient.uniqueId} 
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <div className="text-gray-500">No patient selected</div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="p-6 text-gray-700">
            Select a tab
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Doctor Dashboard</h1>
                <p className="text-gray-600">Manage your patients and appointments</p>
              </div>
              <div className="flex items-center mt-4 md:mt-0">
                <div className="bg-white rounded-lg shadow-sm p-2 flex items-center">
                  <div className="w-10 h-10 rounded-full bg-medical-green-light flex items-center justify-center mr-3">
                    <Users className="h-6 w-6 text-medical-green-dark" />
                  </div>
                  <div>
                    {doctorData && (
                      <>
                        <p className="font-medium text-gray-700">Dr. {doctorData.name}</p>
                        <p className="text-xs text-gray-500">{doctorData.specialization || 'Physician'}</p>
                      </>
                    )}
                    {!doctorData && (
                      <>
                        <p className="font-medium text-gray-700">Loading...</p>
                        <p className="text-xs text-gray-500">Please wait</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm mb-6 overflow-x-auto">
          <div className="flex">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 md:px-6 py-4 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'dashboard' 
                  ? 'text-medical-green border-b-2 border-medical-green bg-medical-green-light/20' 
                  : 'text-gray-500 hover:text-medical-green hover:bg-medical-green-light/10'
              } transition-colors duration-200`}
            >
              <ListFilter className="h-5 w-5 mr-2" />
              Dashboard
            </button>
            
            <button
              onClick={() => setActiveTab('patients')}
              className={`px-4 md:px-6 py-4 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'patients' 
                  ? 'text-medical-green border-b-2 border-medical-green bg-medical-green-light/20' 
                  : 'text-gray-500 hover:text-medical-green hover:bg-medical-green-light/10'
              } transition-colors duration-200`}
            >
              <Users className="h-5 w-5 mr-2" />
              My Patients
            </button>
            
            <button
              onClick={() => setActiveTab('add-patient')}
              className={`px-4 md:px-6 py-4 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'add-patient' 
                  ? 'text-medical-green border-b-2 border-medical-green bg-medical-green-light/20' 
                  : 'text-gray-500 hover:text-medical-green hover:bg-medical-green-light/10'
              } transition-colors duration-200`}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Patient
            </button>
            
            <button
              onClick={() => setActiveTab('appointments')}
              className={`px-4 md:px-6 py-4 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'appointments' 
                  ? 'text-medical-green border-b-2 border-medical-green bg-medical-green-light/20' 
                  : 'text-gray-500 hover:text-medical-green hover:bg-medical-green-light/10'
              } transition-colors duration-200`}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Appointments
            </button>
            
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 md:px-6 py-4 font-medium text-sm flex items-center whitespace-nowrap ${
                activeTab === 'messages' 
                  ? 'text-medical-green border-b-2 border-medical-green bg-medical-green-light/20' 
                  : 'text-gray-500 hover:text-medical-green hover:bg-medical-green-light/10'
              } transition-colors duration-200`}
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Messages
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <Card>
          {renderTabContent()}
        </Card>
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && selectedPatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-600">
                Add Prescription for {selectedPatient.name}
              </h3>
              <button 
                onClick={handleClosePrescriptionModal}
                className="text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <AddPrescription 
              patientId={selectedPatient._id || selectedPatient.id || selectedPatient.uniqueId} 
              patientName={selectedPatient.name}
              onClose={handleClosePrescriptionModal}
            />
          </div>
        </div>
      )}

      {/* Confirm Remove Patient Modal */}
      {showConfirmRemoveModal && patientToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-red-600 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Remove Patient
              </h3>
              <button 
                onClick={() => {
                  setShowConfirmRemoveModal(false);
                  setPatientToRemove(null);
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Are you sure you want to remove <span className="font-bold">{patientToRemove.name}</span> from your patient list?
              </p>
              <p className="text-gray-600 text-sm">
                This will remove the patient from your list, but their data will still be stored in the system.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmRemoveModal(false);
                  setPatientToRemove(null);
                }}
                disabled={isRemoving}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmRemovePatient}
                disabled={isRemoving}
                className="flex items-center"
              >
                {isRemoving ? (
                  <>
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Patient
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Prescription Confirmation Dialog */} 
      <AlertDialog open={!!prescriptionToDelete} onOpenChange={(open) => !open && closeDeletePrescriptionDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prescription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this prescription? This action cannot be undone.
              Deleting this prescription will also remove associated medication tracking data for the patient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletePrescriptionError && (
            <p className="text-sm text-red-600 mt-2">{deletePrescriptionError}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeletePrescriptionDialog} disabled={isDeletingPrescription}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeletePrescription} 
              disabled={isDeletingPrescription}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeletingPrescription ? 'Deleting...' : 'Delete Prescription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default DoctorDashboard;