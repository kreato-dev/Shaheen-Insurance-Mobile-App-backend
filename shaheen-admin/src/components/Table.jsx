// src/components/Table.jsx
export default function Table({ columns, data, keyField = 'id', onRowClick }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.accessor}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row) => {
              const rowKey = row[keyField] || JSON.stringify(row);
              return (
                <tr
                  key={rowKey}
                  className={onRowClick ? 'table-row-clickable' : ''}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key || col.accessor}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center' }}>
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
