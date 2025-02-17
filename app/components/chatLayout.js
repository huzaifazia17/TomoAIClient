'use client';
import { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useRouter } from 'next/navigation';
import ChatPage from './chatPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEdit, faTrash, faPlus, faShareAlt } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import logo from '../resources/logo.png';
import chatIcon from '../resources/chatIcon.png';
import whiteLogoOnly from '../resources/whiteLogoOnly.png';
import blackLogoOnly from '../resources/blackLogoOnly.png';
import SpacePage from './spacePage';
import StudentSpaceManagement from './StudentSpaceManagement';
import ChatPlusPage from './chatPlusPage';

import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { MathJax } from 'better-react-mathjax';

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
  const [showChatPlus, setShowChatPlus] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalChat, setShareModalChat] = useState(null); // { spaceId, chatId }
  const [shareModalStudents, setShareModalStudents] = useState([]); // List of student objects in the space
  const [selectedStudents, setSelectedStudents] = useState({}); // { [studentId]: boolean }
  const [initialSelectedStudents, setInitialSelectedStudents] = useState({});

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

  const [theme, setTheme] = useState(
    typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
      ? 'dark'
      : 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
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
              "chat-tomo": { title: "Tomo", messages: [], chatPlusId: "NA" },
            },
          };
        } else {
          // Ensure the existing "Personal Assistant" space has the "Tomo" chat
          if (!spacesObj[PERSONAL_ASSISTANT_SPACE_ID].chats["chat-tomo"]) {
            spacesObj[PERSONAL_ASSISTANT_SPACE_ID].chats["chat-tomo"] = { title: "Tomo", messages: [], chatPlusId: "NA" };
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

  const personalAssistantSpaceId = userFirebaseUid
    ? `personal-assistant-space-${userFirebaseUid}`
    : null;

  useEffect(() => {
    saveSpacesToLocalStorage(spaces);
  }, [spaces]);

  const createNewChat = async (spaceId) => {
    const newChatId = `chat-${Date.now()}`;
    const chatName = `New Chat ${Object.keys(spaces[spaceId].chats).length + 1}`;

    try {
      const chatPlusId = "NA";

      const response = await fetch('http://localhost:3009/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: userFirebaseUid,
          spaceId,
          chatId: newChatId,
          chatPlusId,
          chatName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const newChat = await response.json();

      const updatedSpaces = {
        ...spaces,
        [spaceId]: {
          ...spaces[spaceId],
          chats: {
            ...spaces[spaceId].chats,
            [newChat.chatId]: {
              title: newChat.chatName,
              messages: [],
              chatPlusId,
            },
          },
        },
      };
      setSpaces(updatedSpaces);
      setCurrentChatId(newChat.chatId);
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
          chats: { ...spaces[spaceId].chats },
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
            acc[chat.chatId] = {
              title: chat.chatName,
              messages: [],
              chatPlusId: chat.chatPlusId ? chat.chatPlusId : "NA",
            };
            return acc;
          }, {});

          spacesObj[space.spaceId].chats = chatsObj;
        }

        // Update the state with all spaces and their respective chats
        setSpaces(spacesObj);
      } catch (error) {
        console.error("Error fetching chats for all spaces:", error);
      }
    };

    fetchAllChats();
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

  const handleSpaceSelect = (spaceId) => {
    setCurrentSpaceId(spaceId);
    setShowChatPlus(false);
  };

  const createNewChatForChatPlus = async (spaceId) => {
    const chatCount = spaces[spaceId]?.chats
      ? Object.values(spaces[spaceId].chats).filter(chat => chat.chatPlusId !== "NA").length
      : 0;
    const newChatName = `Chat+ ${chatCount + 1}`;
    
    const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      const newChatPlus = {
        firebaseUid: userFirebaseUid,
        chatPlusId: `cp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        spaceId,
        chatPlusName: newChatName,
        users: [userFirebaseUid],
      };
    
      const cpResponse = await fetch('http://localhost:3009/api/chatplus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChatPlus),
      });
    
      if (!cpResponse.ok) {
        throw new Error('Failed to create chatplus entry');
      }
    
      const cpData = await cpResponse.json();
      const chatPlusId = cpData.chatPlus.chatPlusId;
      console.log('New ChatPlus entry created:', chatPlusId);
    
      const response = await fetch('http://localhost:3009/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseUid: userFirebaseUid,
          spaceId,
          chatId: newChatId,
          chatPlusId, 
          chatName: newChatName,
        }),
      });
    
      if (!response.ok) {
        throw new Error('Failed to create chat');
      }
    
      const newChat = await response.json();
  
      setSpaces((prevSpaces) => ({
        ...prevSpaces,
        [spaceId]: {
          ...prevSpaces[spaceId],
          chats: {
            ...prevSpaces[spaceId].chats,
            [newChat.chatId]: {
              title: newChat.chatName,
              messages: [],
              chatPlusId, 
            },
          },
        },
      }));
    
      setCurrentChatId(newChat.chatId);
    } catch (error) {
      console.error('Error creating chat for chatplus:', error);
    }
  };
  

  const openShareModal = async (spaceId, chatId) => {
    setShareModalChat({ spaceId, chatId });
    
    // Fetch students for this space
    try {
      const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}/students`);
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setShareModalStudents(data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
    
    // Get the chatPlusId from the spaces state
    const chatPlusId = spaces[spaceId].chats[chatId].chatPlusId;
    
    // Fetch the ChatPlus entry to see which users are already added
    try {
      const cpResponse = await fetch(`http://localhost:3009/api/chatplus/${chatPlusId}`);
      if (!cpResponse.ok) throw new Error('Failed to fetch ChatPlus data');
      const cpData = await cpResponse.json();
      // Preselect the checkboxes based on the ChatPlus users array
      const initial = {};
      cpData.users.forEach((userId) => {
        initial[userId] = true;
      });
      setInitialSelectedStudents(initial);
      setSelectedStudents(initial);
    } catch (error) {
      console.error('Error fetching ChatPlus data:', error);
    }
    
    setShowShareModal(true);
  };

  const handleCheckboxChange = (studentId, isChecked) => {
    setSelectedStudents((prev) => ({
      ...prev,
      [studentId]: isChecked,
    }));
  };
  
  const handleShare = async () => {
    if (!shareModalChat) return;
    const { spaceId, chatId } = shareModalChat;
    const chatPlusId = spaces[spaceId].chats[chatId].chatPlusId;
  
    // Iterate over each student in the modal list
    for (const student of shareModalStudents) {
      const id = student.firebaseUid;
      const wasInitiallySelected = initialSelectedStudents[id] || false;
      const isNowSelected = selectedStudents[id] || false;
      
      if (isNowSelected && !wasInitiallySelected) {
        // Student was added – update ChatPlus with PUT route
        try {
          await fetch(`http://localhost:3009/api/chatplus/${chatPlusId}/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id }),
          });
        } catch (error) {
          console.error(`Failed to add user ${id} to ChatPlus:`, error);
        }
      } else if (!isNowSelected && wasInitiallySelected) {
        // Student was removed – update ChatPlus with DELETE route
        try {
          await fetch(`http://localhost:3009/api/chatplus/${chatPlusId}/users/${id}`, {
            method: 'DELETE',
          });
        } catch (error) {
          console.error(`Failed to remove user ${id} from ChatPlus:`, error);
        }
      }
    }
    setShowShareModal(false);
  };
  
  

  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  const MessageFormatter = ({ content }) => {
    const { response } = content;
    const responseLines = response.split("\n");
  
    const renderInlineCode = (line, index) => (
      <span key={index} className="bg-[var(--secondary-bg)] text-[var(--foreground)] px-1 py-0.5 rounded">
        {line.slice(1, line.length - 1)} 
      </span>
    );
  
    const renderHeading = (line, index) => (
      <div key={index} className={`text-xl font-semibold text-[var(--foreground)] mt-8 mb-4`}>
        {line.replace(/\*\*/g, '')}
      </div>
    );
  
    const processCodeBlock = (code, language) => {
      const lines = code.split('\n').filter(line => line.trim());
      return (
        <div className="relative my-8">
          {language && (
            <div className="absolute right-2 top-2 px-2 py-1 text-xs text-[var(--code-label)] bg-[var(--code-bg)] rounded">
              {language}
            </div>
          )}
          <pre className="bg-[var(--code-bg)] p-4 rounded-lg overflow-x-auto">
          <code className="text-sm text-[var(--foreground)] font-mono" style={{ whiteSpace: 'pre' }}>
              {lines.join('\n')}
            </code>
          </pre>
        </div>
      );
    };
  
    const renderTextStyle = (line, index, style) => (
      <div key={index} className="text-base text-[var(--foreground)] mb-8">
        {line.split(style).map((part, idx) =>
          idx % 2 === 1 ? (style === '**' ? <b key={idx}>{part}</b> : <i key={idx}>{part}</i>) : part
        )}
      </div>
    );
  
    const renderList = (line, index) => (
      <ul key={index} className="list-disc pl-8 mt-6 space-y-4">
        <li key={index} className="text-base text-[var(--foreground)]">{line.trim().substring(2).trim()}</li>
      </ul>
    );
  
    const renderMathAsText = (line, index) => {
      if (line.startsWith("\\[")) {
        return (
          <div key={index} className="text-[var(--foreground)] text-lg mb-6">{line.slice(2, line.length - 2)}</div>
        );
      } else if (line.startsWith("\\(")) {
        return (
          <span key={index} className="text-[var(--foreground)]">
            {line.slice(2, line.length - 2)} 
          </span>
        );
      }
      return null;
    };
  
    const formattedBlocks = [];
    let currentBlock = []; 
    let codeLanguage = ''; 
    let isInCodeBlock = false; 
  
    for (let index = 0; index < responseLines.length; index++) {
      let line = responseLines[index].trim();
  
      const mathRendered = renderMathAsText(line, index);
      if (mathRendered) {
        formattedBlocks.push(mathRendered);
        continue; 
      }
  
      if (line.startsWith('###')){ 
        formattedBlocks.push(renderHeading(line, index));
      } else if (line.startsWith('####')) { 
        formattedBlocks.push(renderHeading(line, index));
      }
      
      else if (line.match(/^\d+\./)) {
        formattedBlocks.push(
          <div key={index} className="text-base text-[var(--foreground)] mt-4 mb-4">
            {line.replace(/\*\*/g, '')}
          </div>
        );
      }
      else if (line.startsWith('- ') || line.startsWith('• ')) {
        formattedBlocks.push(renderList(line, index));
      }
      else if (line.startsWith("```") && !isInCodeBlock) {
        codeLanguage = line.slice(3).trim();
        isInCodeBlock = true; 
      }
      else if (line.endsWith("```") && isInCodeBlock) {
        isInCodeBlock = false;
        formattedBlocks.push(processCodeBlock(currentBlock.join('\n'), codeLanguage));
        currentBlock = []; 
      }
      else if (isInCodeBlock) {
        currentBlock.push(line);
      }
      else if (line.startsWith("`") && line.endsWith("`")) {
        formattedBlocks.push(renderInlineCode(line, index));
      }
      else if (line.includes('**') || line.includes('__')) {
        formattedBlocks.push(renderTextStyle(line, index, '**'));
      }
      else if (line.includes('*') || line.includes('_')) {
        formattedBlocks.push(renderTextStyle(line, index, '*'));
      }
      else {
        formattedBlocks.push(
          <div key={index} className="text-base text-[var(--foreground)] mb-8">
            {line}
          </div>
        );
      }
    }
  
    return (
      <div className="bg-[var(--primary-accent)] p-6 rounded-lg shadow-lg">
        {formattedBlocks}
      </div>
    );
  };

  // Another version for formatting. Both equally bad so whichever one we prefer we can keep (BELOW)

  // const MessageFormatter = ({ content }) => {
  //   const getTextContent = (content) => {
  //     if (typeof content === 'string') {
  //       return content;
  //     }
  //     if (content && typeof content === 'object') {
  //       return content.response || content.contextSummary || '';
  //     }
  //     return '';
  //   };
  
  //   const cleanMarkdown = (text) => {
  //     return text.replace(/^#{1,6}\s+/g, '');
  //   };
  
  //   const cleanEmphasis = (text) => {
  //     const cleanedText = text
  //       .replace(/^\*-|-\*$/g, '')
  //       .replace(/^\*|\*$/g, '')
  //       .replace(/\*([^*]+)\*/g, '$1')
  //       .replace(/^-\s*/, '');

  //     return cleanedText.replace(/[.:]\s*$/, '').trim();
  //   };
  
  //   const formatMathExpression = (text) => {
  //     let formattedText = text.replace(/^\[(.*)\]$/, '$1');
  
  //     formattedText = formattedText
  //       .replace(/\\frac{([^}]+)}{([^}]+)}/g, '<sup>$1</sup>&#8260;<sub>$2</sub>')
  //       .replace(/(\d+)\/(\d+)/g, '<sup>$1</sup>&#8260;<sub>$2</sub>')
      
  //       .replace(/\\([a-zA-Z]+)/g, (match, symbol) => {
  //         const symbols = {
  //           'infty': '∞',
  //           'times': '×',
  //           'frac': '/',
  //           'sum': '∑',
  //           'int': '∫'
  //         };
  //         return symbols[symbol] || match;
  //       })

  //       .replace(/_([a-zA-Z0-9]+)/g, '<sub>$1</sub>')
  //       .replace(/\^([a-zA-Z0-9-]+)/g, '<sup>$1</sup>')
  //       .replace(/P\(([^)]+)\)/g, 'P($1)')
  //       .replace(/F_X/g, 'F<sub>X</sub>')
  //       .replace(/f_X/g, 'f<sub>X</sub>')
  //       .replace(/^nC_k/g, '<sup>n</sup>C<sub>k</sub>')
  //       .replace(/sum_i=0\^x/g, '∑<sub>i=0</sub><sup>x</sup>')
  //       .replace(/\\/g, '')
  //       .replace(/\{([^}]+)\}/g, '$1');
  
  //     return formattedText;
  //   };
  
  //   const processLineContent = (text) => {
  //     if (text.includes('P(') || 
  //         text.includes('F(') || 
  //         text.includes('_') || 
  //         text.includes('^') || 
  //         text.includes('\\')) {
  //       return formatMathExpression(text);
  //     }
      
  //     return cleanEmphasis(cleanMarkdown(text));
  //   };
  
  //   const isNumberedListItem = (line) => {
  //     const match = line.trim().match(/^(?:\*-)?(\d+)[\s.:]+([^]*)$/);
  //     if (match) {
  //       return {
  //         isNumbered: true,
  //         number: parseInt(match[1]),
  //         content: processLineContent(match[2].trim()),
  //         indentLevel: getIndentLevel(line)
  //       };
  //     }
  //     return { isNumbered: false };
  //   };
  
  //   const isBulletListItem = (line) => {
  //     return line.trim().match(/^[-•*]\s/);
  //   };
  
  //   const getIndentLevel = (line) => {
  //     const match = line.match(/^(\s*)/);
  //     return match ? match[1].length : 0;
  //   };
  
  //   const processListItem = (line) => {
  //     const content = line.replace(/^[-•*]\s*|\d+[\s.:]+/, '').trim();
  //     return processLineContent(content);
  //   };
  
  //   const processCodeBlock = (code, language) => {
  //     const lines = code.split('\n').filter(line => line.trim());
  //     return (
  //       <div className="relative my-4">
  //         {language && (
  //           <div className="absolute right-2 top-2 px-2 py-1 text-xs text-gray-400 bg-gray-900 rounded">
  //             {language}
  //           </div>
  //         )}
  //         <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
  //           <code className="text-sm text-gray-200 font-mono" style={{ whiteSpace: 'pre' }}>
  //             {lines.join('\n')}
  //           </code>
  //         </pre>
  //       </div>
  //     );
  //   };
  
  //   const createNumberedList = (items, startNumber = 1) => {
  //     if (items.length === 0) return null;
      
  //     return (
  //       <ol start={startNumber} className="list-decimal pl-6 space-y-2 my-4">
  //         {items.map((item, index) => (
  //           <li key={index} className="text-white">
  //             <span dangerouslySetInnerHTML={{ __html: item.content }} />
  //             {item.subItems && item.subItems.length > 0 && (
  //               <ul className="list-disc pl-6 mt-2 space-y-2">
  //                 {item.subItems.map((subItem, subIndex) => (
  //                   <li key={subIndex} className="text-white">
  //                     <span dangerouslySetInnerHTML={{ __html: processLineContent(subItem) }} />
  //                   </li>
  //                 ))}
  //               </ul>
  //             )}
  //           </li>
  //         ))}
  //       </ol>
  //     );
  //   };
  
  //   const formatText = (text) => {
  //     if (!text) return null;
  
  //     const lines = text.split('\n');
  //     let currentBlock = [];
  //     let formattedBlocks = [];
  //     let currentMode = 'paragraph';
  //     let isInCodeBlock = false;
  //     let codeLanguage = '';
  //     let currentNumberedList = [];
  //     let currentSubItems = [];
  
  //     const processCurrentBlock = () => {
  //       if (currentBlock.length === 0) return;
  
  //       if (currentMode === 'code') {
  //         formattedBlocks.push(processCodeBlock(currentBlock.join('\n'), codeLanguage));
  //       } else if (currentMode === 'paragraph') {
  //         const processedContent = currentBlock.map(line => processLineContent(line)).join(' ');
  //         formattedBlocks.push(
  //           <p key={formattedBlocks.length} className="my-4 text-white leading-relaxed">
  //             <span dangerouslySetInnerHTML={{ __html: processedContent }} />
  //           </p>
  //         );
  //       } else if (currentMode === 'bullet') {
  //         formattedBlocks.push(
  //           <ul key={formattedBlocks.length} className="list-disc pl-6 space-y-2 my-4">
  //             {currentBlock.map((item, i) => (
  //               <li key={i} className="text-white">
  //                 <span dangerouslySetInnerHTML={{ __html: processLineContent(item) }} />
  //               </li>
  //             ))}
  //           </ul>
  //         );
  //       }
        
  //       currentBlock = [];
  //     };
  
  //     lines.forEach((line) => {
  //       if (line.trim().startsWith('```')) {
  //         if (!isInCodeBlock) {
  //           processCurrentBlock();
  //           isInCodeBlock = true;
  //           currentMode = 'code';
  //           codeLanguage = line.trim().slice(3).trim();
  //         } else {
  //           processCurrentBlock();
  //           isInCodeBlock = false;
  //           currentMode = 'paragraph';
  //           codeLanguage = '';
  //         }
  //         return;
  //       }
  
  //       if (isInCodeBlock) {
  //         currentBlock.push(line);
  //         return;
  //       }
  
  //       line = line.trim();
        
  //       if (!line) {
  //         if (currentNumberedList.length > 0) {
  //           formattedBlocks.push(createNumberedList(currentNumberedList));
  //           currentNumberedList = [];
  //         }
  //         processCurrentBlock();
  //         return;
  //       }
  
  //       const { isNumbered, content } = isNumberedListItem(line);
        
  //       if (isNumbered) {
  //         if (currentMode !== 'number') {
  //           processCurrentBlock();
  //         }
  //         if (currentSubItems.length > 0 && currentNumberedList.length > 0) {
  //           currentNumberedList[currentNumberedList.length - 1].subItems = [...currentSubItems];
  //           currentSubItems = [];
  //         }
  //         currentNumberedList.push({ content, subItems: [] });
  //         currentMode = 'number';
  //         return;
  //       }
  
  //       if (isBulletListItem(line)) {
  //         if (currentMode === 'number') {
  //           currentSubItems.push(processLineContent(processListItem(line)));
  //         } else {
  //           if (currentMode !== 'bullet') {
  //             processCurrentBlock();
  //             currentMode = 'bullet';
  //           }
  //           currentBlock.push(processListItem(line));
  //         }
  //         return;
  //       }
  
  //       if (currentMode !== 'paragraph') {
  //         if (currentMode === 'number') {
  //           if (currentSubItems.length > 0) {
  //             currentNumberedList[currentNumberedList.length - 1].subItems = [...currentSubItems];
  //             currentSubItems = [];
  //           }
  //           formattedBlocks.push(createNumberedList(currentNumberedList));
  //           currentNumberedList = [];
  //         }
  //         processCurrentBlock();
  //         currentMode = 'paragraph';
  //       }
        
  //       currentBlock.push(line);
  //     });
  
  //     if (currentSubItems.length > 0 && currentNumberedList.length > 0) {
  //       currentNumberedList[currentNumberedList.length - 1].subItems = [...currentSubItems];
  //     }
  //     if (currentNumberedList.length > 0) {
  //       formattedBlocks.push(createNumberedList(currentNumberedList));
  //     }
  //     processCurrentBlock();
  
  //     return formattedBlocks;
  //   };
  
  //   const textContent = getTextContent(content);
  
  //   return (
  //     <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
  //       {formatText(textContent)}
  //     </div>
  //   );
  // };

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Sidebar */}
      <div className="w-1/5 bg-[var(--secondary-bg)] text-[var(--foreground)] p-4 flex flex-col justify-between">
        {/* Top section for logo */}
        <div className="flex justify-center mb-4">
          <Image
            src={logo}
            width={100}
            height={40}
            className="object-contain"
            alt="Logo"
          />
        </div>

        {/* Spaces and Chats */}
        <div className="overflow-y-auto mb-4 flex-grow">
          {Object.keys(spaces).length === 0 ? (
            <p className="text-[var(--empty-state-text)]">No spaces available</p>
          ) : (
            Object.keys(spaces).map((spaceId) => (
              <div key={spaceId} className="mb-4">
                {/* Space */}
                <div
                  className={`cursor-pointer p-2 rounded-xl flex justify-between items-center ${
                    currentSpaceId === spaceId
                      ? 'bg-[var(--primary-accent)]'
                      : 'bg-[var(--secondary-accent)]'
                  }`}
                  onClick={() => handleSpaceSelect(spaceId)}
                >
                  {editingSpaceId === spaceId ? (
                    <input
                      type="text"
                      value={newSpaceName}
                      onChange={(e) => setNewSpaceName(e.target.value)}
                      onBlur={() => handleSaveSpaceName(spaceId)}
                      className="bg-[var(--primary-accent)] text-[var(--foreground)] p-1 rounded"
                    />
                  ) : (
                    <span onClick={() => switchSpace(spaceId)} className="flex-grow">
                      {spaces[spaceId].title}
                    </span>
                  )}
                  {/* Personal Chat creation */}
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="ml-2 text-[var(--foreground)] opacity-70 cursor-pointer hover:opacity-100"
                    onClick={() => createNewChat(spaceId)}
                  />
                </div>
              
                {/* Chats within the selected space */}
                <div className="ml-6 mt-2">
                  {Object.keys(spaces[spaceId].chats)
                    .filter(
                      (chatId) =>
                        spaces[spaceId].chats[chatId].chatPlusId === "NA"
                    ).length === 0 ? (
                    <p className="text-gray-500">No chats available</p>
                  ) : (
                    Object.keys(spaces[spaceId].chats)
                      .filter(
                        (chatId) =>
                          spaces[spaceId].chats[chatId].chatPlusId === "NA"
                      )
                      .map((chatId) => (
                        <div
                          key={chatId}
                          className={`cursor-pointer p-2 my-2 rounded-xl flex text-sm justify-between items-center ${
                            currentChatId === chatId
                              ? 'bg-[var(--primary-accent)]'
                              : 'bg-[var(--secondary-bg)]'
                          }`}
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
                            <span
                              onClick={() => switchChat(spaceId, chatId)}
                              className="flex-grow"
                            >
                              {spaces[spaceId].chats[chatId].title}
                            </span>
                          )}
                          <FontAwesomeIcon
                            icon={faEdit}
                            className="ml-2 text-[var(--foreground)] cursor-pointer"
                            onClick={() => handleEditChatName(spaceId, chatId)}
                          />
                          <FontAwesomeIcon
                            icon={faTrash}
                            className="ml-2 text-[var(--foreground)] cursor-pointer delete-icon"
                            onClick={() => handleDeleteChat(spaceId, chatId)}
                          />
                        </div>
                      ))
                  )}
                </div>

                {/* ChatPlus Button and Group Chats Section */}
                {spaceId !== personalAssistantSpaceId && (
                  <div className="mt-2 pl-4 relative">
                    <button
                      onClick={() => {
                        if (userRole === 'ta' || userRole === 'professor') {
                          setCurrentSpaceId(spaceId);
                          setCurrentChatId(null);
                          setShowChatPlus(true);
                        }
                      }}
                      className="w-full text-left bg-[var(--primary-accent)] text-[var(--foreground)] px-4 py-2 rounded-lg"
                    >
                      Chat +
                    </button>
                    
                    <FontAwesomeIcon
                      icon={faPlus}
                      onClick={() => createNewChatForChatPlus(spaceId)}
                      className="absolute top-0 right-0 m-2 cursor-pointer text-[var(--foreground)]"
                    />
                    {/* Display group chats (created with ChatPlus) only */}
                    {Object.keys(spaces[spaceId].chats)
                      .filter(
                        (chatId) =>
                          spaces[spaceId].chats[chatId].chatPlusId !== "NA"
                      ).length > 0 && (
                      <div className="mt-2">
                        {Object.keys(spaces[spaceId].chats)
                          .filter(
                            (chatId) =>
                              spaces[spaceId].chats[chatId].chatPlusId !== "NA"
                          )
                          .map((chatId) => (
                            <div
                              key={chatId}
                              className={`cursor-pointer p-2 my-2 rounded-xl flex text-sm justify-between items-center ${
                                currentChatId === chatId
                                  ? 'bg-[var(--primary-accent)]'
                                  : 'bg-[var(--secondary-bg)]'
                              }`}
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
                                <span
                                  onClick={() => switchChat(spaceId, chatId)}
                                  className="flex-grow"
                                >
                                  {spaces[spaceId].chats[chatId].title}
                                </span>
                              )}
                              <FontAwesomeIcon
                                icon={faEdit}
                                className="ml-2 text-[var(--foreground)] cursor-pointer"
                                onClick={() => handleEditChatName(spaceId, chatId)}
                              />
                              <FontAwesomeIcon
                                icon={faTrash}
                                className="ml-2 text-[var(--foreground)] cursor-pointer delete-icon"
                                onClick={() => handleDeleteChat(spaceId, chatId)}
                              />
                              <FontAwesomeIcon
                                icon={faShareAlt}
                                title="Share Chat"
                                className="ml-2 text-[var(--foreground)] cursor-pointer"
                                onClick={() => openShareModal(spaceId, chatId)}
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom for new space button */}
        <div className="flex justify-center">
          {(userRole === 'ta' || userRole === 'professor') && (
            <button
              onClick={createNewSpace}
              className="bg-[var(--primary-accent)] text-[var(--foreground)] px-4 py-2 rounded-xl"
              style={{ width: '50%' }}
            >
              + New Space
            </button>
          )}
        </div>
      </div>

      {/* Space and Chat UI */}
      <div className="w-4/5 p-4 flex flex-col bg-chat">
      {currentSpaceId && !currentChatId ? (
        currentSpaceId === personalAssistantSpaceId ? (
          // For the Personal Assistant space, render the SpacePage if TA/professor, else student view.
          userRole === 'ta' || userRole === 'professor' ? (
            <SpacePage
              spaceTitle={spaces[currentSpaceId].title}
              spaceId={currentSpaceId}
              handleEditSpaceName={handleEditSpaceName}
              handleSaveSpaceName={handleSaveSpaceName}
              handleDeleteSpace={handleDeleteSpace}
            />
          ) : (
            <StudentSpaceManagement
              currentSpaceId={currentSpaceId}
              userRole={userRole}
              handleLogout={handleLogout}
              whiteLogoOnly={whiteLogoOnly}
            />
          )
        ) : (
          // For non-personal-assistant spaces:
          userRole === 'ta' || userRole === 'professor' ? (
            showChatPlus ? (
              <ChatPlusPage
                spaceId={currentSpaceId}
                spaceTitle={spaces[currentSpaceId].title}
                chats={spaces[currentSpaceId].chats}
                switchChat={switchChat} 
                handleDeleteSpace={handleDeleteSpace}
                handleSaveSpaceName={handleSaveSpaceName}
                handleEditSpaceName={handleEditSpaceName}
              />
            ) : (
              <SpacePage
                spaceTitle={spaces[currentSpaceId].title}
                spaceId={currentSpaceId}
                handleEditSpaceName={handleEditSpaceName}
                handleSaveSpaceName={handleSaveSpaceName}
                handleDeleteSpace={handleDeleteSpace}
              />
            )
          ) : (
            // For students, ignore ChatPlus mode and show the student view.
            <StudentSpaceManagement
              currentSpaceId={currentSpaceId}
              userRole={userRole}
              handleLogout={handleLogout}
              whiteLogoOnly={whiteLogoOnly}
            />
          )
        )
      ) : currentChatId ? (
          <>
            {/* Top Bar with Logo and Profile Icon */}
            <div className="bg-gray-800 bg-transparent p-4 rounded-t-lg flex justify-between items-center">
              <Image
                src={theme === 'light' ? blackLogoOnly : whiteLogoOnly}
                alt="TomoAI Logo"
                width={100}
                height={40}
                className="object-contain"
              />
              {/* Profile Icon */}
              <div className="relative" ref={dropdownRef}>
                <FontAwesomeIcon
                  icon={faUser}
                  className={`cursor-pointer ${theme === 'light' ? 'text-black' : 'text-white'}`}
                  size="lg"
                  onClick={() => setDropdownVisible(!dropdownVisible)}
                />
                {dropdownVisible && (
                  <div className="absolute right-0 mt-2 w-48 bg-[var(--secondary-bg)] rounded-lg shadow-lg z-10">
                    <ul className="py-1 text-[var(--foreground)]">
                      <li className="px-4 py-2 hover:bg-[var(--hover-bg)] cursor-pointer flex items-center">
                        <FontAwesomeIcon icon={faUser} className="mr-2" /> Profile
                      </li>
                      <hr className="border-t border-[var(--border)] my-1" />
                      {/* Theme Toggle Button */}
                      <li
                        onClick={toggleTheme}
                        className={`px-4 py-2 cursor-pointer flex items-center justify-between ${
                          theme === 'light' ? 'bg-[#A3D8F4] text-black' : 'bg-[#2d3748] text-white'
                        }`}
                      >
                        {theme === 'light'
                          ? 'Switch to Dark Mode'
                          : 'Switch to Light Mode'}
                      </li>
                      <hr className="border-t border-[var(--border)] my-1" />
                      <li
                        onClick={handleLogout}
                        className="px-4 py-2 hover:bg-[var(--hover-bg)] cursor-pointer flex items-center"
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
                      className={`my-2 ${msg.role === 'user' ? 'text-right' : 'text-left flex items-center'}`}
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
                      <p className={`inline-block p-2 rounded-lg text-[var(--foreground)]`}>
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
                chats={currentSpaceId && spaces[currentSpaceId] ? spaces[currentSpaceId].chats : {}}
                updateChatMessages={(chatId, message) => {
                  const updatedSpaces = { ...spaces };
                  if (updatedSpaces[currentSpaceId] && updatedSpaces[currentSpaceId].chats[chatId]) {
                    if (message.role === 'ai' && message.content.response) {
                      const formattedMessage = {
                        role: 'ai',
                        content: <MessageFormatter content={message.content} />
                      };
                      updatedSpaces[currentSpaceId].chats[chatId].messages.push(formattedMessage);
                    } else {
                      updatedSpaces[currentSpaceId].chats[chatId].messages.push({
                        role: message.role,
                        content: (
                          <div className={`p-4 rounded-md ${message.role === 'ai' ? `bg-[var(--secondary-bg)] text-[var(--foreground)]` : 'bg-[var(--primary-accent)] text-[var(--foreground)]'}`}>
                            {message.content}
                          </div>
                        )
                      });
                    }
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
      
      {showShareModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-[var(--secondary-bg)] p-4 rounded-lg">
            <h2 className="text-2xl m-5">Select Students to Share the Chat With: </h2>
            <div className="max-h-60 overflow-y-auto mx-5">
              {shareModalStudents.length > 0 ? (
                shareModalStudents.map((student) => (
                  <div key={student.firebaseUid} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      checked={selectedStudents[student.firebaseUid] || false}
                      onChange={(e) =>
                        handleCheckboxChange(student.firebaseUid, e.target.checked)
                      }
                      className="mr-2"
                    />
                    <span>{`${student.firstName} ${student.lastName}`}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No students found in this space.</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="bg-[var(--primary-accent)] text-[var(--foreground)] px-3 py-1 rounded mr-2"
                onClick={handleShare}
              >
                Share
              </button>
              <button
                className="bg-gray-500 text-white px-3 py-1 rounded"
                onClick={() => setShowShareModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hide scrollbar for the chat area */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          scrollbar-width: none; /* For Firefox */
        }
        .delete-icon:hover {
          color: red;
        }
      `}</style>
    </div>
  );
}
