import React, { createContext, useContext, useState } from 'react';

// Create the Context
const ProjectContext = createContext(null);

// Custom hook to use the store
export const useProjectStore = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectStore must be used within a ProjectProvider');
  }
  return context;
};

// Provider component
export const ProjectProvider = ({ children }) => {
  // Global Navigation State
  const [currentPage, setCurrentPage] = useState('upload'); // 'upload' | 'script' | 'voice' | 'video'

  // Global Project State
  const [productImage, setProductImage] = useState(null); // Local preview URL
  const [backendFilename, setBackendFilename] = useState(null); // Filename on server
  const [productDescription, setProductDescription] = useState('');
  
  const [scriptText, setScriptText] = useState(''); // The AI generated script
  const [approvedScriptId, setApprovedScriptId] = useState(null);
  const [approvedAudioId, setApprovedAudioId] = useState(null);
  const [approvedVideoId, setApprovedVideoId] = useState(null);
  
  // Expose store state and setters
  const store = {
    currentPage,
    setCurrentPage,
    
    productImage,
    setProductImage,
    backendFilename,
    setBackendFilename,
    productDescription,
    setProductDescription,
    
    scriptText,
    setScriptText,
    approvedScriptId,
    setApprovedScriptId,
    approvedAudioId,
    setApprovedAudioId,
    approvedVideoId,
    setApprovedVideoId,
  };


  return (
    <ProjectContext.Provider value={store}>
      {children}
    </ProjectContext.Provider>
  );
};
