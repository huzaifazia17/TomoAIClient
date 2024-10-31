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
    const [isUserOverlayVisible, setUserOverlayVisible] = useState(false);
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

    // Fetch all users from the database
    const fetchAllUsers = async () => {
        try {
            const response = await fetch('http://localhost:3009/api/users');
            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }
            const usersData = await response.json();
            setAllUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    // Handle document upload
    const handleUploadDocument = (event) => {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            const newDoc = { id: Date.now(), name: file.name, file };
            setDocuments((prevDocs) => [...prevDocs, newDoc]);
        }
    };

    // Handle document deletion
    const handleDeleteDocument = (docId) => {
        setDocuments(documents.filter((doc) => doc.id !== docId));
    };

    // Handle user deletion from space
    const handleDeleteUserFromSpace = (userId) => {
        setSpaceUsers(spaceUsers.filter((user) => user.id !== userId));
    };

    // Show overlay to add users
    const handleAddUser = () => {
        fetchAllUsers();
        setUserOverlayVisible(true);
    };

    // Toggle user selection in the overlay
    const toggleUserSelection = (userId) => {
        setSelectedUsers((prevSelected) => {
            if (prevSelected.includes(userId)) {
                return prevSelected.filter((id) => id !== userId);
            } else {
                return [...prevSelected, userId];
            }
        });
    };

    // Add selected users to space
    const handleAddSelectedUsers = () => {
        const newUsers = allUsers.filter(
            (user) => selectedUsers.includes(user.id) && !spaceUsers.some((u) => u.id === user.id)
        );
        setSpaceUsers([...spaceUsers, ...newUsers]);
        setUserOverlayVisible(false); // Close overlay
        setSelectedUsers([]); // Clear selected users
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
                                <tr key={doc.id}>
                                    <td className="p-2">{doc.name}</td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => handleDeleteDocument(doc.id)}
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
                                <th className="text-left p-2">First Name</th>
                                <th className="text-left p-2">Last Name</th>
                                <th className="text-left p-2">Email</th>
                                <th className="text-center p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {spaceUsers.map((user) => (
                                <tr key={user.id}>
                                    <td className="p-2">{user.firstName}</td>
                                    <td className="p-2">{user.lastName}</td>
                                    <td className="p-2">{user.email}</td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => handleDeleteUserFromSpace(user.id)}
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
                        <button onClick={handleAddUser} className="text-green-500 text-2xl">
                            <FontAwesomeIcon icon={faPlus} />
                        </button>
                    </div>
                </div>
            </div>

            {/* User Selection Overlay */}
            {isUserOverlayVisible && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center">
                    <div className="bg-gray-800 p-6 rounded-lg w-1/2">
                        <h2 className="text-white text-center text-xl mb-4">Add Users to Space</h2>
                        <ul className="text-white space-y-2 max-h-80 overflow-y-auto">
                            {allUsers.map((user) => (
                                <li key={user.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                                    <span>{user.firstName} {user.lastName} ({user.email})</span>
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => toggleUserSelection(user.id)}
                                    />
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={handleAddSelectedUsers}
                            className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
                        >
                            Add Selected
                        </button>
                        <button
                            onClick={() => setUserOverlayVisible(false)}
                            className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
