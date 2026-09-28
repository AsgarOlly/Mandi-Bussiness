import React from 'react';
import { Menu, Search, Sun, Moon } from 'lucide-react';

export default function Navbar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  onSearch,
  searchQuery,
  theme = 'light',
  toggleTheme,
  currentUser
}) {
  const handleMenuToggle = () => {
    if (window.innerWidth <= 768) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const displayName = currentUser?.first_name
    ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim()
    : (currentUser?.name || currentUser?.username || 'Aziz Admin');
  const displayRole = currentUser?.role || 'Super Admin';
  const initialChar = displayName ? displayName[0].toUpperCase() : 'A';

  return (
    <header className="erp-navbar">
      <div className="navbar-left">
        <button
          className="toggle-sidebar-btn"
          onClick={handleMenuToggle}
          title="Toggle Navigation Menu"
          aria-label="Toggle Menu"
        >
          <Menu size={20} />
        </button>

        <div className="search-bar-box">
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search Fruit, Variety, Truck, Party..."
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="navbar-right">
        {/* Theme Toggle */}
        {toggleTheme && (
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        )}

        {/* User Profile */}
        <div className="user-profile-widget" title={`Logged in as ${displayName}`}>
          <div
            className="user-avatar"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #f97316 100%)', boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)' }}
          >
            {initialChar}
          </div>
          <div className="hide-on-mobile" style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{displayName}</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--emerald-dark, #059669)', fontWeight: 700 }}>{displayRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
