// src/components/Topbar.jsx
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../App';

export default function Topbar() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, userInfo } = useAuthContext();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <h1 className="topbar-title">Backoffice</h1>
      </div>
      <div className="topbar-right">
        {isAuthenticated && (
          <>
            <span className="topbar-user">
              {userInfo?.fullName || 'Admin'}
            </span>
            <button className="btn-outline" onClick={handleLogout}>
              Logout
            </button>
          </>
        )}
      </div>
    </header>
  );
}
