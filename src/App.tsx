import { Routes, Route, Navigate } from 'react-router-dom';
import { SiteProvider } from './app/SiteProvider';
import { Layout } from './app/Layout';
import HomePage from './pages/HomePage';
import DocsPage from './pages/DocsPage';
import DocumentPage from './pages/DocumentPage';
import SearchPage from './pages/SearchPage';
import GraphPage from './pages/GraphPage';

function App() {
  return (
    <SiteProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/*" element={<DocumentPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </SiteProvider>
  );
}

export default App;
