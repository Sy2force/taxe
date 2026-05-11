import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import ExercisePage from './pages/ExercisePage';
import LawsPage from './pages/LawsPage';
import AnswersPage from './pages/AnswersPage';
import VerificationPage from './pages/VerificationPage';
import FinalCheckPage from './pages/FinalCheckPage';
import Corrector from './pages/Corrector';
import Dashboard from './pages/Dashboard';
import Declaration from './pages/Declaration';
import FinalVerification from './pages/FinalVerification';
import FiscalGlossary from './pages/FiscalGlossary';
import HomeworkQuestions from './pages/HomeworkQuestions';
import Landing from './pages/Landing';
import ProfessorInstructions from './pages/ProfessorInstructions';
import Question from './pages/Question';
import Search from './pages/Search';
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import UserGuide from './pages/UserGuide';
import { SavedDataProvider } from './contexts/SavedDataContext';

function App() {
  return (
    <SavedDataProvider>
      <Router>
        <div className="h-screen flex flex-col" style={{ background: '#09090b' }}>
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              <Routes>
                <Route path="/" element={<Navigate to="/exercise" replace />} />
                <Route path="/landing" element={<Landing />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/exercise" element={<ExercisePage />} />
                <Route path="/laws" element={<LawsPage />} />
                <Route path="/answers" element={<AnswersPage />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/final-check" element={<FinalCheckPage />} />
                <Route path="/final-verification" element={<FinalVerification />} />
                <Route path="/corrector" element={<Corrector />} />
                <Route path="/question" element={<Question />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/search" element={<Search />} />
                <Route path="/homework" element={<HomeworkQuestions />} />
                <Route path="/declaration" element={<Declaration />} />
                <Route path="/glossary" element={<FiscalGlossary />} />
                <Route path="/instructions" element={<ProfessorInstructions />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/guide" element={<UserGuide />} />
                <Route path="*" element={<Navigate to="/exercise" replace />} />
              </Routes>
            </main>
          </div>
          <BottomNav />
        </div>
      </Router>
    </SavedDataProvider>
  );
}

export default App;

