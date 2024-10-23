'use client';
import { useState } from 'react';
import axios from 'axios';

export default function ChatPage({ currentChatId, chats, updateChatMessages }) {
  const [prompt, setPrompt] = useState(''); // User's input prompt
  const [loading, setLoading] = useState(false); // Track loading state
  const [error, setError] = useState(''); // Track error state

  // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading
    setError(''); // Clear previous errors

    // Add the user's message to the conversation immediately
    const userMessage = { role: 'user', content: prompt };
    updateChatMessages(currentChatId, userMessage); // Append user's message

    try {
      // Send the user's prompt to the backend
      const res = await axios.post('http://localhost:3001/api/chat', { prompt });

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

  return (
    <>
      {/* Error message display */}
      {error && (
        <div className="p-4 bg-red-600 rounded">
          <p>{error}</p>
        </div>
      )}

      {/* Message input form */}
      <form onSubmit={handleSubmit} className="flex w-full">
        <textarea
          className="flex-grow p-2 border border-gray-300 rounded-l-lg bg-gray-800 text-white"
          rows="2"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your message here..."
          required
        ></textarea>
        <button
          type="submit"
          className="p-2 bg-blue-600 text-white rounded-r-lg"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </>
  );
}
