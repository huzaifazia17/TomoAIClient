'use client';
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { auth } from "../firebase/config"; 
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import axios from 'axios'; 
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update Firebase profile with the user's full name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      // Save user details to MongoDB, including Firebase UID
      await axios.post(`${API_BASE_URL}api/users`, {  // Pointing to Express backend
        firebaseUid: user.uid, 
        firstName,
        lastName,
        email,
        role,
      });

      router.push('/');
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-center text-white">Sign Up</h1>

        <form onSubmit={handleSignUp} className="space-y-4">
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          
          <select value={role} onChange={(e) => setRole(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white"> 
            <option value="student">Student</option> 
            <option value="ta">Teaching Assistant</option> 
            <option value="professor">Professor</option>
          </select>
  
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
            Sign Up
          </button>
        </form>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default SignUp;