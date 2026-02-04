import { useState, useEffect } from 'react';
import axios from 'axios';

function AddPatient({ formInputs = null, onInputChange = null }) {
  // Use local state if no external state is provided
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    gender: 'male' // Default value
  });
  const [allPatients, setAllPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [mode, setMode] = useState('new'); // 'new' or 'existing'
  const [selectedPatientId, setSelectedPatientId] = useState('');

  async function getPatients(){
    const response = await axios.get('http://localhost:8000/doctor/doctors');
    setAllPatients(response.data);
  }
  
  // If external state management is provided, sync with it
  useEffect(() => {
    if (formInputs) {
      setFormData(prev => ({
        ...prev,
        ...formInputs
      }));
    }
    getPatients();
  }, [formInputs]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Update local state
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If external onChange handler is provided, call it
    if (onInputChange) {
      onInputChange(e);
    }
  };

  const handlePatientSelect = (e) => {
    const patientId = e.target.value;
    setSelectedPatientId(patientId);
    
    // Optionally, you can find the patient and populate the form data
    const selectedPatient = allPatients.find(p => p._id === patientId);
    if (selectedPatient) {
      setFormData({
        name: selectedPatient.name || '',
        email: selectedPatient.email || '',
        age: selectedPatient.age || '',
        gender: selectedPatient.gender || 'male'
      });
    }
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    
    try {
      const token = localStorage.getItem('token');
      
      if (mode === 'new') {
        // Creating a new patient
        await axios.post(
          'http://localhost:8000/doctor/add-patient', 
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        setMessage({
          text: `Patient ${formData.name} added successfully! An invitation email has been sent.`,
          type: 'success'
        });
      } else {
        // Adding an existing patient
        await axios.post(
          'http://localhost:8000/doctor/assign-patient', 
          { patientId: selectedPatientId },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        setMessage({
          text: `Existing patient assigned successfully!`,
          type: 'success'
        });
      }
      
      // Reset form after successful submission
      setFormData({
        name: '',
        email: '',
        age: '',
        gender: 'male'
      });
      setSelectedPatientId('');
      
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Failed to add patient',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-6 text-center text-black">Add Patient</h2>
      
      {message.text && (
        <div className={`p-4 mb-4 rounded ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex justify-center space-x-4">
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="patientMode"
              value="new"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-black">Create New Patient</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="radio"
              name="patientMode"
              value="existing"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
              className="form-radio h-4 w-4 text-blue-600"
            />
            <span className="ml-2 text-black">Add Existing Patient</span>
          </label>
        </div>
      </div>
      
      {mode === 'existing' ? (
        <div className="mb-4">
          <label htmlFor="existingPatient" className="block text-gray-700 font-medium mb-2">Select Existing Patient</label>
          <select
            id="existingPatient"
            name="existingPatient"
            value={selectedPatientId}
            onChange={handlePatientSelect}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            required
          >
            <option value="">-- Select a patient --</option>
            {allPatients.map(patient => (
              <option key={patient._id} value={patient._id}>
                {patient.name} ({patient.email})
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label htmlFor="name" className="block text-gray-700 font-medium mb-2">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter patient's full name"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 font-medium mb-2">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="patient@example.com"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="age" className="block text-gray-700 font-medium mb-2">Age</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Enter age"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2">Gender</label>
            <div className="flex space-x-4">
              {[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
              ].map(option => (
                <label key={`gender-${option.value}`} className="inline-flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value={option.value}
                    checked={formData.gender === option.value}
                    onChange={handleChange}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-black">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
      
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full py-2 px-4 rounded font-medium text-white ${
          loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? 'Processing...' : mode === 'new' ? 'Add New Patient' : 'Assign Existing Patient'}
      </button>
    </div>
  );
}

export default AddPatient;
