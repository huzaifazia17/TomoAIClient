'use client';
import { useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons'; // Import the up-arrow icon

export default function ChatPage({ currentChatId, chats, updateChatMessages }) {
  const [prompt, setPrompt] = useState(''); // User's input prompt
  const [loading, setLoading] = useState(false); // Track loading state
  const [error, setError] = useState(''); // Track error state

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;  // Prevent sending empty messages
    setLoading(true); // Start loading
    setError(''); // Clear previous errors

    // Add the user's message to the conversation immediately
    const userMessage = { role: 'user', content: prompt };
    updateChatMessages(currentChatId, userMessage); // Append user's message

    try {
      // Send the user's prompt to the backend
      const res = await axios.post('http://localhost:3009/api/chat', { prompt });

      // Add AI response to the conversation
      const aiResponse = { role: 'ai', content: res.data.message };
      updateChatMessages(currentChatId, aiResponse); // Append AI's response

      // Clear the prompt after submission
      setPrompt('');
    } catch (err) {
      console.error("Error in request:", err);
      setError('Failed to get a response from the AI.');
    } finally {
      setLoading(false); // Stop loading
    }
  };

  // Function to handle Enter keypress
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();  // Prevent new line from being added
      handleSubmit(e);      // Submit the form on Enter
    }
  };

  return (
    <>
      {/* Error message display */}
      {error && (
        <div className="p-4 bg-red-600 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Message input form */}
      <form onSubmit={handleSubmit} className="flex justify-center w-full mt-2">
        <div className="relative w-4/5"> {/* Increased width */}
          <textarea
            className="w-full p-3 border-gray-300 rounded-full bg-gray-800 text-white pr-10 resize-none overflow-auto text-center"
            style={{
              maxHeight: '150px',
              scrollbarWidth: 'none',   // For Firefox
              msOverflowStyle: 'none',  // For Internet Explorer and Edge
            }}
            rows="1"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown} // Handle Enter key press
            placeholder="Ask away :)"
            required
          ></textarea>
          {/* Hide scrollbar for Chrome, Safari, and Edge */}
          <style jsx>{`
            textarea::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <button
            type="submit"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white opacity-50 cursor-pointer"  // Transparent icon
            disabled={loading}
          >
            <FontAwesomeIcon icon={faArrowUp} size="lg" />
          </button>
        </div>
      </form>
    </>
  );
}
