// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import Card from '../components/Card';

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr('');
        const res = await adminApi.getSummary();
        setSummary(res.data);
      } catch (e) {
        setErr(e.message || 'Failed to load summary');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <p>Loading dashboard…</p>;
  if (err) return <p style={{ color: '#f87171' }}>{err}</p>;
  if (!summary) return null;

  return (
    <div className="grid">
      <Card title="Users">
        <div className="metric-row">
          <span>Total Users</span>
          <strong>{summary.users.total}</strong>
        </div>
        <div className="metric-row">
          <span>Admins</span>
          <strong>{summary.users.admins}</strong>
        </div>
      </Card>

      <Card title="Motor Proposals">
        <div className="metric-row">
          <span>Total</span>
          <strong>{summary.motor.totalProposals}</strong>
        </div>
        <div className="metric-row">
          <span>Paid</span>
          <strong>{summary.motor.paid}</strong>
        </div>
        <div className="metric-row">
          <span>Pending</span>
          <strong>{summary.motor.pending}</strong>
        </div>
      </Card>

      <Card title="Travel Proposals">
        <div className="metric-row">
          <span>Total</span>
          <strong>{summary.travel.totalProposals}</strong>
        </div>
        <div className="metric-row">
          <span>Paid</span>
          <strong>{summary.travel.paid}</strong>
        </div>
        <div className="metric-row">
          <span>Pending</span>
          <strong>{summary.travel.pending}</strong>
        </div>
      </Card>

      <Card title="Payments">
        <div className="metric-row">
          <span>Total Payments</span>
          <strong>{summary.payments.totalPayments}</strong>
        </div>
        <div className="metric-row">
          <span>Successful</span>
          <strong>{summary.payments.successful}</strong>
        </div>
        <div className="metric-row">
          <span>Failed</span>
          <strong>{summary.payments.failed}</strong>
        </div>
        <div className="metric-row">
          <span>Total Paid Amount</span>
          <strong>Rs. {summary.payments.totalPaidAmount}</strong>
        </div>
      </Card>
    </div>
  );
}
