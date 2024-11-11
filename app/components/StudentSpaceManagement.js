'use client';
import { useEffect, useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faTrash, faPlus, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import whiteLogoOnly from '../resources/whiteLogoOnly.png';
import Image from 'next/image';


const StudentSpaceManagement = ({ currentSpaceId, userRole, handleLogout, whiteLogoOnly }) => {
    const [documents, setDocuments] = useState([]);
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const dropdownRef = useRef(null);
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
    useEffect(() => {
        if (userRole === 'student' && currentSpaceId) {
            // Fetch documents for the current space
            const fetchDocuments = async () => {
                try {
                    const response = await fetch(`http://localhost:3009/api/documents?spaceId=${currentSpaceId}`);
                    if (response.ok) {
                        const data = await response.json();
                        // Filter to only include visible documents
                        const visibleDocuments = data.documents.filter(doc => doc.visibility === true);
                        setDocuments(visibleDocuments);
                    } else {
                        console.error('Failed to fetch documents');
                    }
                } catch (error) {
                    console.error('Error fetching documents:', error);
                }
            };

            fetchDocuments();
        }
    }, [currentSpaceId, userRole]);

    return (
        <div className="bg-transparent p-4 flex flex-col h-full">
            {/* Top Bar with Logo and Profile Icon */}
            <div className="flex justify-between items-center mb-8 w-full px-4">
                <Image
                    src={whiteLogoOnly}
                    alt="TomoAI Logo"
                    width={100}
                    height={40}
                    className="object-contain"
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

            {/* Centered List of Space Documents */}
            <div className="flex justify-center mt-8">

                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg w-3/4 md:w-1/2 p-4">
                    <div className="flex items-center justify-center mb-4">
                        <h2 className="text-white text-xl font-semibold text-center">Space Documents</h2>
                        <div className="ml-2 relative group">
                            <FontAwesomeIcon icon={faQuestionCircle} className="text-gray-400 cursor-pointer" />
                            <span className="absolute left-1/2 transform -translate-x-1/2 -translate-y-full bg-black text-white text-xs rounded p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg w-64 text-center">
                                There may be other documents uploaded to the space that students do not have access to view.
                            </span>
                        </div>
                    </div>

                    <table className="w-full text-white bg-transparent">
                        <thead>

                        </thead>
                        <tbody>
                            {documents
                                .filter(doc => doc.visibility === true) // Only show documents with visibility set to true
                                .map(doc => (
                                    <tr key={doc._id}>
                                        <td className="p-2 border-b border-gray-700">{doc.title}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );


};

export default StudentSpaceManagement;
