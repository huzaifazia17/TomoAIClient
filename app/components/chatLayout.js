'use client'; 
import { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';  
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import ChatPage from './chatPage'; 

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

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Chats</h1>
          <button onClick={createNewChat} className="bg-blue-600 text-white px-2 py-1 rounded">
            + New Chat
          </button>
        </div>
        <div className="overflow-y-auto mb-4">
          {Object.keys(chats).length === 0 ? (
            <p className="text-gray-500">No chats available</p>
          ) : (
            Object.keys(chats).map((chatId) => (
              <div
                key={chatId}
                onClick={() => switchChat(chatId)}
                className={`cursor-pointer p-2 rounded ${currentChatId === chatId ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                {chats[chatId].title}
              </div>
            ))
          )}
        </div>
        <button 
          onClick={handleLogout} 
          className="bg-red-500 text-white px-4 py-2 rounded w-full"
        >
          Logout
        </button>
      </div>

      {/* Chat Area */}
      <div className="w-3/4 p-4 flex flex-col">
        {currentChatId ? (
          <>
            {/* Top Bar with "TomoAI" */}
            <div className="bg-gray-800 p-4 rounded-t-lg">
              <h1 className="text-xl font-bold">TomoAI</h1>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow bg-gray-700 p-4 rounded-b-lg overflow-y-auto">
              {chats[currentChatId].messages.length === 0 ? (
                <p className="text-gray-500">No messages in this chat</p>
              ) : (
                chats[currentChatId].messages.map((msg, index) => (
                  <div key={index} className={`my-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <p className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-white'}`}>
                      {msg.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="mt-4 flex">
              <ChatPage
                currentChatId={currentChatId}
                chats={chats}
                updateChatMessages={updateChatMessages}
              />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
