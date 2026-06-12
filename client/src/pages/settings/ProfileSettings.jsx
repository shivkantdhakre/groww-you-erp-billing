import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import ValidationMessage from "../../components/common/ValidationMessage";

function ProfileSettings() {
  const user = useStore((state) => state.user);
  const updateProfile = useStore((state) => state.updateProfile);
  const changePassword = useStore((state) => state.changePassword);

  const [activeTab, setActiveTab] = useState("profile");

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notifications State
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setName(user.name || "");
        setEmail(user.email || "");
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const clearMessages = () => {
    setMessage("");
    setMessageType("");
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!name.trim() || !email.trim()) {
      setMessage("Name and Email are required");
      setMessageType("error");
      return;
    }

    try {
      await updateProfile({ name, email });
      setMessage("Profile updated successfully!");
      setMessageType("success");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to update profile");
      setMessageType("error");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    clearMessages();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("All password fields are required");
      setMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("New passwords do not match");
      setMessageType("error");
      return;
    }

    if (newPassword.length < 6) {
      setMessage("New password must be at least 6 characters long");
      setMessageType("error");
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setMessage("Password updated successfully!");
      setMessageType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to change password");
      setMessageType("error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto text-foreground">
      <h1 className="text-3xl font-bold mb-2">My Settings</h1>
      <p className="text-muted-foreground mb-6">Manage your ERP profile and password credentials</p>

      {/* Tabs Header */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => {
            setActiveTab("profile");
            clearMessages();
          }}
          className={`py-3 px-6 font-semibold border-b-2 transition-colors ${
            activeTab === "profile"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          👤 Profile Details
        </button>
        <button
          onClick={() => {
            setActiveTab("password");
            clearMessages();
          }}
          className={`py-3 px-6 font-semibold border-b-2 transition-colors ${
            activeTab === "password"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          🔑 Change Password
        </button>
      </div>

      {/* Status Alerts */}
      <div className="mb-4">
        <ValidationMessage type={messageType} message={message} />
      </div>

      {/* Tab Panels */}
      <div className="bg-card border border-border rounded-xl shadow p-6">
        {activeTab === "profile" ? (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Edit Profile Info</h2>
            <hr className="border-border" />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-card text-foreground border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter full name"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-card text-foreground border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter email address"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground/60 mb-2 font-semibold">User Role (Read Only)</label>
                <input
                  type="text"
                  value={user?.role || ""}
                  disabled
                  className="bg-muted border border-border rounded-lg p-3 text-muted-foreground cursor-not-allowed uppercase"
                />
              </div>

              {user?.subRole && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-muted-foreground/60 mb-2 font-semibold">Staff Designation (Read Only)</label>
                  <input
                     type="text"
                     value={user.subRole}
                     disabled
                     className="bg-muted border border-border rounded-lg p-3 text-muted-foreground cursor-not-allowed uppercase"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer shadow-md"
            >
              Save Changes
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <h2 className="text-xl font-semibold text-foreground">Update Password</h2>
            <hr className="border-border" />

            <div className="max-w-md space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-card text-foreground border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-card text-foreground border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-muted-foreground mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-card text-foreground border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer shadow-md"
            >
              Change Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfileSettings;
