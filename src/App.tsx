import { Routes, Route, Navigate } from 'react-router-dom';
import { SiteProvider } from './app/SiteProvider';
import { ThemeProvider } from './app/ThemeProvider';
import { Layout } from './app/Layout';
import HomePage from './pages/HomePage';
import DocsPage from './pages/DocsPage';
import DocumentPage from './pages/DocumentPage';
import SearchPage from './pages/SearchPage';
import GraphPage from './pages/GraphPage';
import RoadmapPage from './pages/RoadmapPage';
import EditorPage from './pages/EditorPage';
import CySecToolsPage from './features/cysec-tools/pages/CySecToolsPage';
import CategoryPage from './features/cysec-tools/pages/CategoryPage';
import ToolPage from './features/cysec-tools/pages/ToolPage';

function App() {
  return (
    <SiteProvider>
      <ThemeProvider>
        <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/docs/*" element={<DocumentPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/graph" element={<GraphPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/cysec-tools" element={<CySecToolsPage />} />
          <Route path="/cysec-tools/category/:categoryId" element={<CategoryPage />} />
          <Route path="/cysec-tools/:toolId" element={<ToolPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      </ThemeProvider>
    </SiteProvider>
  );
}

export default App;
