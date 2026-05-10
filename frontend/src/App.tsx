import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Search from './pages/Search';
import Question from './pages/Question';
import Corrector from './pages/Corrector';
import Declaration from './pages/Declaration';
import Settings from './pages/Settings';
import HomeworkQuestions from './pages/HomeworkQuestions';
import UserGuide from './pages/UserGuide';
import ProfessorInstructions from './pages/ProfessorInstructions';
import FiscalGlossary from './pages/FiscalGlossary';
import FinalVerification from './pages/FinalVerification';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background-primary">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/search" element={<Search />} />
              <Route path="/question" element={<Question />} />
              <Route path="/corrector" element={<Corrector />} />
              <Route path="/declaration" element={<Declaration />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/homework" element={<HomeworkQuestions />} />
              <Route path="/guide" element={<UserGuide />} />
              <Route path="/instructions" element={<ProfessorInstructions />} />
              <Route path="/glossary" element={<FiscalGlossary />} />
              <Route path="/verification" element={<FinalVerification />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
