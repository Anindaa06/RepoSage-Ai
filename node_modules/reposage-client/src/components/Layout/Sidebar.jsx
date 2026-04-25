import { motion } from "framer-motion";
import { BookOpenText, House, MessageCircle, MicVocal, Sparkles } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Home", path: "/", icon: House },
  { label: "Explainer", path: "/explain", icon: BookOpenText },
  { label: "Chat", path: "/chat", icon: MessageCircle },
  { label: "Mock Interview", path: "/interview", icon: MicVocal }
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const Sidebar = ({ isOpen, onClose }) => (
  <>
    <div className={`sidebar-overlay ${isOpen ? "visible" : ""}`} onClick={onClose} aria-hidden={!isOpen} />
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="sidebar-inner">
        <motion.div variants={itemVariants} className="sidebar-logo">
          <Sparkles size={16} />
          <span>RepoSage</span>
        </motion.div>

        <nav className="sidebar-nav">
          {navItems.map(({ label, path, icon: Icon }) => (
            <motion.div key={path} variants={itemVariants}>
              <NavLink
                to={path}
                onClick={onClose}
                className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              >
                <Icon size={16} />
                <span>{label}</span>
              </NavLink>
            </motion.div>
          ))}
        </nav>

        
      </motion.div>
    </aside>
  </>
);

export default Sidebar;
