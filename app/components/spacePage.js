'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faTrash, faPlus } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import whiteLogoOnly from '../resources/whiteLogoOnly.png';



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


    /*     // Add selected users to space
        const handleAddSelectedUsers = async () => {
            try {
                // Ensure selectedUsers contains valid user IDs
                const usersToAdd = allUsers
                    .filter((user) => selectedUsers.includes(user.id))
                    .map((user) => user.id);
    
                if (usersToAdd.length === 0) {
                    console.warn('No valid users selected to add');
                    return;
                }
    
                console.log("Adding users to space:", usersToAdd);
    
                const response = await fetch(`http://localhost:3009/api/spaces/${spaceId}/users`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ users: usersToAdd }),
                });
    
                if (!response.ok) {
                    throw new Error('Failed to add users to the space');
                }
    
                // Update space users in the state
                const updatedUsers = allUsers.filter((user) => selectedUsers.includes(user.id));
                setSpaceUsers((prevUsers) => [...prevUsers, ...updatedUsers]);
                setUserOverlayVisible(false); // Close the overlay
                setSelectedUsers([]); // Clear selected users
            } catch (error) {
                console.error('Error adding users to space:', error);
            }
        }; */


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
                            className="bg-transparent text-white p-2 rounded-lg text-center"
                            autoFocus
                        />
                    ) : (
                        <h1
                            className="bg-transparent text-white text-2xl cursor-pointer"
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
                                    <li onClick={handleLogout} className="px-4 py-2 text-gray-300 hover:bg-gray-600 cursor-pointer flex items-center">
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
                    <h2 className="text-white text-xl mb-4 text-center">Document Management</h2>
                    <table className="w-full text-white bg-transparent">
                        <thead>
                            <tr>
                                <th className="text-left p-2">Document Name</th>
                                <th className="text-center p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map((doc) => (
                                <tr key={doc._id}>
                                    <td className="p-2">{doc.title}</td>
                                    <td className="p-2 text-center">
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
                    <h2 className="text-white text-xl mb-4 text-center">User Management</h2>
                    <table className="w-full text-white bg-transparent">
                        <thead>
                            <tr>
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Email</th>
                                <th className="text-left p-2">Add/Remove</th>

                            </tr>
                        </thead>
                        <tbody>
                            {allUsers.map((user, index) => {
                                return (
                                    <tr key={user.firebaseUid || index}>
                                        <td className="border px-4 py-2">{user.firstName} {user.lastName}</td>
                                        <td className="border px-4 py-2">{user.email}</td>
                                        <td className="border px-4 py-2 text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(user.firebaseUid)} // Check if the user is in selectedUsers
                                                onChange={async (e) => {
                                                    const userId = user.firebaseUid;
                                                    console.log('User ID:', userId, 'Checked:', e.target.checked); // Log the user ID and checkbox status

                                                    if (e.target.checked) {
                                                        // Add the user ID to selectedUsers if checked
                                                        setSelectedUsers((prevSelected) => {
                                                            const updated = [...prevSelected, userId];
                                                            console.log('Updated selected users:', updated); // Log the updated selected users
                                                            return updated;
                                                        });

                                                        // Update the database with the new user
                                                        await handleAddUserToSpace(userId);
                                                    } else {
                                                        // Remove the user ID from selectedUsers if unchecked
                                                        setSelectedUsers((prevSelected) => {
                                                            const updated = prevSelected.filter((id) => id !== userId);
                                                            console.log('Updated selected users:', updated); // Log the updated selected users
                                                            return updated;
                                                        });

                                                        // Call handleRemoveUserFromSpace to remove the user from the database
                                                        handleRemoveUserFromSpace(userId);
                                                    }
                                                }}
                                            />
                                            {/*     <button
                    onClick={() => handleRemoveUserFromSpace(user.firebaseUid)}
                    className="ml-2 text-red-500"
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button> */}
                                        </td>
                                    </tr>
                                );
                            })}




                        </tbody>
                    </table>
                    {/*                     <div className="absolute top-4 right-4">
                        <button onClick={handleAddUser} className="text-green-500 text-2xl">
                            <FontAwesomeIcon icon={faPlus} />
                        </button>
                    </div> */}
                </div>
            </div>


        </div>
    );
}
