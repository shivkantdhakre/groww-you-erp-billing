/**
 * Surface wrapper for filter toolbars above tables and reports.
 */
function CommonFilter({ children, className = "" }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 mb-5 surface-shadow ${className}`}>
      {children}
    </div>
  );
}

export default CommonFilter;
