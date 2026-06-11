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
      setName(user.name || "");
      setEmail(user.email || "");
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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">My Settings</h1>
      <p className="text-gray-500 mb-6">Manage your ERP profile and password credentials</p>

      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => {
            setActiveTab("profile");
            clearMessages();
          }}
          className={`py-3 px-6 font-semibold border-b-2 transition-colors ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
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
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
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
      <div className="bg-white rounded-xl shadow p-6">
        {activeTab === "profile" ? (
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Edit Profile Info</h2>
            <hr />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-400 mb-2 font-semibold">User Role (Read Only)</label>
                <input
                  type="text"
                  value={user?.role || ""}
                  disabled
                  className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-gray-500 cursor-not-allowed uppercase"
                />
              </div>

              {user?.subRole && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-400 mb-2 font-semibold">Staff Designation (Read Only)</label>
                  <input
                    type="text"
                    value={user.subRole}
                    disabled
                    className="bg-gray-100 border border-gray-200 rounded-lg p-3 text-gray-500 cursor-not-allowed uppercase"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-800">Update Password</h2>
            <hr />

            <div className="max-w-md space-y-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 6 characters"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-600 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors cursor-pointer"
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
