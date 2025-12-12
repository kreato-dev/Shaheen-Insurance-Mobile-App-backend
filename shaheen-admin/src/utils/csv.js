// src/utils/csv.js
export function exportToCsv(filename, columns, rows) {
  if (!rows || rows.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = columns.map((c) => c.header);
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = columns.map((col) => {
      let val;
      if (col.csvAccessor) {
        val = col.csvAccessor(row);
      } else if (col.render) {
        // we can't render React, so fallback to raw accessor
        val = col.accessor ? row[col.accessor] : '';
      } else {
        val = col.accessor ? row[col.accessor] : '';
      }
      if (val === null || val === undefined) val = '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    });
    lines.push(values.join(','));
  }

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
