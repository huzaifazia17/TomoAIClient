'use client';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import ChatPage from './chatPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEdit, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import logo from '../resources/logo.png';
import chatIcon from '../resources/chatIcon.png';
import whiteLogoOnly from '../resources/whiteLogoOnly.png';
import SpacePage from './spacePage';
import StudentSpaceManagement from './StudentSpaceManagement';


const saveSpacesToLocalStorage = (spaces) => {
  localStorage.setItem('tomoai-spaces', JSON.stringify(spaces));
};

export default function ChatLayout() {
  const [spaces, setSpaces] = useState({});
  const [currentSpaceId, setCurrentSpaceId] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [editingSpaceId, setEditingSpaceId] = useState(null);
  const [newSpaceName, setNewSpaceName] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [newChatName, setNewChatName] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [userFirebaseUid, setUserFirebaseUid] = useState(null);

  // Initialize a variable to track the highest space number
  let highestSpaceNumber = 0;

  // Get the current user's firebaseUid
  useEffect(() => {
    const fetchFirebaseUid = () => {
      const user = auth.currentUser;
      if (user) {
        setUserFirebaseUid(user.uid);
      } else {
        router.push('/signin');
      }
    };

    fetchFirebaseUid();
  }, [router]);


  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const response = await fetch(`http://localhost:3009/api/users/${user.uid}`);
          const data = await response.json();
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/signin');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };


  const handleEditSpaceName = (spaceId) => {
    setEditingSpaceId(spaceId);
    setNewSpaceName(spaces[spaceId].title);
  };

  const handleDeleteSpace = async (spaceId) => {
    try {
      const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to delete space');
      }

      // Remove the space from the state
      setSpaces((prevSpaces) => {
        const updatedSpaces = { ...prevSpaces };
        delete updatedSpaces[spaceId];
        return updatedSpaces;
      });

      // Reset current space and chat if the deleted space was active
      if (currentSpaceId === spaceId) {
        setCurrentSpaceId(null);
        setCurrentChatId(null);
      }
    } catch (error) {
      console.error('Error deleting space:', error);
    }
  };

  useEffect(() => {
    const fetchSpacesFromDatabase = async () => {
      try {
        const firebaseUid = auth.currentUser?.uid;
        if (!firebaseUid) {
          console.error("No user is logged in.");
          return;
        }

        // Create a unique space ID for the Personal Assistant space
        const PERSONAL_ASSISTANT_SPACE_ID = `personal-assistant-space-${firebaseUid}`;

        // Fetch all spaces for the current user
        const response = await fetch(`http://localhost:3009/api/spaces?firebaseUid=${firebaseUid}`);
        if (!response.ok) throw new Error("Failed to fetch spaces");

        const { spaces: spacesData } = await response.json();
        console.log("Fetched spaces data:", spacesData);

        if (!Array.isArray(spacesData)) {
          throw new Error("Invalid data format: Expected an array of spaces");
        }

        // Transform spacesData into the format used in the state
        let spacesObj = spacesData.reduce((acc, space) => {
          acc[space.spaceId] = { title: space.spaceName, chats: {} };
          return acc;
        }, {});

        // Check if the "Personal Assistant" space exists using the unique space ID
        if (!spacesObj[PERSONAL_ASSISTANT_SPACE_ID]) {
          // If the "Personal Assistant" space does not exist, create it
          const defaultSpace = {
            firebaseUid,
            spaceId: PERSONAL_ASSISTANT_SPACE_ID,
            spaceName: "Personal Assistant",
            users: [firebaseUid],
          };

          // Add the default space to the database
          const createResponse = await fetch("http://localhost:3009/api/spaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(defaultSpace),
          });

          if (!createResponse.ok) {
            throw new Error("Failed to create default space");
          }

          // Add the newly created default space to the state
          spacesObj[PERSONAL_ASSISTANT_SPACE_ID] = {
            title: "Personal Assistant",
            chats: {
              "chat-tomo": { title: "Tomo", messages: [] },
            },
          };
        } else {
          // Ensure the existing "Personal Assistant" space has the "Tomo" chat
          if (!spacesObj[PERSONAL_ASSISTANT_SPACE_ID].chats["chat-tomo"]) {
            spacesObj[PERSONAL_ASSISTANT_SPACE_ID].chats["chat-tomo"] = { title: "Tomo", messages: [] };
          }
        }

        // Update the spaces state after all checks and transformations
        setSpaces(spacesObj);
      } catch (error) {
        console.error("Error fetching spaces:", error);
      }
    };

    fetchSpacesFromDatabase();
  }, []);


  // Save spaces to localStorage whenever they are updated
  useEffect(() => {
    saveSpacesToLocalStorage(spaces);
  }, [spaces]);

  // Function to create a new chat within a space
  const createNewChat = async (spaceId) => {
    const newChatId = `chat-${Date.now()}`;
    const chatName = `New Chat ${Object.keys(spaces[spaceId].chats).length + 1}`;

    try {
      const response = await fetch('http://localhost:3009/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: userFirebaseUid,
          spaceId,
          chatId: newChatId,
          chatName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const newChat = await response.json();

      // Update the chat state locally
      const updatedSpaces = {
        ...spaces,
        [spaceId]: {
          ...spaces[spaceId],
          chats: {
            ...spaces[spaceId].chats,
            [newChat.chatId]: {
              title: newChat.chatName,
              messages: [],
            },
          },
        },
      };
      setSpaces(updatedSpaces);
      setCurrentChatId(newChatId);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };


  // Switch to a space or chat
  const switchSpace = (spaceId) => {
    setCurrentSpaceId(spaceId);
    setCurrentChatId(null); // No chat selected when switching spaces
  };

  const switchChat = (spaceId, chatId) => {
    setCurrentSpaceId(spaceId);
    setCurrentChatId(chatId);
  };

  const handleDeleteChat = async (spaceId, chatId) => {
    try {
      const response = await fetch(`http://localhost:3009/api/chats/${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // Remove the chat from local state
      const updatedSpaces = {
        ...spaces,
        [spaceId]: {
          ...spaces[spaceId],
          chats: {
            ...spaces[spaceId].chats,
          },
        },
      };
      delete updatedSpaces[spaceId].chats[chatId];
      setSpaces(updatedSpaces);

      if (currentChatId === chatId) {
        setCurrentChatId(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  useEffect(() => {
    const fetchAllChats = async () => {
      try {
        const firebaseUid = auth.currentUser?.uid;
        if (!firebaseUid) {
          console.error("No user is logged in.");
          return;
        }

        // Fetch all spaces for the current user
        const response = await fetch(`http://localhost:3009/api/spaces?firebaseUid=${firebaseUid}`);
        if (!response.ok) throw new Error("Failed to fetch spaces");

        const { spaces: spacesData } = await response.json();
        console.log("Fetched spaces data:", spacesData);

        if (!Array.isArray(spacesData)) {
          throw new Error("Invalid data format: Expected an array of spaces");
        }

        // Transform spacesData into the format used in the state
        let spacesObj = spacesData.reduce((acc, space) => {
          acc[space.spaceId] = { title: space.spaceName, chats: {} };
          return acc;
        }, {});

        // Fetch chats for all spaces
        for (const space of spacesData) {
          const chatResponse = await fetch(`http://localhost:3009/api/chats?firebaseUid=${firebaseUid}&spaceId=${space.spaceId}`);
          if (!chatResponse.ok) throw new Error(`Failed to fetch chats for spaceId: ${space.spaceId}`);

          const { chats } = await chatResponse.json();
          const chatsObj = chats.reduce((acc, chat) => {
            acc[chat.chatId] = { title: chat.chatName, messages: [] };
            return acc;
          }, {});

          // Add chats to the respective space in spacesObj
          spacesObj[space.spaceId].chats = chatsObj;
        }

        // Update the state with all spaces and their respective chats
        setSpaces(spacesObj);
      } catch (error) {
        console.error("Error fetching chats for all spaces:", error);
      }
    };

    fetchAllChats();
    // Pass an empty dependency array to ensure the effect runs only once
  }, []);



  // Edit chat name
  const handleEditChatName = (spaceId, chatId) => {
    setEditingChatId(chatId);
    setNewChatName(spaces[spaceId].chats[chatId].title);
  };

  const handleSaveChatName = async (spaceId, chatId) => {
    try {
      // Update the chat name in the state
      const updatedSpaces = {
        ...spaces,
        [spaceId]: {
          ...spaces[spaceId],
          chats: {
            ...spaces[spaceId].chats,
            [chatId]: {
              ...spaces[spaceId].chats[chatId],
              title: newChatName,
            },
          },
        },
      };
      setSpaces(updatedSpaces);
      setEditingChatId(null); // Stop editing

      const response = await fetch(`http://localhost:3009/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chatName: newChatName }),
      });

      if (!response.ok) {
        throw new Error('Failed to update chat name in the database');
      }

      console.log('Chat name updated successfully in the database');
    } catch (error) {
      console.error('Error updating chat name:', error);
    }
  };



  const createNewSpace = async () => {
    if (userRole === 'ta' || userRole === 'professor') {
      try {
        const firebaseUid = auth.currentUser?.uid;
        if (!firebaseUid) {
          console.error('No user is logged in.');
          return;
        }

        // Increment the highest space number and use it for the new space name
        highestSpaceNumber += 1;
        const newSpaceId = `space-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
        const newSpaceName = `New Space`;

        const newSpace = {
          firebaseUid,
          spaceId: newSpaceId,
          spaceName: newSpaceName,
          users: [firebaseUid],
        };

        // API call to create the new space in the database
        const response = await fetch('http://localhost:3009/api/spaces', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSpace),
        });

        if (!response.ok) {
          throw new Error('Failed to create new space');
        }

        const data = await response.json();

        // Add the new space to the state
        setSpaces((prevSpaces) => ({
          ...prevSpaces,
          [data.space.spaceId]: {
            title: data.space.spaceName,
            chats: {},
          },
        }));

        setCurrentSpaceId(data.space.spaceId);
        setCurrentChatId(null);
      } catch (error) {
        console.error('Error creating new space:', error);
      }
    } else {
      console.log('Only TAs or professors can create a new space.');
    }
  };


  // Function to save the space name in the database
  const handleSaveSpaceName = async (spaceId, newName) => {
    try {
      const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ spaceName: newName }),
      });

      if (!response.ok) {
        throw new Error('Failed to update space name');
      }

      // Update local state
      setSpaces((prevSpaces) => ({
        ...prevSpaces,
        [spaceId]: {
          ...prevSpaces[spaceId],
          title: newName,
        },
      }));
    } catch (error) {
      console.error('Error updating space name:', error);
    }
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
    <div className="flex h-screen" style={{ backgroundColor: '#091720' }}>
      {/* Sidebar */}
      <div className="w-1/5 bg-gray-900 p-4 flex flex-col justify-between">
        {/* Top section for logo */}
        <div className="flex justify-center mb-4">
          <Image
            src={logo}
            width={100}
            height={40}
            className="object-contain"
          />
        </div>

        {/* Spaces and Chats */}
        <div className="overflow-y-auto mb-4 flex-grow">
          {Object.keys(spaces).length === 0 ? (
            <p className="text-gray-500">No spaces available</p>
          ) : (
            Object.keys(spaces).map((spaceId) => (
              <div key={spaceId} className="mb-4">
                {/* Space */}
                <div
                  className={`cursor-pointer p-2 rounded-xl flex justify-between items-center ${currentSpaceId === spaceId ? 'bg-gray-700' : 'bg-slate-700'}`}
                >
                  {editingSpaceId === spaceId ? (
                    <input
                      type="text"
                      value={newSpaceName}
                      onChange={(e) => setNewSpaceName(e.target.value)}
                      onBlur={() => handleSaveSpaceName(spaceId)}
                      className="bg-gray-700 text-white p-1 rounded"
                    />
                  ) : (
                    <span onClick={() => switchSpace(spaceId)} className="flex-grow">
                      {spaces[spaceId].title}
                    </span>
                  )}
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="ml-2 text-gray-300 cursor-pointer"
                    onClick={() => createNewChat(spaceId)}
                  />
                </div>

                {/* Chats within the selected space */}
                <div className="ml-6 mt-2">
                  {Object.keys(spaces[spaceId].chats).length === 0 ? (
                    <p className="text-gray-500">No chats available</p>
                  ) : (
                    Object.keys(spaces[spaceId].chats).map((chatId) => (
                      <div
                        key={chatId}
                        className={`cursor-pointer p-2 my-2 rounded-xl flex text-sm justify-between items-center ${currentChatId === chatId ? 'bg-gray-700' : 'bg-gray-900'}`}
                      >
                        {editingChatId === chatId ? (
                          <input
                            type="text"
                            value={newChatName}
                            onChange={(e) => setNewChatName(e.target.value)}
                            onBlur={() => handleSaveChatName(spaceId, chatId)}
                            className="bg-gray-600 text-white p-1 rounded"
                          />
                        ) : (
                          <span onClick={() => switchChat(spaceId, chatId)} className="flex-grow">
                            {spaces[spaceId].chats[chatId].title}
                          </span>
                        )}
                        <FontAwesomeIcon
                          icon={faEdit}
                          className="ml-2 text-gray-300 cursor-pointer"
                          onClick={() => handleEditChatName(spaceId, chatId)}
                        />
                        <FontAwesomeIcon
                          icon={faTrash}
                          className="ml-2 text-gray-300 cursor-pointer delete-icon"
                          onClick={() => handleDeleteChat(spaceId, chatId)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom for new space button */}
        <div className="flex justify-center">
          {/* Conditionally render the "New Space" button */}
          {(userRole === 'ta' || userRole === 'professor') && (
            <button
              onClick={createNewSpace}
              className="bg-gray-700 text-white px-4 py-2 rounded-xl"
              style={{ width: '50%' }} // Button width 50% of the sidebar
            >
              + New Space
            </button>

          )}



        </div>
      </div>

      {/* Space and Chat UI */}
      <div className="w-4/5 p-4 flex flex-col bg-chat">
        {currentSpaceId && !currentChatId ? (
          // Check if the userRole is either 'ta' or 'professor' before rendering SpacePage
          userRole === 'ta' || userRole === 'professor' ? (
            <SpacePage
              spaceTitle={spaces[currentSpaceId].title}
              spaceId={currentSpaceId}
              handleEditSpaceName={handleEditSpaceName}
              handleSaveSpaceName={handleSaveSpaceName}
              handleDeleteSpace={handleDeleteSpace}
            />
          ) : (
            // Render StudentSpaceManagement component if the user is a 'student'
            <StudentSpaceManagement
              currentSpaceId={currentSpaceId}
              userRole={userRole}
              handleLogout={handleLogout}
              whiteLogoOnly={whiteLogoOnly}
            />
          )
        ) : currentChatId ? (
          <>
            {/* Top Bar with Logo and Profile Icon */}
            <div className="bg-gray-800 bg-transparent p-4 rounded-t-lg flex justify-between items-center">
              <Image
                src={whiteLogoOnly}
                alt="TomoAI Logo"
                width={100}
                height={40}
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
                {dropdownVisible && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-lg shadow-lg z-10">
                    <ul className="py-1">
                      <li className="px-4 py-2 text-gray-300 hover:bg-gray-600 cursor-pointer flex items-center">
                        <FontAwesomeIcon icon={faUser} className="mr-2" /> Profile
                      </li>
                      <hr className="border-t border-gray-600 my-1" />
                      <li
                        onClick={handleLogout}
                        className="px-4 py-2 text-gray-300 hover:bg-gray-600 cursor-pointer flex items-center"
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-2" /> Logout
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow p-4 overflow-y-auto no-scrollbar">
              {currentSpaceId &&
                currentChatId &&
                spaces[currentSpaceId] &&
                spaces[currentSpaceId].chats[currentChatId] &&
                spaces[currentSpaceId].chats[currentChatId].messages ? (
                spaces[currentSpaceId].chats[currentChatId].messages.length === 0 ? (
                  <p className="text-gray-500">No messages in this chat</p>
                ) : (
                  spaces[currentSpaceId].chats[currentChatId].messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`my-2 ${msg.role === 'user' ? 'text-right' : 'text-left flex items-center'
                        }`}
                    >
                      {msg.role === 'ai' && (
                        <Image
                          src={chatIcon} // Display the chat icon before the AI response
                          alt="AI Icon"
                          width={20}
                          height={20}
                          className="mr-2"
                        />
                      )}
                      <p
                        className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-[#08141F] text-white' : 'text-white'
                          }`}
                      >
                        {msg.content}
                      </p>
                    </div>
                  ))
                )
              ) : (
                <p className="text-gray-500">Select a chat to start messaging</p>
              )}
            </div>

            {/* Message Input */}
            <div className="mt-4 flex justify-center">
              <ChatPage
                currentSpaceId={currentSpaceId}
                currentChatId={currentChatId}
                // Check to prevent accessing undefined `chats`
                chats={currentSpaceId && spaces[currentSpaceId] ? spaces[currentSpaceId].chats : {}}
                updateChatMessages={(chatId, message) => {
                  const updatedSpaces = { ...spaces };
                  if (updatedSpaces[currentSpaceId] && updatedSpaces[currentSpaceId].chats[chatId]) {
                    updatedSpaces[currentSpaceId].chats[chatId].messages.push(message);
                    setSpaces(updatedSpaces);
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a chat or space to start messaging</p>
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
        .delete-icon:hover {
          color: red !important;
        }
      `}</style>
    </div>
  );

}
