'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faTrash, faPlus, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import whiteLogoOnly from '../resources/whiteLogoOnly.png';
import { jsPDF } from 'jspdf';



export default function SpacePage({ spaceTitle, spaceId, handleSaveSpaceName, handleDeleteSpace }) {
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [newSpaceName, setNewSpaceName] = useState(spaceTitle);
    const [isEditing, setIsEditing] = useState(false);
    const dropdownRef = useRef(null);
    const router = useRouter();
    const [documents, setDocuments] = useState([]);
    const [spaceUsers, setSpaceUsers] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]); // Array to hold selected user IDs

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/signin');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const startEditing = () => {
        setIsEditing(true);
    };

    const saveSpaceName = () => {
        if (newSpaceName.trim() !== '') {
            handleSaveSpaceName(spaceId, newSpaceName);
        }
        setIsEditing(false);
    };


    useEffect(() => {
        setNewSpaceName(spaceTitle);
    }, [spaceTitle]);

    // Fetch documents from the database when the component mounts
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                const response = await fetch(`http://localhost:3009/api/documents?spaceId=${spaceId}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch documents');
                }

                const data = await response.json();
                setDocuments(data.documents);
            } catch (error) {
                console.error('Error fetching documents:', error);
            }
        };

        fetchDocuments();
    }, [spaceId]);
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

    // Handle document upload
    const handleUploadDocument = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file || file.type !== 'application/pdf') {
                alert('Please select a valid PDF file');
                return;
            }

            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('spaceId', spaceId); // Add the spaceId
            formData.append('title', file.name); // Add the document title

            const response = await fetch('http://localhost:3009/api/upload-pdf', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload and process PDF');
            }

            // Parse the response to get the newly created document metadata
            const newDocument = await response.json();
            console.log('New document received from server:', newDocument);

            // Check if the newDocument has all required fields
            if (
                !newDocument ||
                !newDocument.title ||
                !newDocument.spaceId ||
                !newDocument.documentId
            ) {
                console.error('Incomplete document data received:', newDocument);
                throw new Error('Document data is incomplete');
            }

            // Prevent duplicate documents in state
            setDocuments((prevDocuments) => {
                const exists = prevDocuments.some(doc => doc.documentId === newDocument.documentId);
                if (!exists) {
                    return [...prevDocuments, {
                        _id: newDocument.documentId,
                        title: newDocument.title,
                        spaceId: newDocument.spaceId,
                        chunksSaved: newDocument.chunksSaved,
                        content: newDocument.content,
                    }];
                }
                return prevDocuments;
            });

            alert(`PDF uploaded and processed successfully with ${newDocument.chunksSaved} chunks`);
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Error uploading document');
        }
    };








    // Function to handle document deletion
    const handleDeleteDocument = async (documentId) => {
        try {
            const response = await fetch(`http://localhost:3009/api/documents/${documentId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete document');
            }

            // Remove the deleted document from the state
            setDocuments((prevDocuments) => prevDocuments.filter((doc) => doc._id !== documentId));
            alert('Document deleted successfully');
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Error deleting document');
        }
    };

    // Handle removing a user from the space
    const handleRemoveUserFromSpace = async (userId) => {
        try {
            const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}/users/${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to remove user from the space');
            }

            // Update space users in the state
            setSpaceUsers((prevUsers) => prevUsers.filter((id) => id !== userId));
        } catch (error) {
            console.error('Error removing user from space:', error);
        }
    };

    useEffect(() => {
        fetchAllUsers();
        fetchSpaceUsers();
    }, [spaceId]);

    // Show overlay to add users
    const handleAddUser = () => {
        fetchAllUsers();
        setUserOverlayVisible(true);
    };

    // Function to handle adding a user to the space
    const handleAddUserToSpace = async (userId) => {
        if (!userId) {
            console.log("No userId provided to add to space");
            return;
        }

        try {
            console.log("Adding user with firebaseUid:", userId);

            // Making a PUT request to add the user to the space
            const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}/users`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId }), // Send the userId (firebaseUid) to the backend
            });

            if (!response.ok) {
                throw new Error('Failed to add user to the space');
            }

            // If successful, update the spaceUsers state
            setSpaceUsers((prevUsers) => [...prevUsers, userId]);
            console.log('User successfully added to the space:', userId);
        } catch (error) {
            console.error('Error adding user to space:', error);
        }
    };


    // Function to toggle user selection
    const toggleUserSelection = (userId) => {
        console.log('Toggling user selection for ID:', userId);
        setSelectedUsers((prevSelected) => {
            if (prevSelected.includes(userId)) {
                // If the user is already selected, remove them
                return prevSelected.filter((id) => id !== userId);
            } else {
                // If the user is not selected, add them
                return [...prevSelected, userId];
            }
        });
    };



    const fetchAllUsers = async () => {
        try {
            const response = await fetch('http://localhost:3009/api/users');
            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }
            const usersData = await response.json();
            console.log('Fetched all users:', usersData); // Log the users to check
            setAllUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    // Fetch users for the current space when the component mounts or spaceId changes
    useEffect(() => {
        const fetchSpaceUsers = async () => {
            try {
                const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch space users");
                }

                const spaceData = await response.json();
                if (!spaceData || !Array.isArray(spaceData.users)) {
                    throw new Error("Invalid space data format");
                }

                // Update both spaceUsers and selectedUsers from the database
                setSpaceUsers(spaceData.users);
                setSelectedUsers(spaceData.users); // Sync checkboxes with saved users
            } catch (error) {
                console.error("Error fetching space users:", error);
            }
        };

        if (spaceId) {
            fetchSpaceUsers();
        }
    }, [spaceId]);


    // Fetch users for the current space from the database
    const fetchSpaceUsers = async () => {
        try {
            const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch space users');
            }
            const spaceData = await response.json();
            setSpaceUsers(spaceData.users || []);
        } catch (error) {
            console.error('Error fetching space users:', error);
        }
    };

    const handleToggleVisibility = async (documentId, newVisibility) => {
        try {
            const response = await fetch(`http://localhost:3009/api/documents/${documentId}/visibility`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visibility: newVisibility }),
            });

            if (!response.ok) {
                throw new Error('Failed to update document visibility');
            }

            const updatedDocument = await response.json();
            setDocuments((prevDocuments) =>
                prevDocuments.map((doc) =>
                    doc._id === documentId ? { ...doc, visibility: updatedDocument.visibility } : doc
                )
            );
        } catch (error) {
            console.error('Error updating document visibility:', error);
        }
    };

  // // Function to generate summary and open it as a PDF.
  // const handleSummary = async (doc) => {
  //   try {
  //     const response = await fetch('http://localhost:3009/api/document-summary', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ documentContent: doc.content, documentId: doc._id })
  //     });
  //     if (!response.ok) {
  //       throw new Error('Failed to generate summary');
  //     }
  //     const data = await response.json();
  //     const summary = data.summary;
  //     console.log("Summary text:", summary);

  //     const pdfDoc = new jsPDF();
  //     pdfDoc.setTextColor(0, 0, 0);
  //     pdfDoc.setFont("helvetica", "normal");
  //     pdfDoc.setFontSize(12);

  //     const lines = pdfDoc.splitTextToSize(summary, 180);
  //     let yPosition = 20;
  //     const pageHeight = pdfDoc.internal.pageSize.getHeight();
  //     const margin = 20;
  //     lines.forEach((line) => {
  //       if (yPosition > pageHeight - margin) {
  //         pdfDoc.addPage();
  //         yPosition = margin;
  //       }
  //       pdfDoc.text(line, 10, yPosition);
  //       yPosition += 7;
  //     });

  //     pdfDoc.output('dataurlnewwindow');
  //   } catch (error) {
  //     console.error('Error generating summary PDF:', error);
  //   }
  // };

  // const handleQuiz = async (doc) => {
  //   try {
  //     const response = await fetch('http://localhost:3009/api/document-quiz', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ documentContent: doc.content, documentId: doc._id }),
  //     });
  
  //     if (!response.ok) {
  //       throw new Error('Failed to generate quiz');
  //     }
  
  //     const data = await response.json();
  //     const quizText = data.quiz;
  
  //     if (!quizText) {
  //       throw new Error('Quiz generation failed, empty response received');
  //     }
  
  //     // Create PDF
  //     const pdfDoc = new jsPDF();
  //     pdfDoc.setTextColor(0, 0, 0);
  //     pdfDoc.setFont('helvetica', 'normal');
  //     pdfDoc.setFontSize(12);
  
  //     let yPosition = 20;
  //     const pageHeight = pdfDoc.internal.pageSize.getHeight();
  //     const margin = 20;
  
  //     // Title
  //     pdfDoc.setFontSize(16);
  //     pdfDoc.text('Multiple Choice Quiz', 10, yPosition);
  //     yPosition += 10;
  //     pdfDoc.setFontSize(12);
  
  //     // Split quiz into questions and answer key.
  //     // Assumes the API returns a string with "Answer Key:" as the divider.
  //     const quizParts = quizText.split('Answer Key:');
  //     const quizQuestions = quizParts[0].trim().split('\n'); // Questions and options
  //     const answerKey = quizParts[1] ? quizParts[1].trim().split(', ') : [];
  
  //     // Add quiz questions and options with text wrapping.
  //     quizQuestions.forEach((line) => {
  //       const wrappedLines = pdfDoc.splitTextToSize(line, 180);
  //       wrappedLines.forEach((wrappedLine) => {
  //         if (yPosition > pageHeight - margin) {
  //           pdfDoc.addPage();
  //           yPosition = margin;
  //         }
  //         pdfDoc.text(wrappedLine, 10, yPosition);
  //         yPosition += 7;
  //       });
  //     });
  
  //     // Add answer key at the bottom.
  //     if (yPosition > pageHeight - 2 * margin) {
  //       pdfDoc.addPage();
  //       yPosition = margin;
  //     }
  
  //     pdfDoc.setFontSize(14);
  //     pdfDoc.text('Answer Key:', 10, yPosition);
  //     yPosition += 8;
  //     pdfDoc.setFontSize(12);
  
  //     answerKey.forEach((answer) => {
  //       const wrappedAnswer = pdfDoc.splitTextToSize(answer, 180);
  //       wrappedAnswer.forEach((line) => {
  //         if (yPosition > pageHeight - margin) {
  //           pdfDoc.addPage();
  //           yPosition = margin;
  //         }
  //         pdfDoc.text(line, 10, yPosition);
  //         yPosition += 6;
  //       });
  //     });
  
  //     pdfDoc.output('dataurlnewwindow'); // Open in a new window
  //   } catch (error) {
  //     console.error('Error generating quiz PDF:', error);
  //     alert('Error generating quiz');
  //   }
  // };

  // Helper: Parse a single markdown line and return its text plus style settings.
  function processMarkdownLine(line) {
    // Default style
    let style = { fontSize: 12, fontStyle: 'normal', indent: 0 };

    // Check for headers: lines starting with one or more '#' followed by a space.
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      style.fontStyle = 'bold';
      // Adjust font size based on header level.
      if (level === 1) style.fontSize = 18;
      else if (level === 2) style.fontSize = 16;
      else if (level === 3) style.fontSize = 14;
      else style.fontSize = 12;
      line = headerMatch[2];
    }

    // Check for bullet lists: if line starts with "- " or "* "
    const bulletMatch = line.match(/^(\-|\*)\s+(.*)$/);
    if (bulletMatch) {
      style.indent = 10; // indent bullet items
      // Replace marker with a bullet character.
      line = "• " + bulletMatch[2];
    }

    // Inline formatting: remove markers for bold and italics.
    // (For inline changes, jsPDF cannot change style mid‐line so we simply remove the markers.)
    line = line.replace(/\*\*(.*?)\*\*/g, '$1');
    line = line.replace(/\*(.*?)\*/g, '$1');
    line = line.replace(/_(.*?)_/g, '$1');

    return { text: line, style };
  }

  // Helper: Print a processed line with wrapping. Returns the new yPosition.
  function printMarkdownLine(pdfDoc, text, style, yPosition, margin, maxWidth) {
    // Set the desired font style and size.
    pdfDoc.setFont('helvetica', style.fontStyle);
    pdfDoc.setFontSize(style.fontSize);
    const indent = style.indent || 0;
    // Wrap the text (adjust max width for indent)
    const wrappedLines = pdfDoc.splitTextToSize(text, maxWidth - indent);
    wrappedLines.forEach((wrappedLine) => {
      // If we exceed the page, add a new page.
      if (yPosition > pdfDoc.internal.pageSize.getHeight() - margin) {
        pdfDoc.addPage();
        yPosition = margin;
        // Reset default font after page break.
        pdfDoc.setFont('helvetica', style.fontStyle);
        pdfDoc.setFontSize(style.fontSize);
      }
      pdfDoc.text(wrappedLine, margin + indent, yPosition);
      // Increase yPosition using a line-height factor (adjust as needed).
      yPosition += style.fontSize * 0.8;
    });
    return yPosition;
  }

  // Function to generate summary and open it as a PDF.
  const handleSummary = async (doc) => {
    try {
      const response = await fetch('http://localhost:3009/api/document-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentContent: doc.content, documentId: doc._id })
      });
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      const data = await response.json();
      const summary = data.summary;
      console.log("Summary text:", summary);

      const pdfDoc = new jsPDF();
      pdfDoc.setTextColor(0, 0, 0);
      // Start with default font settings.
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(12);

      let yPosition = 20;
      const margin = 20;
      const maxWidth = 180;

      // Process summary text line-by-line.
      const lines = summary.split('\n');
      lines.forEach((line) => {
        const { text, style } = processMarkdownLine(line);
        yPosition = printMarkdownLine(pdfDoc, text, style, yPosition, margin, maxWidth);
      });

      pdfDoc.output('dataurlnewwindow');
    } catch (error) {
      console.error('Error generating summary PDF:', error);
    }
  };

  // Function to generate MCQ quiz and open it as a PDF.
  const handleQuiz = async (doc) => {
    try {
      const response = await fetch('http://localhost:3009/api/document-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentContent: doc.content, documentId: doc._id }),
      });
    
      if (!response.ok) {
        throw new Error('Failed to generate quiz');
      }
    
      const data = await response.json();
      const quizText = data.quiz;
    
      if (!quizText) {
        throw new Error('Quiz generation failed, empty response received');
      }
    
      const pdfDoc = new jsPDF();
      pdfDoc.setTextColor(0, 0, 0);
      pdfDoc.setFont('helvetica', 'normal');
      pdfDoc.setFontSize(12);
    
      let yPosition = 20;
      const margin = 20;
      const maxWidth = 180;
    
      // Title for the quiz.
      pdfDoc.setFontSize(16);
      pdfDoc.setFont('helvetica', 'bold');
      pdfDoc.text('Multiple Choice Quiz', margin, yPosition);
      yPosition += 12;
      pdfDoc.setFontSize(12);
      pdfDoc.setFont('helvetica', 'normal');
    
      // Split quiz text into two parts: questions/options and answer key.
      const quizParts = quizText.split('Answer Key:');
      const quizContent = quizParts[0].trim();
      const answerContent = quizParts[1] ? quizParts[1].trim() : '';
    
      // Process the quiz questions/options line-by-line.
      const quizLines = quizContent.split('\n');
      quizLines.forEach((line) => {
        const { text, style } = processMarkdownLine(line);
        yPosition = printMarkdownLine(pdfDoc, text, style, yPosition, margin, maxWidth);
      });
    
      // Add a break before the answer key.
      if (yPosition > pdfDoc.internal.pageSize.getHeight() - 2 * margin) {
        pdfDoc.addPage();
        yPosition = margin;
      }
      pdfDoc.setFontSize(14);
      pdfDoc.setFont('helvetica', 'bold');
      yPosition = printMarkdownLine(pdfDoc, 'Answer Key:', { fontSize: 14, fontStyle: 'bold', indent: 0 }, yPosition, margin, maxWidth);
    
      // Process the answer key (split by commas if needed).
      pdfDoc.setFontSize(12);
      pdfDoc.setFont('helvetica', 'normal');
      const answerLines = answerContent.split('\n').flatMap(line => line.split(', '));
      answerLines.forEach((line) => {
        const { text, style } = processMarkdownLine(line);
        yPosition = printMarkdownLine(pdfDoc, text, style, yPosition, margin, maxWidth);
      });
    
      pdfDoc.output('dataurlnewwindow'); // Open in a new window
    } catch (error) {
      console.error('Error generating quiz PDF:', error);
      alert('Error generating quiz');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-transparent p-4 flex justify-between items-center">
        <Image
          src={whiteLogoOnly}
          alt="TomoAI Logo"
          width={100}
          height={40}
          className="object-contain"
        />

        <div className="flex items-center justify-center flex-grow">
          {isEditing ? (
            <input
              type="text"
              value={newSpaceName}
              onChange={(e) => setNewSpaceName(e.target.value)}
              onBlur={saveSpaceName}
              className="bg-transparent text-[var(--foreground)] p-2 rounded-lg text-center"
              autoFocus
            />
          ) : (
            <h1
              className="bg-transparent text-[var(--foreground)] text-2xl cursor-pointer"
              onClick={startEditing}
            >
              {spaceTitle}
            </h1>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <FontAwesomeIcon
            icon={faTrash}
            className="text-red-600 cursor-pointer"
            onClick={() => handleDeleteSpace(spaceId)}
          />

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
      </div>

      <div className="flex flex-grow p-4">
        <div className="w-1/2 p-4 bg-transparent rounded-lg relative">
          <h2 className="text-[var(--foreground)] text-xl mb-4 text-center">Document Management</h2>
          <table className="w-full text-[var(--foreground)] bg-transparent">
          <thead>
            <tr>
              <th className="text-left p-2">Document Name</th>
              <th className="text-center p-2">Summary</th>
              <th className="text-center p-2">Quiz</th>
              <th className="text-center p-2">Visibility</th>
              <th className="text-center p-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc._id} className="text-center">
                <td className="p-2 text-left border-b border-gray-700">{doc.title}</td>
                <td className="p-2 border-b border-gray-700">
                  <button
                    onClick={() => handleSummary(doc)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Summary
                  </button>
                </td>
                <td className="p-2 border-b border-gray-700">
                  <button
                    onClick={() => handleQuiz(doc)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Quiz
                  </button>
                </td>
                <td className="p-2 text-center border-b border-gray-700">
                  <input
                    type="checkbox"
                    checked={doc.visibility}
                    onChange={() => handleToggleVisibility(doc._id, !doc.visibility)}
                    className="form-checkbox"
                  />
                </td>
                <td className="p-2 text-center border-b border-gray-700">
                  <button
                    onClick={() => handleDeleteDocument(doc._id)}
                    className="bg-red-500 p-1 rounded"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
          <div className="absolute top-4 right-4">
            <label htmlFor="file-upload" className="cursor-pointer">
              <FontAwesomeIcon icon={faPlus} className="text-green-500 text-2xl" />
            </label>
            <input
              id="file-upload"
              type="file"
              accept="application/pdf"
              onChange={handleUploadDocument}
              className="hidden"
            />
          </div>
        </div>

        <div className="w-px bg-gray-500 mx-4"></div>

        <div className="w-1/2 p-4 bg-transparent rounded-lg relative">
          <h2 className="text-[var(--foreground)] text-xl mb-4 text-center">User Management</h2>
          <table className="w-full text-[var(--foreground)] bg-transparent">
            <thead>
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Add/Remove</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user, index) => (
                <tr key={user.firebaseUid || index}>
                  <td className="border px-4 py-2">{user.firstName} {user.lastName}</td>
                  <td className="border px-4 py-2">{user.email}</td>
                  <td className="border px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.firebaseUid)}
                      onChange={async (e) => {
                        const userId = user.firebaseUid;
                        console.log('User ID:', userId, 'Checked:', e.target.checked);
                        if (e.target.checked) {
                          setSelectedUsers((prevSelected) => [...prevSelected, userId]);
                          await handleAddUserToSpace(userId);
                        } else {
                          setSelectedUsers((prevSelected) => prevSelected.filter((id) => id !== userId));
                          handleRemoveUserFromSpace(userId);
                        }
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}