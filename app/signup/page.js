'use client';
import { useState } from "react";
import { auth } from "../firebase/config"; 
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const SignUp = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("student");
  const [error, setError] = useState(null);

  const handleSignUp = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`,
      });

      alert("User created successfully!");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign Up</h1>

        <form onSubmit={handleSignUp} className="space-y-4">
          <input type="text" placeholder="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" />
          <input type="text" placeholder="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" />
          
          <select value={role} onChange={(e) => setRole(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg"> 
            <option value="student">Student</option> 
            <option value="ta">Teaching Assistant</option> 
            <option value="professor">Professor</option>
          </select>

          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" />
          <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600">Sign Up</button>
        </form>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default SignUp;
