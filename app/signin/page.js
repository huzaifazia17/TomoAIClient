'use client';
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { auth } from "../firebase/config";
import { signInWithEmailAndPassword } from "firebase/auth";

const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter(); 

  const handleSignIn = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/');
    } 
    catch (error) {
      setError(error.message);
    }
  };

  const redirectToSignUp = () => {
    router.push('/signup');
  };
  
  return (
    <div className="flex justify-center items-center h-screen bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-3xl font-bold mb-4 text-center text-white">Sign-In</h1>

        <form onSubmit={handleSignIn} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400" />
          
          <p className="text-center text-white my-4">
            If you do not have an account,{" "}

            <span onClick={redirectToSignUp} className="text-blue-500 cursor-pointer hover:underline">
              sign up here
            </span>.
          </p>

          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
            Sign In
          </button>
        </form>

        {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
      </div>
    </div>
  );
};

export default SignIn;
