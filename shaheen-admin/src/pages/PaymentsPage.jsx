// src/pages/PaymentsPage.jsx
import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import Card from '../components/Card';
import Table from '../components/Table';
import Drawer from '../components/Drawer';
import { exportToCsv } from '../utils/csv';

export default function PaymentsPage() {
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedRow, setSelectedRow] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErr('');
        const res = await adminApi.getPayments({
          page,
          limit: 20,
          status: status || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        setResult(res);
      } catch (e) {
        setErr(e.message || 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [status, fromDate, toDate, page]);

  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Type', accessor: 'application_type' },
    { header: 'App ID', accessor: 'application_id' },
    {
      header: 'Amount',
      accessor: 'amount',
      csvAccessor: (row) => row.amount,
      render: (row) => `Rs. ${row.amount}`,
    },
    { header: 'Status', accessor: 'status' },
    { header: 'Gateway', accessor: 'gateway' },
    { header: 'Order ID', accessor: 'order_id' },
    { header: 'Txn ID', accessor: 'gateway_txn_id' },
    { header: 'Created At', accessor: 'created_at' },
  ];

  function handleExport() {
    if (!result?.data?.length) {
      alert('No rows to export');
      return;
    }
    exportToCsv('payments.csv', columns, result.data);
  }

  return (
    <>
      <Card
        title="Payments"
        subtitle="Filter payments and click any row for full details."
      >
        <div className="filters filters-row">
          <select
            className="form-input"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All Statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>
          <input
            type="date"
            className="form-input"
            value={fromDate}
            onChange={(e) => {
              setPage(1);
              setFromDate(e.target.value);
            }}
          />
          <input
            type="date"
            className="form-input"
            value={toDate}
            onChange={(e) => {
              setPage(1);
              setToDate(e.target.value);
            }}
          />
          <button className="btn-outline" onClick={handleExport}>
            Export CSV (this page)
          </button>
        </div>
        {loading && <p>Loading…</p>}
        {err && <p className="form-error">{err}</p>}
        {result && (
          <>
            <Table
              columns={columns}
              data={result.data || []}
              keyField="id"
              onRowClick={setSelectedRow}
            />
            <div className="pagination">
              <button
                className="btn-outline"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <span>
                Page {result.meta.page} of {result.meta.totalPages}
              </span>
              <button
                className="btn-outline"
                disabled={page >= result.meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </Card>

      <Drawer
        open={!!selectedRow}
        title={
          selectedRow
            ? `Payment #${selectedRow.id} (${selectedRow.status})`
            : ''
        }
        onClose={() => setSelectedRow(null)}
      >
        {selectedRow && (
          <div className="drawer-details">
            <DetailRow label="Customer" value={selectedRow.customerName} />
            <DetailRow label="Application Type" value={selectedRow.application_type} />
            <DetailRow label="Application ID" value={selectedRow.application_id} />
            <DetailRow label="Amount" value={selectedRow.amount} fmt="money" />
            <DetailRow label="Status" value={selectedRow.status} />
            <DetailRow label="Gateway" value={selectedRow.gateway} />
            <DetailRow label="Order ID" value={selectedRow.order_id} />
            <DetailRow label="Gateway Txn ID" value={selectedRow.gateway_txn_id} />
            <DetailRow label="Created At" value={selectedRow.created_at} />
            <hr style={{ borderColor: '#1f2937', margin: '8px 0' }} />
            <pre style={{ whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(selectedRow, null, 2)}
            </pre>
          </div>
        )}
      </Drawer>
    </>
  );
}

function DetailRow({ label, value, fmt }) {
  if (value === null || value === undefined || value === '') return null;
  let display = value;
  if (fmt === 'money') {
    display = `Rs. ${value}`;
  }
  return (
    <div className="detail-row">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{display}</span>
    </div>
  );
}
