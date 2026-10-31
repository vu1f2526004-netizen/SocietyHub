import React from 'react';

/**
 * SocietyHub Standard Table Suite
 * Responsive, accessible table primitives with sticky-header option, hover states,
 * and clean typography.
 */
export const Table = ({ children, className = '', style = {}, ...props }) => (
  <div
    style={{
      width: '100%',
      overflowX: 'auto',
      borderRadius: 'var(--sh-radius-lg)',
      border: '1px solid var(--sh-slate-200)',
      boxShadow: 'var(--sh-shadow-sm)',
      backgroundColor: 'var(--sh-white)',
    }}
  >
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left',
        fontFamily: 'var(--sh-font-sans)',
        fontSize: 'var(--sh-text-sm)',
        color: 'var(--sh-slate-700)',
        ...style,
      }}
      className={className}
      {...props}
    >
      {children}
    </table>
  </div>
);

export const TableHeader = ({ children, className = '', style = {}, ...props }) => (
  <thead
    style={{
      backgroundColor: 'var(--sh-slate-50)',
      borderBottom: '1px solid var(--sh-slate-200)',
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody = ({ children, className = '', style = {}, ...props }) => (
  <tbody className={className} style={style} {...props}>
    {children}
  </tbody>
);

export const TableRow = ({
  children,
  hoverable = true,
  className = '',
  style = {},
  onClick,
  ...props
}) => (
  <tr
    onClick={onClick}
    style={{
      borderBottom: '1px solid var(--sh-slate-200)',
      transition: 'background-color var(--sh-transition-fast)',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}
    onMouseOver={(e) => {
      if (hoverable) e.currentTarget.style.backgroundColor = 'var(--sh-slate-50)';
    }}
    onMouseOut={(e) => {
      if (hoverable) e.currentTarget.style.backgroundColor = 'transparent';
    }}
    className={className}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead = ({ children, className = '', style = {}, ...props }) => (
  <th
    style={{
      padding: 'var(--sh-space-3) var(--sh-space-4)',
      fontSize: 'var(--sh-text-xs)',
      fontWeight: 'var(--sh-weight-bold)',
      color: 'var(--sh-slate-500)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </th>
);

export const TableCell = ({ children, className = '', style = {}, ...props }) => (
  <td
    style={{
      padding: 'var(--sh-space-3) var(--sh-space-4)',
      fontSize: 'var(--sh-text-sm)',
      color: 'var(--sh-slate-700)',
      verticalAlign: 'middle',
      ...style,
    }}
    className={className}
    {...props}
  >
    {children}
  </td>
);

export default Table;
