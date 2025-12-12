// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { createContext, useContext } from 'react';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MotorProposalsPage from './pages/MotorProposalsPage';
import TravelProposalsPage from './pages/TravelProposalsPage';
import PaymentsPage from './pages/PaymentsPage';

const AuthContext = createContext(null);
export const useAuthContext = () => useContext(AuthContext);

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthContext();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      <Router>
        <Routes>
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/motor"
            element={
              <PrivateRoute>
                <Layout>
                  <MotorProposalsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/travel"
            element={
              <PrivateRoute>
                <Layout>
                  <TravelProposalsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <PrivateRoute>
                <Layout>
                  <PaymentsPage />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}
