// src/components/Sidebar.jsx
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="logo-dot" />
        <span className="sidebar-title">Shaheen Admin</span>
      </div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className="nav-item">
          Dashboard
        </NavLink>
        <NavLink to="/motor" className="nav-item">
          Motor Proposals
        </NavLink>
        <NavLink to="/travel" className="nav-item">
          Travel Proposals
        </NavLink>
        <NavLink to="/payments" className="nav-item">
          Payments
        </NavLink>
      </nav>
    </aside>
  );
}
