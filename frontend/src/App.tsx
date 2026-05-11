import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import ExercisePage from './pages/ExercisePage';
import LawsPage from './pages/LawsPage';
import AnswersPage from './pages/AnswersPage';
import VerificationPage from './pages/VerificationPage';
import FinalCheckPage from './pages/FinalCheckPage';

function App() {
  return (
    <Router>
      <div className="h-screen flex flex-col" style={{ background: '#09090b' }}>
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          {/* main scrolls independently; pb-16 on mobile for BottomNav space */}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <Routes>
              <Route path="/" element={<Navigate to="/exercise" replace />} />
              <Route path="/exercise" element={<ExercisePage />} />
              <Route path="/laws" element={<LawsPage />} />
              <Route path="/answers" element={<AnswersPage />} />
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/final-check" element={<FinalCheckPage />} />
              <Route path="*" element={<Navigate to="/exercise" replace />} />
            </Routes>
          </main>
        </div>
        {/* Bottom tab bar — mobile only */}
        <BottomNav />
      </div>
    </Router>
  );
}

export default App;

