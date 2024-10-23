'use client'; 
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation'; 
import { auth } from '../firebase/config'; 
import { onAuthStateChanged } from 'firebase/auth';

const AuthWrapper = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const currentPath = usePathname();  

  // Handle authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
      setLoading(false);  // Loading is complete after this callback is called
    });

    return () => unsubscribe();
  }, []);

  // Handle redirection after loading completes
  useEffect(() => {
    if (!loading && !authenticated && currentPath !== '/signin' && currentPath !== '/signup') {
      router.push('/signin');
    }
  }, [loading, authenticated, currentPath, router]);

  if (loading) {
    return <div>Loading...</div>;  // Show a loading screen while checking authentication state
  }

  // Allow access to sign-in and sign-up pages if not authenticated
  if (!authenticated && (currentPath === '/signin' || currentPath === '/signup')) {
    return <>{children}</>;  // Render the sign-in or sign-up pages if on these paths
  }

  //do not let user access pages if not authenticated (other than /signin or /signup)
  if (!authenticated) {
    return null;
  }

  return <>{children}</>;
};

export default AuthWrapper;