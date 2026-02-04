import { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function AppointmentList({ userRole }) {
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('upcoming');

  useEffect(() => {
    fetchAppointments();
  }, [userRole, statusFilter, dateFilter]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const endpoint = userRole === 'doctor' 
        ? `http://localhost:8000/doctor/appointments` 
        : `http://localhost:8000/patient/appointments`;
      
      let queryParams = '';
      if (statusFilter !== 'all') {
        queryParams += `status=${statusFilter}`;
      }
      
      if (dateFilter === 'today') {
        const today = format(new Date(), 'yyyy-MM-dd');
        queryParams += queryParams ? `&date=${today}` : `date=${today}`;
      }
      
      const url = queryParams ? `${endpoint}?${queryParams}` : endpoint;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter appointments based on date criteria
      let filteredAppointments = response.data;
      
      if (dateFilter === 'upcoming') {
        const now = new Date();
        filteredAppointments = filteredAppointments.filter(
          appointment => new Date(appointment.appointmentDate) > now
        );
      } else if (dateFilter === 'past') {
        const now = new Date();
        filteredAppointments = filteredAppointments.filter(
          appointment => new Date(appointment.appointmentDate) < now
        );
      }
      
      setAppointments(filteredAppointments);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError('Failed to load appointments. Please try again later.');
      setIsLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:8000/appointments/update-status', {
        appointmentId,
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update the local state
      setAppointments(appointments.map(appointment => 
        appointment.id === appointmentId 
          ? { ...appointment, status: newStatus } 
          : appointment
      ));
    } catch (error) {
      console.error('Error updating appointment status:', error);
      setError('Failed to update appointment status. Please try again later.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'scheduled':
        return 'text-blue-600';
      case 'cancelled':
        return 'text-red-600';
      case 'missed':
        return 'text-amber-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'scheduled':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'missed':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const renderAppointmentActions = (appointment) => {
    if (userRole === 'doctor' && appointment.status === 'scheduled') {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
            className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
          >
            Complete
          </button>
          <button
            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
            className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
          >
            Cancel
          </button>
        </div>
      );
    }
    
    if (appointment.status === 'scheduled') {
      return (
        <button
          onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
          className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
        >
          Cancel
        </button>
      );
    }
    
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm text-black">
      <h2 className="text-2xl font-semibold mb-6">Your Appointments</h2>
      
      {error && (
        <div className="bg-red-50 text-red-800 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center">
          <label className="mr-2 text-sm font-medium">Status:</label>
          <select
            className="p-2 border border-gray-300 rounded-md text-sm bg-white text-black"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="missed">Missed</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <label className="mr-2 text-sm font-medium">Date:</label>
          <select
            className="p-2 border border-gray-300 rounded-md text-sm bg-white text-black"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="upcoming">Upcoming</option>
            <option value="today">Today</option>
            <option value="past">Past</option>
          </select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center p-4">
          <p className="text-black">Loading appointments...</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center p-8 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const appointmentDate = new Date(appointment.appointmentDate);
            const personInfo = userRole === 'doctor' ? appointment.patient : appointment.doctor;
            
            return (
              <div key={appointment.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 bg-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-black">
                      {userRole === 'doctor' ? 'Patient:' : 'Doctor:'} {personInfo?.name}
                    </h3>
                    
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>
                        {format(appointmentDate, 'MMMM d, yyyy')} at {format(appointmentDate, 'h:mm a')}
                      </span>
                    </div>
                    
                    {appointment.purpose && (
                      <p className="mt-2 text-sm text-gray-700">
                        <span className="font-medium">Purpose:</span> {appointment.purpose}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center">
                    {getStatusIcon(appointment.status)}
                    <span className={`ml-1 text-sm font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-end">
                  {renderAppointmentActions(appointment)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AppointmentList; 