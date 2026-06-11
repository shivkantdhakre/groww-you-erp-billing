import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import api from "../utils/api";

function Navbar() {
  const navigate = useNavigate();

  // Store bindings
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const notifications = useStore((state) => state.notifications);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const clearNotifications = useStore((state) => state.clearNotifications);

  // Component UI state
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Debounced search logic
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(search)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error("Global search failed:", err);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleResultClick = (result) => {
    setSearch("");
    setSearchResults([]);
    navigate(result.link);
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="bg-white shadow px-6 py-4 flex justify-between items-center relative no-print">
      
      {/* Search Input Box */}
      <div className="w-2/3 relative">
        <input
          type="text"
          placeholder="Search Customers, Vendors, Invoices, Items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {search && (
          <div className="absolute bg-white border border-gray-200 rounded-lg shadow-lg w-full mt-1 z-50 max-h-80 overflow-y-auto">
            {loadingSearch ? (
              <div className="p-3 text-gray-500 flex items-center justify-center">
                <span className="animate-spin mr-2">⏳</span> Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleResultClick(item)}
                  className="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center border-b last:border-0"
                >
                  <div>
                    <span className="font-semibold text-gray-800">{item.name}</span>
                    <span className="text-xs text-gray-500 block">{item.details}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded uppercase">
                    {item.type}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-gray-500 text-center">No Results Found</div>
            )}
          </div>
        )}
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center gap-4">
        
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span className="text-2xl">🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 border-b last:border-0 transition-colors ${
                      item.read ? "bg-white" : "bg-blue-50/50"
                    }`}
                  >
                    <p className="text-sm text-gray-700">{item.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-gray-400">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!item.read && (
                        <button
                          onClick={() => markNotificationRead(item.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-semibold cursor-pointer"
                        >
                          Mark As Read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-gray-500 text-sm">No Notifications</div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="font-medium text-gray-700 hidden sm:inline">
              {user?.name || "User"}
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-3 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
              <div className="p-4 border-b bg-gray-50/50 rounded-t-lg">
                <h3 className="font-bold text-gray-800 text-base">{user?.name || "User"}</h3>
                <p className="text-xs text-gray-500 uppercase mt-0.5 font-semibold">
                  {user?.role === "COMPANY_ADMIN" ? "Administrator" : (user?.subRole || user?.role || "Staff")}
                </p>
                <p className="text-xs text-gray-400 mt-1 truncate">{user?.email || ""}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfile(false);
                  navigate("/profile-settings");
                }}
                className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                👤 My Profile
              </button>

              <button
                onClick={() => {
                  setShowProfile(false);
                  navigate("/profile-settings");
                }}
                className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                🔑 Change Password
              </button>

              {user?.role === "COMPANY_ADMIN" && (
                <button
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/company-settings");
                  }}
                  className="w-full text-left p-3 text-sm text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  ⚙️ Settings
                </button>
              )}

              <button
                onClick={() => {
                  setShowProfile(false);
                  logout();
                }}
                className="w-full text-left p-3 text-sm hover:bg-red-50 text-red-600 font-semibold border-t cursor-pointer"
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default Navbar;