import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import ValidationMessage from "../../components/common/ValidationMessage";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import StatusBadge from "../../components/common/StatusBadge";
import TableWrapper from "../../components/common/TableWrapper";
import { Eye, EyeOff, UserPlus, Pencil, UserX, RotateCcw } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Tenant staff directory with role assignment, credential resets, and deactivation confirmation.
 */
function UserManagement() {
  const users = useStore((state) => state.users);
  const fetchUsers = useStore((state) => state.fetchUsers);
  const addUserAction = useStore((state) => state.addUser);
  const updateUserAction = useStore((state) => state.updateUser);
  const deleteUserAction = useStore((state) => state.deleteUser);
  const currentUser = useStore((state) => state.user);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [editUserId, setEditUserId] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    fetchUsers().catch((err) => {
      console.error("Failed to load users:", err);
    });
  }, [fetchUsers]);

  const clearForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setSelectedRole("");
    setEditUserId(null);
    setShowPassword(false);
  };

  const handleSaveUser = async () => {
    setMessage("");
    setMessageType("");

    if (!name.trim()) {
      setMessage("Name is required");
      setMessageType("error");
      return;
    }
    if (!email.trim()) {
      setMessage("Email is required");
      setMessageType("error");
      return;
    }
    if (!selectedRole) {
      setMessage("Please select a role");
      setMessageType("error");
      return;
    }
    if (editUserId === null && (!password || password.length < 6)) {
      setMessage("Password must be at least 6 characters long");
      setMessageType("error");
      return;
    }

    let role = "STAFF";
    let subRole = null;

    if (selectedRole === "Administrator") {
      role = "COMPANY_ADMIN";
    } else if (selectedRole === "Manager") {
      subRole = "MANAGER";
    } else if (selectedRole === "Accountant") {
      subRole = "ACCOUNTANT";
    }

    const payload = { name, email, role, subRole };
    if (password) payload.password = password;

    try {
      if (editUserId !== null) {
        await updateUserAction(editUserId, payload);
        setMessage("User updated successfully.");
        setMessageType("success");
      } else {
        await addUserAction(payload);
        setMessage("User created successfully.");
        setMessageType("success");
      }
      clearForm();
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to save user");
      setMessageType("error");
    }
  };

  const handleEditClick = (user) => {
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setShowPassword(false);

    if (user.role === "COMPANY_ADMIN") {
      setSelectedRole("Administrator");
    } else if (user.role === "STAFF" && user.subRole === "MANAGER") {
      setSelectedRole("Manager");
    } else if (user.role === "STAFF" && user.subRole === "ACCOUNTANT") {
      setSelectedRole("Accountant");
    } else {
      setSelectedRole("");
    }

    setEditUserId(user.id);
    setMessage("");
    setMessageType("");
  };

  const requestDelete = (user) => {
    if (user.id === currentUser?.id) {
      setMessage("You cannot deactivate your own signed-in account.");
      setMessageType("error");
      return;
    }
    setDeactivateTarget(user);
  };

  const confirmDeactivateUser = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      await deleteUserAction(deactivateTarget.id);
      setMessage("User account deactivated successfully.");
      setMessageType("success");
      if (editUserId === deactivateTarget.id) {
        clearForm();
      }
      setDeactivateTarget(null);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to deactivate user");
      setMessageType("error");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <div className="space-y-5 text-foreground">
      <CommonPageHeader
        title="User Management"
        subtitle="Provision staff accounts, assign operational designations, and revoke access"
        badge={<StatusBadge variant="neutral tabular-nums">{users.length} members</StatusBadge>}
      />

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={() => setMessage("")}
        className="mt-0!"
      />

      {/* User Form */}
      <div className="bg-card text-foreground p-5 rounded-lg border border-border surface-shadow">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/70">
          <h2 className="text-sm font-semibold text-foreground">
            {editUserId !== null ? "Edit User Account" : "Provision New User"}
          </h2>
          {editUserId !== null && <StatusBadge variant="warning">Editing ID #{editUserId}</StatusBadge>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className={LABEL_CLASS}>Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>Email Address *</label>
            <input
              type="email"
              placeholder="priya@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className={LABEL_CLASS}>
              {editUserId ? "Reset Password (Optional)" : "Initial Password *"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={editUserId ? "Leave blank to keep" : "Minimum 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${INPUT_CLASS} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={LABEL_CLASS}>Workspace Role *</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={`${INPUT_CLASS} cursor-pointer`}
            >
              <option value="">Select Role</option>
              <option value="Administrator">Administrator (Full Admin)</option>
              <option value="Manager">Manager (Inventory & Sales)</option>
              <option value="Accountant">Accountant (Accounts & Ledgers)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t border-border/70">
          {editUserId !== null && (
            <button
              type="button"
              onClick={clearForm}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cancel Edit</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveUser}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>{editUserId !== null ? "Update User" : "Add User"}</span>
          </button>
        </div>
      </div>

      {/* Staff Directory Table */}
      <TableWrapper>
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-secondary/70 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            <tr>
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Designation</th>
              <th className="px-4 py-2.5">Access Key</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {users.length > 0 ? (
              users.map((u) => {
                let roleDisplay = "Staff";
                if (u.role === "COMPANY_ADMIN") roleDisplay = "Administrator";
                else if (u.role === "SUPER_ADMIN") roleDisplay = "Super Admin";
                else if (u.role === "STAFF" && u.subRole === "MANAGER") roleDisplay = "Manager";
                else if (u.role === "STAFF" && u.subRole === "ACCOUNTANT") roleDisplay = "Accountant";

                return (
                  <tr key={u.id} className="elevated-table-row transition-colors">
                    <td className="px-4 py-2.5 text-foreground font-medium">{u.name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">{roleDisplay}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant="neutral" className="font-mono uppercase">
                        {u.role}
                        {u.subRole ? `:${u.subRole}` : ""}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditClick(u)}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => requestDelete(u)}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs font-medium text-muted-foreground transition-colors cursor-pointer"
                        >
                          <UserX className="w-3 h-3" />
                          <span>Deactivate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-xs text-muted-foreground">
                  No workspace users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrapper>

      <ConfirmDialog
        isOpen={Boolean(deactivateTarget)}
        title="Deactivate User Account"
        message={
          deactivateTarget
            ? `Revoke ERP access for "${deactivateTarget.name}" (${deactivateTarget.email})?`
            : ""
        }
        confirmLabel="Deactivate User"
        loading={deactivating}
        onConfirm={confirmDeactivateUser}
        onCancel={() => !deactivating && setDeactivateTarget(null)}
      />
    </div>
  );
}

export default UserManagement;
