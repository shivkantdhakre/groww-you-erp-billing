import { useState } from "react";
import TableWrapper from "../../components/common/TableWrapper";

function RoleManagement() {
  const [role, setRole] = useState("Admin");

  const modules = [
    "Customer Master",
    "Vendor Master",
    "Sales Invoice",
    "Purchase Invoice",
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-foreground">
        Role Management
      </h1>

      <p className="text-muted-foreground mb-6">
        Manage Roles & Permissions
      </p>

      {/* Role Selection */}

      <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm mb-6">

        <label className="block mb-2 font-semibold text-muted-foreground text-sm uppercase tracking-wider">
          Select Role
        </label>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="bg-card text-foreground border border-border p-3 rounded-lg w-full focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none cursor-pointer transition"
        >
          <option>Admin</option>
          <option>Manager</option>
          <option>Accountant</option>
          <option>Operator</option>
        </select>

      </div>

      {/* Permission Matrix */}

      <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm">

        <TableWrapper>
          <table className="w-full">

          <thead className="bg-secondary text-secondary-foreground">

            <tr>
              <th className="p-3 text-left font-bold text-sm">Module</th>
              <th className="p-3 font-bold text-sm text-center">View</th>
              <th className="p-3 font-bold text-sm text-center">Add</th>
              <th className="p-3 font-bold text-sm text-center">Edit</th>
              <th className="p-3 font-bold text-sm text-center">Delete</th>
            </tr>

          </thead>

          <tbody>

            {modules.map((module, index) => (
              <tr key={index} className="border-t border-border hover:bg-muted/30 transition">

                <td className="p-3 font-medium text-foreground">{module}</td>

                <td className="text-center">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                </td>

                <td className="text-center">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                </td>

                <td className="text-center">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                </td>

                <td className="text-center">
                  <input type="checkbox" className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-background cursor-pointer" />
                </td>

              </tr>
            ))}

          </tbody>

        </table>
        </TableWrapper>

        <button
          className="bg-primary text-primary-foreground hover:bg-primary/95 px-6 py-2.5 rounded-lg mt-5 font-semibold transition cursor-pointer shadow-sm"
        >
          Save Permissions
        </button>

      </div>

    </div>
  );
}

export default RoleManagement;