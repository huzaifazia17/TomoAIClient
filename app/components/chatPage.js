'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUp } from '@fortawesome/free-solid-svg-icons';

export default function ChatPage({ currentSpaceId, currentChatId, updateChatMessages }) {
  const [prompt, setPrompt] = useState(''); // User's input prompt
  const [loading, setLoading] = useState(false); // Track loading state
  const [error, setError] = useState(''); // Track error state
  const [sampleQuestions, setSampleQuestions] = useState([]);

  /* // Function to handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;  // Prevent sending empty messages
    setLoading(true); // Start loading
    setError(''); // Clear previous errors

    // Add the user's message to the conversation immediately
    const userMessage = { role: 'user', content: prompt };
    updateChatMessages(currentChatId, userMessage); // Append user's message

    try {
      // Send the user's prompt and spaceId to the backend
      const res = await axios.post('http://localhost:3009/api/chat', {
        prompt,
        spaceId: currentSpaceId
      });

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
  }; */

  // Fetch new sample questions on page load or refresh
  useEffect(() => {
    const fetchSampleQuestions = async () => {
      try {
        const res = await axios.post('http://localhost:3009/api/chat', {
          spaceId: currentSpaceId,
        });
        if (res.data.sampleQuestions) {
          setSampleQuestions(
            res.data.sampleQuestions.map((question) => question.split(' ').slice(0, 15).join(' '))
          );
        }
      } catch (err) {
        console.error("Error fetching sample questions:", err);
      }
    };
    fetchSampleQuestions();
  }, [currentSpaceId]);

  const renderMessage = (message) => {
    return (
      <div className={`message ${message.role}`}>
        <p>{message.content}</p>
        {message.imageUrl && <img src={message.imageUrl} alt="Generated content" />}
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');

    const userMessage = { role: 'user', content: prompt };
    updateChatMessages(currentChatId, userMessage);

    try {
      const res = await axios.post('http://localhost:3009/api/chat', {
        prompt,
        spaceId: currentSpaceId,
      });

      const aiResponse = { role: 'ai', content: res.data.message };
      updateChatMessages(currentChatId, aiResponse);
      setPrompt('');

      if (res.data.sampleQuestions) {
        setSampleQuestions(
          res.data.sampleQuestions.map(question => question.split(' ').slice(0, 5).join(' '))
        );
      }

      setPrompt('');
    } catch (err) {
      console.error("Error in request:", err);
      setError('Failed to get a response from the AI.');
    } finally {
      setLoading(false);
    }
  };

  const handleSampleQuestionClick = (question) => {
    setPrompt(question);
    handleSubmit({ preventDefault: () => { } });
  };


  // Function to handle Enter keypress
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
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

      {/* Container for Sample Questions and Message Input Box */}
      <div className="flex flex-col items-center w-full mt-2 space-y-2 ">
        {/* Sample Questions Section */}
        <div className="mx-4 w-4/5 flex justify-center gap-4">
          {sampleQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => setPrompt(question)}
              className="px-2 py-1 rounded-full text-center text-gray-200 hover:bg-gray-600 focus:outline-none transition-all"
              style={{
                backgroundColor: '#1a1e2e',
                fontSize: '0.75rem',
                color: '#e0e0e0',
                boxShadow: '0px 0px 8px rgba(13, 77, 133, 0.8)',
                border: 'none',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                //comment out if i want questions to wrap
                //whiteSpace: 'nowrap',
                margin: '0 8px', // Adds horizontal margin 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)'; // Slight zoom on hover
                e.currentTarget.style.boxShadow = '0px 0px 12px rgba(13, 77, 133, 1)'; // Stronger shadow on hover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0px 0px 8px rgba(13, 77, 133, 0.8)'; // Reset shadow
              }}
            >
              {question}
            </button>
          ))}
        </div>


        {/* Message Input Form */}
        <form onSubmit={handleSubmit} className="w-4/5">
          <div className="relative">
            <textarea
              className="w-full p-3 border-gray-300 rounded-full bg-gray-800 text-white pr-10 resize-none overflow-auto text-center"
              style={{
                maxHeight: '150px',
                scrollbarWidth: 'none', // For Firefox
                msOverflowStyle: 'none', // For Internet Explorer and Edge
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
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white opacity-50 cursor-pointer"
              disabled={loading}
            >
              <FontAwesomeIcon icon={faArrowUp} size="lg" />
            </button>
          </div>
        </form>
      </div>
    </>
  );



}
