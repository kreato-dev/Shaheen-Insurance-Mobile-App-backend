// src/pages/TravelProposalsPage.jsx
import { useEffect, useState } from 'react';
import { adminApi } from '../api';
import Card from '../components/Card';
import Table from '../components/Table';
import Drawer from '../components/Drawer';
import { exportToCsv } from '../utils/csv';

export default function TravelProposalsPage() {
  const [status, setStatus] = useState('');
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
        const res = await adminApi.getTravelProposals({
          page,
          limit: 20,
          status: status || undefined,
        });
        setResult(res);
      } catch (e) {
        setErr(e.message || 'Failed to load travel proposals');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [status, page]);

  const columns = [
    { header: 'ID', accessor: 'id' },
    { header: 'Customer', accessor: 'customerName' },
    { header: 'Package', accessor: 'package_type' },
    { header: 'Coverage', accessor: 'coverage_type' },
    { header: 'Start', accessor: 'start_date' },
    { header: 'End', accessor: 'end_date' },
    { header: 'Tenure (days)', accessor: 'tenure_days' },
    {
      header: 'Sum Insured',
      accessor: 'sum_insured',
      csvAccessor: (row) => row.sum_insured,
      render: (row) => (row.sum_insured ? `Rs. ${row.sum_insured}` : '-'),
    },
    {
      header: 'Final Premium',
      accessor: 'final_premium',
      csvAccessor: (row) => row.final_premium,
      render: (row) =>
        row.final_premium ? `Rs. ${row.final_premium}` : '-',
    },
    { header: 'Status', accessor: 'status' },
    { header: 'Created At', accessor: 'created_at' },
  ];

  function handleExport() {
    if (!result?.data?.length) {
      alert('No rows to export');
      return;
    }
    exportToCsv('travel_proposals.csv', columns, result.data);
  }

  return (
    <>
      <Card
        title="Travel Proposals"
        subtitle="Click a row to see full details. Export current page to CSV."
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
            <option value="submitted">Submitted</option>
            <option value="paid">Paid</option>
          </select>
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
            ? `Travel Proposal #${selectedRow.id} (${selectedRow.package_type || 'N/A'})`
            : ''
        }
        onClose={() => setSelectedRow(null)}
      >
        {selectedRow && (
          <div className="drawer-details">
            <DetailRow label="Customer" value={selectedRow.customerName} />
            <DetailRow label="Package" value={selectedRow.package_type} />
            <DetailRow label="Coverage" value={selectedRow.coverage_type} />
            <DetailRow label="Start Date" value={selectedRow.start_date} />
            <DetailRow label="End Date" value={selectedRow.end_date} />
            <DetailRow label="Tenure (days)" value={selectedRow.tenure_days} />
            <DetailRow label="Sum Insured" value={selectedRow.sum_insured} fmt="money" />
            <DetailRow label="Final Premium" value={selectedRow.final_premium} fmt="money" />
            <DetailRow label="Status" value={selectedRow.status} />
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
