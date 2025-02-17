'use client';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import 'katex/dist/katex.min.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faTrash } from '@fortawesome/free-solid-svg-icons';
import { auth } from '../firebase/config';

export default function ChatPlusPage({ spaceId, spaceTitle, switchChat }) {
  const [chatplusChats, setChatplusChats] = useState([]);
  const [combinedChats, setCombinedChats] = useState([]);
  const [creators, setCreators] = useState({});
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/signin');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Fetch all Chat documents for this space where chatPlusId is not "NA".
  useEffect(() => {
    async function fetchAllChatPlusChats() {
      try {
        const response = await fetch(`http://localhost:3009/api/chats/allChatplus?spaceId=${spaceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch all ChatPlus chats');
        }
        const data = await response.json();
        setChatplusChats(data.chats);
      } catch (error) {
        console.error('Error fetching all ChatPlus chats:', error);
      }
    }
    if (spaceId) {
      fetchAllChatPlusChats();
    }
  }, [spaceId]);

  useEffect(() => {
    async function fetchChatPlusDetails() {
      const updated = await Promise.all(
        chatplusChats.map(async (chat) => {
          try {
            const response = await fetch(`http://localhost:3009/api/chatplus/${chat.chatPlusId}`);
            if (!response.ok) {
              throw new Error('Failed to fetch ChatPlus details');
            }
            const chatPlusData = await response.json();
            // Merge the Chat document with the ChatPlus shared users array.
            return { ...chat, sharedUsers: chatPlusData.users || [] };
          } catch (error) {
            console.error('Error fetching ChatPlus details for chatId:', chat.chatId, error);
            return { ...chat, sharedUsers: [] };
          }
        })
      );
      setCombinedChats(updated);
    }
    if (chatplusChats.length > 0) {
      fetchChatPlusDetails();
    }
  }, [chatplusChats]);

  useEffect(() => {
    async function fetchCreators() {
      const uniqueUids = new Set();
      combinedChats.forEach(chat => {
        uniqueUids.add(chat.firebaseUid);
        if (chat.sharedUsers && Array.isArray(chat.sharedUsers)) {
          chat.sharedUsers.forEach(uid => uniqueUids.add(uid));
        }
      });
      const newCreators = {};
      await Promise.all(
        Array.from(uniqueUids).map(async (uid) => {
          try {
            const response = await fetch(`http://localhost:3009/api/users/chatPlus/${uid}`);
            if (!response.ok) throw new Error('Failed to fetch user');
            const userData = await response.json();
            newCreators[uid] = userData;
          } catch (err) {
            console.error('Error fetching user for uid:', uid, err);
          }
        })
      );
      setCreators(prev => ({ ...prev, ...newCreators }));
    }
    if (combinedChats.length > 0) {
      fetchCreators();
    }
  }, [combinedChats]);

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
    <div className="p-4">
      {/* Header with title on left and user icon on right */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl">{spaceTitle} - Chat+ Group Chats</h1>
        <div className="relative" ref={dropdownRef}>
          <FontAwesomeIcon
            icon={faUser}
            className="text-[var(--foreground)] cursor-pointer"
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
                <li onClick={handleLogout} className="px-4 py-2 text-gray-300 hover:bg-gray-600 cursor-pointer flex items-center">
                  <FontAwesomeIcon icon={faTrash} className="mr-2" /> Logout
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
  
      {/* Chat list */}
      {combinedChats.length === 0 ? (
        <p>No group chats available.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {combinedChats.map((chat) => (
            <div
              key={chat.chatId}
              onClick={() => switchChat(spaceId, chat.chatId)}
              className="p-4 bg-[var(--secondary-bg)] rounded-lg cursor-pointer hover:bg-[var(--primary-accent)] transition"
            >
              <h2 className="text-xl font-bold mb-3">{chat.chatName}</h2>
              <p className="text-sm text-gray-400">
                Created by:{" "}
                {creators[chat.firebaseUid]
                  ? `${creators[chat.firebaseUid].firstName} ${creators[chat.firebaseUid].lastName}`
                  : "Loading..."}
              </p>
              {chat.sharedUsers && chat.sharedUsers.length > 1 && (
                <p className="text-sm text-gray-400">
                  Shared with:{" "}
                  {chat.sharedUsers
                    .slice(1)
                    .map((uid, index) => (
                      <span key={uid}>
                        {creators[uid]
                          ? `${creators[uid].firstName} ${creators[uid].lastName}`
                          : "Loading..."}
                        {index !== chat.sharedUsers.slice(1).length - 1 ? ", " : ""}
                      </span>
                    ))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
