import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "../firebase/config";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faArrowLeft, 
  faUser, 
  faChalkboardTeacher, 
  faUserGraduate, 
  faEnvelope, 
  faIdCard,
  faUserTie
} from "@fortawesome/free-solid-svg-icons";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const ProfilePage = ({ setCurrentSpaceId, setCurrentChatId, setShowProfilePage, currentSpaceId, currentChatId }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // When component mounts, save the current state for later use
  useEffect(() => {
    if (currentSpaceId || currentChatId) {
      const currentState = {
        spaceId: currentSpaceId,
        chatId: currentChatId
      };
      sessionStorage.setItem("lastChatState", JSON.stringify(currentState));
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}api/users/${currentUser.uid}`
          );
          setUserData(response.data);
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  // Get role icon based on user role
  const getRoleIcon = (role) => {
    switch(role?.toLowerCase()) {
      case 'professor':
        return faChalkboardTeacher;
      case 'ta':
        return faUserTie;
      case 'student':
        return faUserGraduate;
      default:
        return faUser;
    }
  };

  // Get role color based on user role
  const getRoleColor = (role) => {
    switch(role?.toLowerCase()) {
      case 'professor':
        return 'text-purple-400';
      case 'ta':
        return 'text-blue-400';
      case 'student':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  // Handle going back to the last chat or space
  const handleGoBack = () => {
    // First close the profile page
    setShowProfilePage(false);
    
    // If we already have currentSpaceId/currentChatId in props, use those
    if (currentSpaceId || currentChatId) {
      // We're already set up to return to the correct space
      return;
    }
    
    // Otherwise, try to get state from sessionStorage as fallback
    try {
      const lastChatStateString = sessionStorage.getItem("lastChatState");
      if (lastChatStateString) {
        const lastChatState = JSON.parse(lastChatStateString);
        if (lastChatState.spaceId) {
          setCurrentSpaceId(lastChatState.spaceId);
        }
        if (lastChatState.chatId) {
          setCurrentChatId(lastChatState.chatId);
        }
      }
    } catch (error) {
      console.error("Error retrieving last chat state:", error);
    }
  };
  

  return (
    <div className="flex justify-center items-center min-h-screen bg-[var(--background)] relative">
      {/* Back Button */}
      <button
        onClick={handleGoBack}
        className="absolute top-6 left-6 bg-[var(--secondary-bg)] hover:bg-[var(--hover-bg)] p-3 rounded-full shadow-md transition-all duration-200"
        aria-label="Go back"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="text-[var(--foreground)] text-lg" />
      </button>

      <div className="w-full max-w-2xl bg-[var(--secondary-bg)] p-8 rounded-2xl shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--foreground)]"></div>
            <p className="mt-4 text-[var(--foreground-muted)]">Loading profile...</p>
          </div>
        ) : userData ? (
          <div>
            {/* Profile Header */}
            <div className="flex items-center mb-6">
              <div className="relative mr-6">
                <div className="h-20 w-20 rounded-full bg-[var(--accent-bg)] flex items-center justify-center">
                  <FontAwesomeIcon 
                    icon={getRoleIcon(userData.role)} 
                    className={`text-3xl ${getRoleColor(userData.role)}`} 
                  />
                </div>
                <div className={`absolute -bottom-1 right-0 h-7 w-7 rounded-full ${getRoleColor(userData.role)} bg-[var(--secondary-bg)] flex items-center justify-center border-2 border-[var(--secondary-bg)]`}>
                  <FontAwesomeIcon 
                    icon={getRoleIcon(userData.role)} 
                    className="text-xs text-[var(--secondary-bg)]" 
                  />
                </div>
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-[var(--foreground)]">
                  Profile
                </h1>
                <p className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(userData.role)} bg-opacity-20 bg-[var(--accent-bg)] mt-1`}>
                  {userData.role?.charAt(0).toUpperCase() + userData.role?.slice(1)}
                </p>
              </div>
            </div>

            {/* Profile Info Cards - Vertical layout with wider cards */}
            <div className="bg-[var(--background)] rounded-xl p-5 shadow-inner">
              <div className="space-y-4">
                <div className="flex items-center p-3 rounded-lg bg-[var(--secondary-bg)] shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mr-4">
                    <FontAwesomeIcon icon={faIdCard} className="text-[var(--foreground-muted)]" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground-muted)]">
                      First Name
                    </span>
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {userData.firstName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center p-3 rounded-lg bg-[var(--secondary-bg)] shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mr-4">
                    <FontAwesomeIcon icon={faIdCard} className="text-[var(--foreground-muted)]" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[var(--foreground-muted)]">
                      Last Name
                    </span>
                    <p className="text-lg font-semibold text-[var(--foreground)]">
                      {userData.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center p-3 rounded-lg bg-[var(--secondary-bg)] shadow-sm">
                  <div className="h-10 w-10 rounded-full bg-[var(--accent-bg)] flex items-center justify-center mr-4">
                    <FontAwesomeIcon icon={faEnvelope} className="text-[var(--foreground-muted)]" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[var(--foreground-muted)]">
                      Email
                    </span>
                    <p className="text-lg font-semibold text-[var(--foreground)] break-all">
                      {userData.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48">
            <FontAwesomeIcon icon={faUser} className="text-4xl text-red-500 mb-4" />
            <p className="text-center text-red-500">User data not found</p>
            <button 
              onClick={handleGoBack}
              className="mt-4 px-4 py-2 bg-[var(--accent-bg)] text-white rounded-lg hover:bg-opacity-90 transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;