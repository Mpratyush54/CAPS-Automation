import { Plus } from 'lucide-react';

const TableBlock = ({ data, onChange, isAdmin }) => {
  const rows = data.rows || [['Header 1', 'Header 2']];
  const updateCell = (ri, ci, val) => {
    const newRows = rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r);
    onChange({ ...data, rows: newRows });
  };
  const addRow = () => onChange({ ...data, rows: [...rows, new Array(rows[0].length).fill('')] });
  const addCol = () => onChange({ ...data, rows: rows.map(r => [...r, '']) });

  return (
    <div style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
      <table className="report-table" style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--color-surface-high)' }}>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ border: '1px solid var(--color-surface-high)', padding: '0.5rem' }}>
                   <input 
                     disabled={!isAdmin}
                     style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '0.875rem' }} 
                     value={cell} 
                     onChange={e => updateCell(ri, ci, e.target.value)} 
                   />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {isAdmin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button className="btn-ghost sm" style={{ fontSize: '0.7rem' }} onClick={addRow}><Plus size={10} /> Row</button>
          <button className="btn-ghost sm" style={{ fontSize: '0.7rem' }} onClick={addCol}><Plus size={10} /> Column</button>
        </div>
      )}
    </div>
  );
};

export default TableBlock;
