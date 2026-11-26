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
  LogOut,
  Menu,
  Search,
  Building2,
  ChevronDown,
  X,
} from "lucide-react";

/**
 * Top utility bar with global search, branch context switcher, theme toggle,
 * notifications drawer, and user menu.
 */
function Navbar() {
  const navigate = useNavigate();

  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const notifications = useStore((state) => state.notifications);
  const markNotificationRead = useStore((state) => state.markNotificationRead);
  const clearNotifications = useStore((state) => state.clearNotifications);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const setSidebarOpen = useStore((state) => state.setSidebarOpen);
  const branches = useStore((state) => state.branches);
  const activeBranchId = useStore((state) => state.activeBranchId);
  const fetchBranches = useStore((state) => state.fetchBranches);
  const setActiveBranch = useStore((state) => state.setActiveBranch);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");

  const searchRef = useRef(null);
  const notificationsRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchBranches();
    }
  }, [user, fetchBranches]);

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

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  useEffect(() => {
    if (!search.trim()) {
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(search)}`);
        setSearchResults(res.data || []);
        if ((res.data || []).length > 0) {
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error("Global search failed:", err);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 280);

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
  const canSwitchBranch =
    user?.role === "SUPER_ADMIN" || user?.role === "COMPANY_ADMIN";
  const currentBranch =
    branches.find((b) => String(b.id) === String(activeBranchId)) ||
    branches.find((b) => String(b.id) === String(user?.branchId)) ||
    branches[0];

  return (
    <header className="sticky top-0 z-30 h-14 bg-card/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 flex justify-between items-center gap-3 text-foreground no-print shrink-0">
      {/* Left: Mobile Drawer Trigger + Global Search */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden h-8 w-8 rounded-md border border-border bg-background/60 hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center shrink-0 transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-4 h-4" strokeWidth={1.75} />
        </button>

        <div ref={searchRef} className="w-full max-w-xs sm:max-w-sm md:max-w-md relative flex-1 min-w-0">
          <div className="relative flex items-center">
            <Search
              className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search invoices, parties, items..."
              value={search}
              onChange={handleSearchChange}
              onFocus={() => {
                if (search.trim()) {
                  setShowSearchDropdown(true);
                }
              }}
              className="w-full h-9 pl-9 pr-8 border border-input bg-background/70 focus:bg-card text-foreground text-xs sm:text-sm rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setSearchResults([]);
                  setShowSearchDropdown(false);
                }}
                className="absolute right-2 p-0.5 rounded text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {search && showSearchDropdown && (
            <div className="absolute left-0 right-0 mt-1.5 bg-card border border-border rounded-lg popover-shadow z-50 max-h-80 overflow-y-auto scrollbar-thin text-foreground divide-y divide-border/60">
              {loadingSearch ? (
                <div className="p-3.5 text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" aria-hidden="true" />
                  <span>Searching records...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleResultClick(item)}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-secondary/60 cursor-pointer flex justify-between items-center gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground block truncate">
                        {item.name}
                      </span>
                      {item.details && (
                        <span className="text-xs text-muted-foreground block truncate">
                          {item.details}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary-text border border-primary/20 rounded uppercase shrink-0">
                      {item.type}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">No matching records</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Branch Switcher, Theme, Notifications, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {branches.length > 0 && (
          <div className="hidden md:flex items-center h-8 px-2.5 rounded-md border border-border bg-background/70 text-xs text-foreground gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            {canSwitchBranch ? (
              <select
                aria-label="Active Branch"
                value={activeBranchId || currentBranch?.id || ""}
                onChange={(e) => setActiveBranch(Number(e.target.value))}
                className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer pr-1 max-w-[165px] truncate"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id} className="bg-card text-foreground">
                    {branch.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-medium truncate max-w-[150px]">
                {currentBranch?.name || "Main Branch"}
              </span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={toggleTheme}
          className="h-8 w-8 rounded-md border border-border bg-background/70 hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground flex items-center justify-center"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          aria-label={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Sun className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        {/* Notifications */}
        <div ref={notificationsRef} className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative h-8 w-8 rounded-md border border-border bg-background/70 hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-semibold rounded-full flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg popover-shadow z-50 max-h-96 overflow-y-auto scrollbar-thin text-foreground">
              <div className="px-4 py-3 border-b border-border flex justify-between items-center">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notifications
                </h3>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-destructive hover:text-destructive/80 text-xs font-medium cursor-pointer"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {notifications.length > 0 ? (
                <div className="divide-y divide-border/70">
                  {notifications.map((item) => (
                    <div
                      key={item.id}
                      className={`px-4 py-3 transition-colors ${
                        item.read ? "bg-card" : "bg-primary/5"
                      }`}
                    >
                      <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {!item.read && (
                          <button
                            type="button"
                            onClick={() => markNotificationRead(item.id)}
                            className="text-primary-text hover:underline text-xs font-medium cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  No pending alerts
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setShowProfile((prev) => !prev)}
            className="h-8 pl-1.5 pr-2 rounded-md border border-border bg-background/70 hover:bg-secondary transition-colors cursor-pointer text-foreground flex items-center gap-2"
          >
            <div className="w-5 h-5 bg-primary text-primary-foreground rounded text-[11px] font-semibold flex items-center justify-center">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-xs font-medium hidden sm:inline max-w-[110px] truncate">
              {user?.name || "User"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground hidden sm:inline" />
          </button>

          {showProfile && (
            <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg popover-shadow z-50 text-foreground overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/40">
                <p className="font-semibold text-sm text-foreground truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-[11px] text-primary-text uppercase font-semibold tracking-wider mt-0.5">
                  {user?.role === "COMPANY_ADMIN"
                    ? "Administrator"
                    : user?.subRole || user?.role || "Staff"}
                </p>
                {user?.email && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                )}
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/profile-settings");
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-secondary/70 transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <User className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.6} />
                  <span>My Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    navigate("/profile-settings");
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-secondary/70 transition-colors cursor-pointer flex items-center gap-2.5"
                >
                  <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.6} />
                  <span>Change Password</span>
                </button>

                {(user?.role === "COMPANY_ADMIN" || user?.role === "SUPER_ADMIN") && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfile(false);
                      navigate("/company-settings");
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-secondary/70 transition-colors cursor-pointer flex items-center gap-2.5"
                  >
                    <Settings className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={1.6} />
                    <span>Company Settings</span>
                  </button>
                )}
              </div>

              <div className="border-t border-border py-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm hover:bg-destructive/10 text-destructive font-medium cursor-pointer flex items-center gap-2.5"
                >
                  <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
