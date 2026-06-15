import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import ValidationMessage from "../../components/common/ValidationMessage";
import { Eye, EyeOff } from "lucide-react";
import TableWrapper from "../../components/common/TableWrapper";

function UserManagement() {
  const users = useStore((state) => state.users);
  const fetchUsers = useStore((state) => state.fetchUsers);
  const addUserAction = useStore((state) => state.addUser);
  const updateUserAction = useStore((state) => state.updateUser);
  const deleteUserAction = useStore((state) => state.deleteUser);
  const currentUser = useStore((state) => state.user);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState(""); // UI selected role: "Administrator", "Manager", "Accountant"

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [editUserId, setEditUserId] = useState(null);

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

    // Role mapping based on matrix:
    // Administrator -> role: "COMPANY_ADMIN", subRole: null
    // Manager -> role: "STAFF", subRole: "MANAGER"
    // Accountant -> role: "STAFF", subRole: "ACCOUNTANT"
    let role = "STAFF";
    let subRole = null;

    if (selectedRole === "Administrator") {
      role = "COMPANY_ADMIN";
    } else if (selectedRole === "Manager") {
      subRole = "MANAGER";
    } else if (selectedRole === "Accountant") {
      subRole = "ACCOUNTANT";
    }

    const payload = {
      name,
      email,
      role,
      subRole,
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (editUserId !== null) {
        await updateUserAction(editUserId, payload);
        setMessage("User updated successfully");
        setMessageType("success");
      } else {
        await addUserAction(payload);
        setMessage("User created successfully");
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
    setPassword(""); // Keep password blank unless changing
    setShowPassword(false);

    // Map DB role back to UI Selected Role
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

  const handleDeleteClick = async (userId) => {
    if (userId === currentUser?.id) {
      setMessage("You cannot deactivate your own logged-in account");
      setMessageType("error");
      return;
    }

    if (!window.confirm("Are you sure you want to deactivate this user account?")) {
      return;
    }

    try {
      await deleteUserAction(userId);
      setMessage("User account deactivated successfully");
      setMessageType("success");
      if (editUserId === userId) {
        clearForm();
      }
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to deactivate user");
      setMessageType("error");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-foreground">User Management</h1>
      <p className="text-muted-foreground mb-6">Manage ERP staff members and deactivations</p>

      {/* Form */}
      <div className="bg-card text-foreground p-6 rounded-xl border border-border shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition"
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={editUserId ? "New Password (Optional)" : "Password (Min 6 chars)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-3 pr-10 py-3 bg-card text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" strokeWidth={1.5} />
              ) : (
                <Eye className="w-4 h-4" strokeWidth={1.5} />
              )}
            </button>
          </div>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-card text-foreground border border-border p-3 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none cursor-pointer transition"
          >
            <option value="">Select Role</option>
            <option value="Administrator">Administrator (Admin)</option>
            <option value="Manager">Manager (Staff - Inventory & Sales)</option>
            <option value="Accountant">Accountant (Staff - Accounts & Ledgers)</option>
          </select>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleSaveUser}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer shadow-sm"
          >
            {editUserId !== null ? "Update User" : "Add User"}
          </button>
          {editUserId !== null && (
            <button
              onClick={clearForm}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="mt-4">
          <ValidationMessage type={messageType} message={message} />
        </div>
      </div>

      {/* Users Table */}
      <TableWrapper className="mt-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-secondary text-secondary-foreground border-b border-border">
              <th className="p-3 font-semibold rounded-tl-lg">Name</th>
              <th className="p-3 font-semibold">Email</th>
              <th className="p-3 font-semibold">Role Designation</th>
              <th className="p-3 font-semibold">Access Level</th>
              <th className="p-3 font-semibold rounded-tr-lg">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u) => {
                // UI Role display
                let roleDisplay = "Staff";
                if (u.role === "COMPANY_ADMIN") {
                  roleDisplay = "Administrator";
                } else if (u.role === "STAFF" && u.subRole === "MANAGER") {
                  roleDisplay = "Manager";
                } else if (u.role === "STAFF" && u.subRole === "ACCOUNTANT") {
                  roleDisplay = "Accountant";
                }

                return (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/30 transition">
                    <td className="p-3 text-foreground font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3 text-muted-foreground font-semibold">{roleDisplay}</td>
                    <td className="p-3 text-xs">
                      <span className="px-2.5 py-1 bg-muted text-muted-foreground rounded-full font-bold uppercase">
                        {u.role}{u.subRole ? `:${u.subRole}` : ""}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEditClick(u)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded mr-2 text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(u.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer shadow-sm"
                      >
                        Deactivate
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="5" className="p-6 text-center text-muted-foreground font-medium">
                  No Users Found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableWrapper>
    </div>
  );
}

export default UserManagement;