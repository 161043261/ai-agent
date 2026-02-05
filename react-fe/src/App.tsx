import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home, CodePill, SuperAgent } from '@/pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/code-pill" element={<CodePill />} />
        <Route path="/super-agent" element={<SuperAgent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
