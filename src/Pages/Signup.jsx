import React from "react";
import { useState } from "react";
import { useNavigate, Link } from 'react-router-dom';
import axios from "axios";

function Signup() {
    const [role, setRole] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [specialization, setSpecialization] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    async function handleClick(e) {
        e.preventDefault();
        setError('');
        
        // Basic validation
        if (!role) {
            setError('Please select a role');
            return;
        }
        
        if (!name || !email || !password) {
            setError('Please fill in all required fields');
            return;
        }
        
        if (role === 'patient' && (!age || !gender)) {
            setError('Please fill in all patient details');
            return;
        }
        
        if (role === 'doctor' && !specialization) {
            setError('Please enter your specialization');
            return;
        }

        setIsLoading(true);
        
        try {
            if (role === 'patient') {
                const response = await axios.post('http://localhost:8000/auth/signup', {
                    role: role,
                    name: name,
                    email: email,
                    password: password,
                    age: age,
                    gender: gender,
                });
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('role', response.data.role);
                navigate('/patient/dashboard');
            } else if (role === 'doctor') {
                const response = await axios.post('http://localhost:8000/auth/signup', {
                    role: role,
                    name: name,
                    email: email,
                    password: password,
                    specialization: specialization,
                });
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('role', response.data.role);
                navigate('/doctor/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-md overflow-hidden p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Create an Account</h1>
                    <p className="text-gray-600 mt-2">
                        {role ? `Register as a ${role}` : 'Select your role to continue'}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleClick}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="role">
                            I am a*
                        </label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-black"
                            required
                        >
                            <option value="" className="text-gray-400">Select Role</option>
                            <option value="patient" className="text-black">Patient</option>
                            <option value="doctor" className="text-black">Doctor</option>
                        </select>
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="name">
                            Full Name*
                        </label>
                        <input
                            id="name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-black"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="email">
                            Email Address*
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-black"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="password">
                            Password*
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-black"
                            required
                            minLength="6"
                        />
                    </div>

                    {role === 'patient' && (
                        <>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="age">
                                    Age*
                                </label>
                                <input
                                    id="age"
                                    type="number"
                                    placeholder="30"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-black"
                                    min="1"
                                    max="120"
                                    required
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="gender">
                                    Gender*
                                </label>
                                <select
                                    id="gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-black"
                                    required
                                >
                                    <option value="" className="text-gray-400">Select Gender</option>
                                    <option value="male" className="text-black">Male</option>
                                    <option value="female" className="text-black">Female</option>
                                    <option value="other" className="text-black">Other</option>
                                    <option value="prefer-not-to-say" className="text-black">Prefer not to say</option>
                                </select>
                            </div>
                        </>
                    )}

                    {role === 'doctor' && (
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="specialization">
                                Specialization*
                            </label>
                            <input
                                id="specialization"
                                type="text"
                                placeholder="Cardiology, Neurology, etc."
                                value={specialization}
                                onChange={(e) => setSpecialization(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-black"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-700 text-sm">
                        Already have an account?{' '}
                        <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default Signup;