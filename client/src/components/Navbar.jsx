import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";
import api from "../utils/api";
import {
  Moon,
  Sun,
  Bell,
  Loader2,
  User,
  KeyRound,
  Settings,
  LogOut
} from "lucide-react";

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
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  // Dismiss dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Theme Toggler state
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  // Debounced search logic
  useEffect(() => {
    if (!search.trim()) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(search)}`);
        setSearchResults(res.data);
        if (res.data.length > 0) {
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error("Global search failed:", err);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    if (!val.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
    } else {
      setShowSearchDropdown(true);
    }
  };

  const handleResultClick = (result) => {
    setSearch("");
    setSearchResults([]);
    setShowSearchDropdown(false);
    navigate(result.link);
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div className="bg-card border-b border-border shadow px-6 py-4 flex justify-between items-center relative text-foreground no-print">
      
      {/* Search Input Box */}
      <div ref={searchRef} className="w-2/3 relative">
        <input
          type="text"
          placeholder="Search Customers, Vendors, Invoices, Items..."
          value={search}
          onChange={handleSearchChange}
          onFocus={() => {
            if (search.trim()) {
              setShowSearchDropdown(true);
            }
          }}
          className="w-full border border-border bg-card text-foreground p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />

        {search && showSearchDropdown && (
          <div className="absolute bg-card border border-border rounded-lg shadow-lg w-full mt-1 z-50 max-h-80 overflow-y-auto text-foreground">
            {loadingSearch ? (
              <div className="p-3 text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0 text-primary" aria-hidden="true" />
                <span>Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleResultClick(item)}
                  className="p-3 hover:bg-muted cursor-pointer flex justify-between items-center border-b border-border last:border-0"
                >
                  <div>
                    <span className="font-semibold">{item.name}</span>
                    <span className="text-xs text-muted-foreground block">{item.details}</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-primary/10 text-primary rounded uppercase">
                    {item.type}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-muted-foreground text-center">No Results Found</div>
            )}
          </div>
        )}
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center gap-4">

        {/* Theme Switch Toggler */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground flex items-center justify-center"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 shrink-0" aria-hidden="true" />
          ) : (
            <Sun className="w-5 h-5 shrink-0" aria-hidden="true" />
          )}
        </button>
        
        {/* Notification Bell Dropdown */}
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5 shrink-0" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-card border border-border rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto text-foreground">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h3 className="font-semibold">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-destructive hover:text-destructive/80 text-xs font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 border-b border-border last:border-0 transition-colors ${
                      item.read ? "bg-card" : "bg-primary/5"
                    }`}
                  >
                    <p className="text-sm">{item.message}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!item.read && (
                        <button
                          onClick={() => markNotificationRead(item.id)}
                          className="text-primary hover:text-primary/85 text-xs font-semibold cursor-pointer"
                        >
                          Mark As Read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">No Notifications</div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer text-foreground"
          >
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="font-medium hidden sm:inline">
              {user?.name || "User"}
            </span>
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-3 w-72 bg-card border border-border rounded-lg shadow-xl z-50 text-foreground">
              <div className="p-4 border-b border-border bg-muted/20 rounded-t-lg">
                <h3 className="font-bold text-base">{user?.name || "User"}</h3>
                <p className="text-xs text-muted-foreground uppercase mt-0.5 font-semibold">
                  {user?.role === "COMPANY_ADMIN" ? "Administrator" : (user?.subRole || user?.role || "Staff")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{user?.email || ""}</p>
              </div>

              <button
                onClick={() => {
                  setShowProfile(false);
                  navigate("/profile-settings");
                }}
                className="w-full text-left p-3 text-sm hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
              >
                <User className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setShowProfile(false);
                  navigate("/profile-settings");
                }}
                className="w-full text-left p-3 text-sm hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>Change Password</span>
              </button>

              {user?.role === "COMPANY_ADMIN" && (
                <button
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/company-settings");
                  }}
                  className="w-full text-left p-3 text-sm hover:bg-muted transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Settings className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <span>Settings</span>
                </button>
              )}

              <button
                onClick={() => {
                  setShowProfile(false);
                  logout();
                }}
                className="w-full text-left p-3 text-sm hover:bg-destructive/5 text-destructive font-semibold border-t border-border cursor-pointer flex items-center gap-2"
              >
                <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default Navbar;