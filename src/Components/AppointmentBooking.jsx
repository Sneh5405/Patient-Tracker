import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Calendar, Clock, User, FileText } from 'lucide-react';

function AppointmentBooking() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch the list of doctors assigned to the patient
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Decode the token to get patient data
        const decoded = JSON.parse(atob(token.split('.')[1]));
        
        if (decoded.role !== 'patient') {
          setError('Only patients can book appointments');
          return;
        }

        // Get the patient's doctors instead of trying to get patients assigned to the patient
        const response = await axios.get(`http://localhost:8000/doctor/doctors`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        // Filter only the doctors that are assigned to this patient
        const patientRecord = response.data.find(p => p.id === parseInt(decoded.id, 10));
        if (patientRecord && patientRecord.doctors) {
          setDoctors(patientRecord.doctors);
        } else {
          setDoctors([]);
        }
      } catch (error) {
        console.error('Error fetching doctors:', error);
        setError('Failed to load your doctors. Please try again later.');
      }
    };

    fetchDoctors();
  }, []);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDoctor || !selectedDate) return;
      
      try {
        setIsLoading(true);
        const response = await axios.get(`http://localhost:8000/appointments/available-slots?doctorId=${selectedDoctor}&date=${selectedDate}`);
        setAvailableSlots(response.data.availableSlots);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching available slots:', error);
        setError('Failed to load available time slots. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDoctor, selectedDate]);

  const handleDoctorChange = (e) => {
    setSelectedDoctor(e.target.value);
    setSelectedSlot('');
    setAvailableSlots([]);
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setSelectedSlot('');
    setAvailableSlots([]);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDoctor || !selectedSlot || !purpose) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.post('http://localhost:8000/appointments', {
        doctorId: selectedDoctor,
        appointmentDate: selectedSlot,
        purpose
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccessMessage('Appointment booked successfully!');
      setIsLoading(false);
      
      // Reset form
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedSlot('');
      setPurpose('');
      setAvailableSlots([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error booking appointment:', error);
      setError(error.response?.data?.error || 'Failed to book appointment. Please try again later.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm text-black">
      <h2 className="text-2xl font-semibold mb-6">Book an Appointment</h2>
      
      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 text-green-800 p-3 rounded-md mb-4">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 flex items-center text-black">
            <User className="w-4 h-4 mr-2" />
            Select Doctor
          </label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            value={selectedDoctor}
            onChange={handleDoctorChange}
            required
          >
            <option value="">Select a doctor</option>
            {doctors.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.name} - {doctor.specialization}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1 flex items-center text-black">
            <Calendar className="w-4 h-4 mr-2" />
            Select Date
          </label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            value={selectedDate}
            onChange={handleDateChange}
            min={format(new Date(), 'yyyy-MM-dd')}
            required
          />
        </div>
        
        {isLoading && <p className="text-gray-500">Loading available slots...</p>}
        
        {availableSlots.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 flex items-center text-black">
              <Clock className="w-4 h-4 mr-2" />
              Available Time Slots
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  className={`p-2 rounded-md text-center ${
                    selectedSlot === slot.time
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-black border border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => handleSlotSelect(slot.time)}
                >
                  {slot.formattedTime}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {availableSlots.length === 0 && selectedDate && selectedDoctor && !isLoading && (
          <p className="text-gray-500 mb-4">No available slots for this date. Please select another date.</p>
        )}
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1 flex items-center text-black">
            <FileText className="w-4 h-4 mr-2" />
            Appointment Purpose
          </label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-black"
            rows="3"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Briefly describe the reason for this appointment"
            required
          />
        </div>
        
        <button
          type="submit"
          className={`w-full p-2 rounded-md ${
            isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          } text-white font-medium`}
          disabled={isLoading || !selectedDoctor || !selectedSlot || !purpose}
        >
          {isLoading ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
}

export default AppointmentBooking; 