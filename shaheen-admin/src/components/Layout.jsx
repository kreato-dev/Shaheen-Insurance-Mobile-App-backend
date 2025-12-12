// src/components/Layout.jsx
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ children }) {
  return (
    <div className="layout-root">
      <Sidebar />
      <div className="layout-main">
        <Topbar />
        <main className="layout-content">{children}</main>
      </div>
    </div>
  );
}
