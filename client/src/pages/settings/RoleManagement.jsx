import { useState } from "react";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import TableWrapper from "../../components/common/TableWrapper";
import ValidationMessage from "../../components/common/ValidationMessage";
import { ShieldCheck, Save } from "lucide-react";

const MODULES = [
  "Customer Master",
  "Vendor Master",
  "Sales Invoice",
  "Purchase Invoice",
];

const INITIAL_PERMISSIONS = {
  Admin: MODULES.reduce((acc, m) => ({ ...acc, [m]: { view: true, add: true, edit: true, delete: true } }), {}),
  Manager: MODULES.reduce((acc, m) => ({ ...acc, [m]: { view: true, add: true, edit: true, delete: false } }), {}),
  Accountant: MODULES.reduce((acc, m) => ({ ...acc, [m]: { view: true, add: true, edit: true, delete: false } }), {}),
  Operator: MODULES.reduce((acc, m) => ({ ...acc, [m]: { view: true, add: true, edit: false, delete: false } }), {}),
};

/**
 * Module-level role permissions matrix view.
 */
function RoleManagement() {
  const [role, setRole] = useState("Admin");
  const [matrix, setMatrix] = useState(INITIAL_PERMISSIONS);
  const [message, setMessage] = useState("");

  const togglePermission = (moduleName, action) => {
    setMatrix((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleName]: {
          ...prev[role][moduleName],
          [action]: !prev[role][moduleName][action],
        },
      },
    }));
  };

  return (
    <div className="max-w-4xl space-y-5 text-foreground">
      <CommonPageHeader
        title="Role Management"
        subtitle="Inspect and configure module-level capabilities across workspace roles"
      />

      <ValidationMessage
        type="success"
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      <div className="bg-card text-foreground p-5 rounded-lg border border-border surface-shadow">
        <label className="block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Target Workspace Role
        </label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setMessage("");
          }}
          className="h-9 px-3 rounded-md w-full sm:w-72 bg-card text-foreground border border-input text-sm focus:ring-2 focus:ring-ring focus:border-primary focus:outline-none cursor-pointer"
        >
          <option>Admin</option>
          <option>Manager</option>
          <option>Accountant</option>
          <option>Operator</option>
        </select>
      </div>

      <div className="bg-card text-foreground rounded-lg border border-border surface-shadow overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary-text" />
            <h2 className="text-sm font-semibold text-foreground">{role} Permission Matrix</h2>
          </div>
        </div>

        <TableWrapper className="!border-none !rounded-none !shadow-none !bg-transparent">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="px-4 py-2.5">Module</th>
                <th className="px-4 py-2.5 text-center">View</th>
                <th className="px-4 py-2.5 text-center">Add</th>
                <th className="px-4 py-2.5 text-center">Edit</th>
                <th className="px-4 py-2.5 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {MODULES.map((moduleName) => (
                <tr key={moduleName} className="elevated-table-row transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{moduleName}</td>
                  {["view", "add", "edit", "delete"].map((action) => (
                    <td key={action} className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${moduleName} ${action}`}
                        checked={Boolean(matrix[role]?.[moduleName]?.[action])}
                        onChange={() => togglePermission(moduleName, action)}
                        className="h-4 w-4 rounded border-border accent-primary focus:ring-ring cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrapper>

        <div className="px-4 sm:px-5 py-3.5 border-t border-border bg-secondary/25 flex justify-end">
          <button
            type="button"
            onClick={() => setMessage(`Permissions updated for role "${role}".`)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Permissions</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoleManagement;
