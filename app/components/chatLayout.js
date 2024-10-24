'use client';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import ChatPage from './chatPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEdit, faTrash } from '@fortawesome/free-solid-svg-icons'; // Import icons
import Image from 'next/image';  // Next.js Image component for optimization
import whiteLogoOnly from '../resources/whiteLogoOnly.png'; // Import the logo
import chatIcon from '../resources/chatIcon.png'; // Import the AI chat icon

const getChatsFromLocalStorage = () => {
  const chats = localStorage.getItem('tomoai-chats');
  return chats ? JSON.parse(chats) : {};
};

const saveChatsToLocalStorage = (chats) => {
  localStorage.setItem('tomoai-chats', JSON.stringify(chats));
};

export default function ChatLayout() {
  const [chats, setChats] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false); // State for dropdown
  const [editingChatId, setEditingChatId] = useState(null); // State to track which chat is being edited
  const [newChatName, setNewChatName] = useState(''); // Track new chat name
  const dropdownRef = useRef(null); // Reference to the dropdown
  const router = useRouter();

  // Handle logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/signin');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Load chats from localStorage on mount
  useEffect(() => {
    const storedChats = getChatsFromLocalStorage();
    setChats(storedChats);
  }, []);

  // Save chats to localStorage whenever they are updated
  useEffect(() => {
    saveChatsToLocalStorage(chats);
  }, [chats]);

  // Create a new chat
  const createNewChat = () => {
    const newChatId = `chat-${Date.now()}`;
    const newChats = {
      ...chats,
      [newChatId]: {
        title: `New Chat ${Object.keys(chats).length + 1}`,
        messages: [],
      },
    };
    setChats(newChats);
    setCurrentChatId(newChatId);
  };

  // Switch to an existing chat
  const switchChat = (chatId) => {
    setCurrentChatId(chatId);
  };

  // Function to update chat messages
  const updateChatMessages = (chatId, message) => {
    setChats(prevChats => {
      const updatedChat = {
        ...prevChats[chatId],
        messages: [...prevChats[chatId]?.messages || [], message],
      };
      return {
        ...prevChats,
        [chatId]: updatedChat,
      };
    });
  };

  // Edit chat name
  const handleEditChatName = (chatId) => {
    setEditingChatId(chatId);
    setNewChatName(chats[chatId].title);
  };

  // Save chat name
  const handleSaveChatName = (chatId) => {
    setChats(prevChats => ({
      ...prevChats,
      [chatId]: {
        ...prevChats[chatId],
        title: newChatName,
      },
    }));
    setEditingChatId(null); // Stop editing
  };

  // Delete a chat
  const handleDeleteChat = (chatId) => {
    const updatedChats = { ...chats };
    delete updatedChats[chatId];
    setChats(updatedChats);
    setCurrentChatId(null);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#091720' }}> {/* Darker sidebar background */}
      {/* Sidebar */}
      <div className="w-1/5 bg-gray-900 p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Spaces</h1>
          <button onClick={createNewChat} className="bg-gray-700 text-white px-5 py-1 rounded-xl">
            + New Space
          </button>
        </div>
        <div className="overflow-y-auto mb-4 ">
          {Object.keys(chats).length === 0 ? (
            <p className="text-gray-500">No chats available</p>
          ) : (
            Object.keys(chats).map((chatId) => (
              <div
                key={chatId}
                className={`cursor-pointer p-2 rounded-xl flex justify-between items-center ${currentChatId === chatId ? 'bg-gray-700' : 'bg-gray-900'}`}
              >
                {/* If chat is being edited, show input box */}
                {editingChatId === chatId ? (
                  <input
                    type="text"
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="flex-grow bg-gray-800 text-white p-2 rounded"
                    onBlur={() => handleSaveChatName(chatId)} // Save on blur
                  />
                ) : (
                  <span onClick={() => switchChat(chatId)} className="flex-grow">
                    {chats[chatId].title}
                  </span>
                )}
                {/* Edit icon */}
                <FontAwesomeIcon
                  icon={faEdit}
                  className="ml-2 text-gray-300 cursor-pointer"
                  onClick={() => handleEditChatName(chatId)}
                />
                {/* Delete icon */}
                <FontAwesomeIcon
                  icon={faTrash}
                  className="ml-2 text-gray-300 cursor-pointer delete-icon"
                  onClick={() => handleDeleteChat(chatId)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-4/5 p-4 flex flex-col relative">
        {/* Top Bar with Logo and Profile Icon */}
        <div className="bg-gray-800 bg-transparent p-4 rounded-t-lg flex justify-between items-center">
          {/* Logo */}
          <Image
            src={whiteLogoOnly}
            alt="TomoAI Logo"
            width={100}  // Adjust as necessary
            height={40}  // Adjust as necessary
            className="object-contain"
          />

          {/* Profile Icon */}
          <div className="relative" ref={dropdownRef}>
            <FontAwesomeIcon
              icon={faUser}
              className="text-white cursor-pointer"
              size="lg"
              onClick={() => setDropdownVisible(!dropdownVisible)}
            />
            {/* Dropdown Menu */}
            {dropdownVisible && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg z-10">
                <ul className="py-1">
                  <li className="px-4 py-2 text-gray-300 hover:bg-gray-600 cursor-pointer flex items-center">
                    <FontAwesomeIcon icon={faUser} className="mr-2" /> Profile
                  </li>
                  <hr className="border-t border-gray-600 my-1" />
                  <li onClick={handleLogout} className="px-4 py-2 text-gray-300 hover:bg-gray-600 cursor-pointer flex items-center">
                    <FontAwesomeIcon icon={faTrash} className="mr-2" /> Logout
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {currentChatId ? (
          <>
            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto no-scrollbar">
              {chats[currentChatId].messages.length === 0 ? (
                <p className="text-gray-500">No messages in this chat</p>
              ) : (
                chats[currentChatId].messages.map((msg, index) => (
                  <div key={index} className={`my-2 ${msg.role === 'user' ? 'text-right' : 'text-left flex items-center'}`}>
                    {msg.role === 'ai' && (
                      <Image
                        src={chatIcon} // Display the chat icon before the AI response
                        alt="AI Icon"
                        width={20} // Adjust icon size as necessary
                        height={20}
                        className="mr-2"
                      />
                    )}
                    <p className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-[#08141F] text-white' : 'text-white'}`}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="mt-4 flex justify-center">
              <div className="w-1/2">
                <ChatPage
                  currentChatId={currentChatId}
                  chats={chats}
                  updateChatMessages={updateChatMessages}
                  className="rounded-full bg-gray-800 px-4 py-2"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Hide scrollbar for the chat area */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none; /* For Firefox */
        }

        /* Make delete icon turn red on hover */
        .delete-icon:hover {
          color: red !important;
        }
      `}</style>
    </div>
  );
}
