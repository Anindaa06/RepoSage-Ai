import { Menu, X } from "lucide-react";

const TopBar = ({ isSidebarOpen, onToggleSidebar }) => (
  <header className="topbar">
    <button className="icon-btn" type="button" onClick={onToggleSidebar} aria-label="Toggle navigation">
      {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
    </button>
    <div className="topbar-title">
      <span className="brand-word">RepoSage</span>
    </div>
  </header>
);

export default TopBar;
