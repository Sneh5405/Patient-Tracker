import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import backgroundImage from './PatientTracker1.jpg';

function Signin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    
    if (!role) {
      setError("Please select your role");
      return;
    }
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:8000/auth/signin", { 
        email, 
        password, 
        role 
      });
      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", response.data.role);
      navigate(response.data.role === "patient" ? "/patient/dashboard" : "/doctor/dashboard");
    } catch (error) {
      console.error("Signin failed", error);
      setError(error.response?.data?.message || "Signin failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  } 

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-no-repeat" 
      style={{ backgroundImage: `url(${backgroundImage})` }}>
      
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black opacity-50 mix-blend-multiply pointer-events-none"></div>
      
      {/* Main content container */}
      <div className="relative z-10 w-full max-w-md px-6 py-8">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-xl shadow-2xl p-8 space-y-6">
          {/* Logo/Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-indigo-700 mb-2">Welcome Back</h1>
            <p className="text-gray-600">Sign in to access your account</p>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Form */}
          <form className="space-y-5" onSubmit={handleLogin}>
            {/* Role selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                I am a
              </label>
              <select
                id="role"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-black"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="" className="text-black">Select your role</option>
                <option value="patient" className="text-black">Patient</option>
                <option value="doctor" className="text-black">Doctor</option>
              </select>
            </div>
            
            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 text-black"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-200 pr-12 text-black"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <button
                  type="button"
                  className="text-sm text-gray-700 hover:text-gray-900"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>
            </div>
            
            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-200 ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
          
          {/* Sign up link */}
          <div className="text-center text-sm text-gray-700">
            Don't have an account?{' '}
            <button
              className="font-medium text-indigo-600 hover:text-indigo-500"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signin;