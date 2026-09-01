import React from 'react';
import { ProjectProvider, useProjectStore } from './state/projectStore.jsx';

import Upload from './pages/Upload/Upload.jsx';
import Script from './pages/Script/Script.jsx';
import Voice from './pages/Voice/Voice.jsx';
import Video from './pages/Video/Video.jsx';

// Internal router component that connects to the store
const AppRouter = () => {
  const { currentPage } = useProjectStore();

  switch (currentPage) {
    case 'upload':
      return <Upload />;
    case 'script':
      return <Script />;
    case 'voice':
      return <Voice />;
    case 'video':
      return <Video />;
    default:
      return <Upload />;
  }
};

function App() {
  return (
    <ProjectProvider>
      <AppRouter />
    </ProjectProvider>
  );
}

export default App;
