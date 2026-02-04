import { useState, useEffect } from 'react';
import axios from 'axios';

function AddPrescription({ patientId, patientName, onClose }) {
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [validPatientId, setValidPatientId] = useState(null);
  const [condition, setCondition] = useState('General');

  // Common medical conditions
  const commonConditions = [
    'General',
    'Hypertension',
    'Diabetes',
    'Asthma',
    'Arthritis',
    'Common Cold',
    'Influenza',
    'Allergies',
    'Migraine',
    'Gastritis',
    'Anxiety',
    'Depression',
    'Insomnia',
    'GERD',
    'Urinary Tract Infection',
    'Other'
  ];

  // Debug log to check patientId and validate it
  useEffect(() => {
    console.log("Patient ID received:", patientId, typeof patientId);
    
    // Validate patientId and ensure it's in the correct format
    if (patientId) {
      const id = typeof patientId === 'string' ? patientId : String(patientId);
      setValidPatientId(id);
      console.log("Valid patient ID set:", id);
    } else {
      console.error("Invalid or missing patient ID");
      setMessage({ text: 'Patient ID is missing. Please try again later.', type: 'error' });
    }
  }, [patientId]);

  useEffect(() => {
    // Load medicines from API
    const fetchMedicines = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/medicines');
        setMedicines(response.data);
        setFilteredMedicines(response.data);
      } catch (error) {
        console.error('Error fetching medicines:', error);
        setMessage({ text: 'Failed to load medicines', type: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchMedicines();
  }, []);

  useEffect(() => {
    // Filter medicines based on search term
    if (search.trim() === '') {
      setFilteredMedicines(medicines);
    } else {
      const results = medicines.filter(med => 
        med.name.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredMedicines(results);
    }
  }, [search, medicines]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  const handleConditionChange = (e) => {
    setCondition(e.target.value);
  };

  const handleAddMedicine = (medicine) => {
    setSelectedMedicines([...selectedMedicines, {
      ...medicine,
      dosage: '1',
      timing: {
        morning: false,
        afternoon: false,
        evening: false
      },
      instructions: 'after_food',
      duration: '7 days'
    }]);
  };

  const handleRemoveMedicine = (index) => {
    const newList = [...selectedMedicines];
    newList.splice(index, 1);
    setSelectedMedicines(newList);
  };

  const handleMedicineChange = (index, field, value) => {
    const updatedMedicines = selectedMedicines.map((med, i) => {
      if (i === index) {
        if (field.startsWith('timing.')) {
          const timingKey = field.split('.')[1];
          return {
            ...med,
            timing: {
              ...med.timing,
              [timingKey]: value
            }
          };
        }
        return { ...med, [field]: value };
      }
      return med;
    });

    setSelectedMedicines(updatedMedicines);
  };

  const handleCloseModal = (e) => {
    // Prevent event from bubbling up
    if (e) {
      e.stopPropagation();
    }
    // Call the onClose prop
    if (onClose) onClose();
  };

  const handleSubmit = async () => {
    if (selectedMedicines.length === 0) {
      setMessage({ text: 'Please add at least one medicine', type: 'error' });
      return;
    }
    
    if (!validPatientId) {
      setMessage({ text: 'Patient ID is missing or invalid. Please try again.', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Make sure we're formatting the medicines data correctly
      const medicinesPayload = selectedMedicines.map(med => ({
        id: med.id,
        name: med.name,
        dosage: med.dosage,
        timing: med.timing,
        instructions: med.instructions,
        duration: med.duration,
        composition1: med.composition1 || '',
        composition2: med.composition2 || ''
      }));
      
      console.log("Sending request with patient ID:", validPatientId);
      
      const response = await axios.post(
        'http://localhost:8000/doctor/prescription',
        {
          patientId: validPatientId,
          medicines: medicinesPayload,
          condition: condition
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessage({ text: 'Prescription added successfully', type: 'success' });
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding prescription:', error);
      setMessage({ 
        text: error.response?.data?.message || 'Failed to add prescription', 
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-auto z-50" onClick={handleCloseModal}>
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-4xl max-h-screen overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">
            Add Prescription for {patientName || 'Patient'}
          </h2>
          <button 
            onClick={handleCloseModal}
            className="text-gray-500 hover:text-gray-800"
            type="button"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        {!validPatientId && (
          <div className="p-4 mb-4 rounded bg-red-100 text-red-700 border border-red-300">
            <strong>Patient ID is missing.</strong> This is likely a system error. Please try:
            <ul className="list-disc ml-5 mt-2">
              <li>Closing this modal and selecting the patient again</li>
              <li>Refreshing the page and trying again</li>
            </ul>
          </div>
        )}

        {message.text && (
          <div className={`p-4 mb-4 rounded ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="p-4 mb-6 border-2 border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">Medical Condition</h3>
          <div className="mb-2">
            <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-1">
              Select the condition being treated with this prescription
            </label>
            <select
              id="condition"
              name="condition"
              value={condition}
              onChange={handleConditionChange}
              className="w-full border-2 border-blue-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              {commonConditions.map(cond => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
            {condition === 'Other' && (
              <input
                type="text"
                placeholder="Specify condition"
                className="w-full mt-2 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                onChange={(e) => setCondition(e.target.value)}
              />
            )}
          </div>
          <p className="text-sm text-blue-600">This condition will be associated with the prescription and visible to the patient</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left column: Medicine search and list */}
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-3 text-black">Search Medicines</h3>
            
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search medicine by name..."
                value={search}
                onChange={handleSearchChange}
                className="w-full px-3 py-2 border rounded text-black"
              />
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading medicines...</div>
              ) : filteredMedicines.length > 0 ? (
                <ul className="divide-y">
                  {filteredMedicines.slice(0, 50).map((med) => (
                    <li key={med.id} className="p-3 hover:bg-gray-50 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-black">{med.name}</div>
                        <div className="text-sm text-gray-500">
                          {med.composition1} {med.composition2}
                        </div>
                        <div className="text-sm text-gray-600">₹{med.price}</div>
                      </div>
                      <button
                        onClick={() => handleAddMedicine(med)}
                        className="bg-blue-100 text-blue-600 px-3 py-1 rounded hover:bg-blue-200"
                        type="button"
                      >
                        Add
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-gray-500">No medicines found</div>
              )}
            </div>
          </div>

          {/* Right column: Selected medications and prescription details */}
          <div className="border rounded p-4">
            <h3 className="font-semibold mb-3 text-black">Prescription Details</h3>
            
            {selectedMedicines.length === 0 ? (
              <div className="p-4 text-center text-gray-500 border rounded mb-4">
                No medicines added to prescription yet. Search and add medicines from the left panel.
              </div>
            ) : (
              <ul className="mb-4 divide-y border rounded">
                {selectedMedicines.map((med, index) => (
                  <li key={`${med.id}-${index}`} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-black">{med.name}</div>
                      <button
                        onClick={() => handleRemoveMedicine(index)}
                        className="text-red-500 hover:text-red-700"
                        type="button"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-3">
                      {med.composition1} {med.composition2}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dosage
                        </label>
                        <select
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(index, 'dosage', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-black"
                        >
                          <option value="0.5">1/2 tablet/capsule</option>
                          <option value="1">1 tablet/capsule</option>
                          <option value="2">2 tablets/capsules</option>
                          <option value="5ml">5ml (liquid)</option>
                          <option value="10ml">10ml (liquid)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duration
                        </label>
                        <select
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(index, 'duration', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-black"
                        >
                          <option value="3 days">3 days</option>
                          <option value="5 days">5 days</option>
                          <option value="7 days">7 days</option>
                          <option value="10 days">10 days</option>
                          <option value="15 days">15 days</option>
                          <option value="30 days">30 days</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Timing
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={med.timing.morning}
                            onChange={(e) => handleMedicineChange(index, 'timing.morning', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-sm text-black">Morning</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={med.timing.afternoon}
                            onChange={(e) => handleMedicineChange(index, 'timing.afternoon', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-sm text-black">Afternoon</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={med.timing.evening}
                            onChange={(e) => handleMedicineChange(index, 'timing.evening', e.target.checked)}
                            className="mr-1"
                          />
                          <span className="text-sm text-black">Evening</span>
                        </label>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Instructions
                      </label>
                      <select
                        value={med.instructions}
                        onChange={(e) => handleMedicineChange(index, 'instructions', e.target.value)}
                        className="w-full border rounded px-2 py-1 text-black"
                      >
                        <option value="before_food">Before food</option>
                        <option value="after_food">After food</option>
                        <option value="with_food">With food</option>
                        <option value="empty_stomach">Empty stomach</option>
                        <option value="as_needed">As needed</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            <button
              onClick={handleSubmit}
              disabled={loading || selectedMedicines.length === 0}
              className={`w-full py-2 rounded font-medium text-white ${
                loading || selectedMedicines.length === 0 ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
              }`}
              type="button"
            >
              {loading ? 'Processing...' : 'Submit Prescription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddPrescription;
