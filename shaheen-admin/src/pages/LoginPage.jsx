// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../App';
import Card from '../components/Card';

export default function LoginPage() {
  const { login, loading, isAuthenticated } = useAuthContext();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('03001234567');
  const [password, setPassword] = useState('Password123');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await login({ mobile, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  if (isAuthenticated) {
    navigate('/');
  }

  return (
    <div className="auth-root">
      <Card title="Admin Login" subtitle="Use your admin credentials">
        <form onSubmit={handleSubmit} className="form">
          <label className="form-label">
            Mobile
            <input
              className="form-input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="0300xxxxxxx"
            />
          </label>
          <label className="form-label">
            Password
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </Card>
    </div>
  );
}
