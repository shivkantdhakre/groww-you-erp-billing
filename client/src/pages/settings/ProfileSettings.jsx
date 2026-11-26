import { useState, useEffect } from "react";
import { useStore } from "../../store/useStore";
import CommonPageHeader from "../../components/common/CommonPageHeader";
import ValidationMessage from "../../components/common/ValidationMessage";
import { Eye, EyeOff, User, KeyRound, Save } from "lucide-react";

const INPUT_CLASS =
  "h-9 px-3 rounded-md w-full border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors";
const LABEL_CLASS =
  "block mb-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider";

/**
 * Logged-in user profile and password credential manager.
 */
function ProfileSettings() {
  const user = useStore((state) => state.user);
  const updateProfile = useStore((state) => state.updateProfile);
  const changePassword = useStore((state) => state.changePassword);

  const [activeTab, setActiveTab] = useState("profile");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const switchTab = (tab) => {
    setActiveTab(tab);
    clearMessages();
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
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
      setMessage("Profile updated successfully.");
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
      setMessage("Password updated successfully.");
      setMessageType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setMessage(err.response?.data?.error || "Failed to change password");
      setMessageType("error");
    }
  };

  return (
    <div className="max-w-3xl space-y-5 text-foreground">
      <CommonPageHeader
        title="Profile & Security"
        subtitle="Manage your workspace identity details and account authentication password"
      />

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        <button
          type="button"
          onClick={() => switchTab("profile")}
          className={`inline-flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "profile"
              ? "border-primary text-primary-text"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="w-4 h-4" />
          <span>Profile Details</span>
        </button>
        <button
          type="button"
          onClick={() => switchTab("password")}
          className={`inline-flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === "password"
              ? "border-primary text-primary-text"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
        </button>
      </div>

      <ValidationMessage
        type={messageType}
        message={message}
        onDismiss={clearMessages}
        className="mt-0!"
      />

      <div className="bg-card border border-border rounded-lg surface-shadow p-5 sm:p-6">
        {activeTab === "profile" ? (
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            <h2 className="text-sm font-semibold text-foreground pb-3 border-b border-border/70">
              Account Identity
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL_CLASS}>Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className={LABEL_CLASS}>System Role (Read Only)</label>
                <input
                  type="text"
                  value={user?.role || ""}
                  disabled
                  className="h-9 px-3 rounded-md w-full bg-muted border border-border text-muted-foreground text-xs font-mono uppercase cursor-not-allowed"
                />
              </div>

              {user?.subRole && (
                <div>
                  <label className={LABEL_CLASS}>Staff Designation (Read Only)</label>
                  <input
                    type="text"
                    value={user.subRole}
                    disabled
                    className="h-9 px-3 rounded-md w-full bg-muted border border-border text-muted-foreground text-xs font-mono uppercase cursor-not-allowed"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/70 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-5">
            <h2 className="text-sm font-semibold text-foreground pb-3 border-b border-border/70">
              Update Authentication Password
            </h2>

            <div className="max-w-md space-y-4">
              <div>
                <label className={LABEL_CLASS}>Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-10`}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-10`}
                    placeholder="Minimum 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-10`}
                    placeholder="Re-enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border/70 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-medium transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ProfileSettings;
