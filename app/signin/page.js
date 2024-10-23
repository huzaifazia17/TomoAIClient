'use client';
import { useState } from "react";
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("User logged in successfully!");
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign-In</h1>

        <form onSubmit={handleSignIn} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg" />
          <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600">Sign In</button>
        </form>
        
        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default SignIn;
