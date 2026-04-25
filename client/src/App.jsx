import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import Sidebar from "./components/Layout/Sidebar";
import TopBar from "./components/Layout/TopBar";
import { RepoProvider } from "./hooks/useRepo";
import Chatbot from "./pages/Chatbot";
import Explainer from "./pages/Explainer";
import Home from "./pages/Home";
import MockInterview from "./pages/MockInterview";

const AppLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <TopBar isSidebarOpen={isSidebarOpen} onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="app-main">
        <div className="page-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/explain" element={<Explainer />} />
                <Route path="/chat" element={<Chatbot />} />
                <Route path="/interview" element={<MockInterview />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <RepoProvider>
    <AppLayout />
  </RepoProvider>
);

export default App;
