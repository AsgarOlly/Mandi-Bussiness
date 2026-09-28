import React from 'react';
import {
  LayoutDashboard,
  Apple,
  LogOut,
  X,
  Banknote
} from 'lucide-react';

export default function Sidebar({
  activeTab = 'dashboard',
  setActiveTab,
  collapsed,
  mobileOpen,
  setMobileOpen,
  onLogout
}) {
  const handleItemClick = (action) => {
    if (action) action();
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Admin Dashboard',
      subtitle: 'Mandi Trading Overview',
      icon: LayoutDashboard,
      badge: 'Live',
      badgeColor: '#10b981',
      action: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        if (setActiveTab) setActiveTab('dashboard');
      }
    },
    {
      id: 'cash-sale',
      label: 'Cash Sale Ledger',
      subtitle: 'Net Invoice & Payments',
      icon: Banknote,
      badge: 'New',
      badgeColor: '#f59e0b',
      action: () => {
        if (setActiveTab) setActiveTab('cash-sale');
      }
    }
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop active"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`erp-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div
            className="sidebar-brand"
            onClick={() => handleItemClick(navItems[0].action)}
            title="AzizInternational Fresh Fruits & Dry Fruits"
          >
            <div className="brand-icon-box">
              <Apple size={22} />
            </div>
            {!collapsed && (
              <div className="brand-info">
                <span className="brand-title">AzizInternational</span>
                <span className="brand-subtitle">MANDI ERP • SPA</span>
              </div>
            )}
          </div>

          {/* Mobile Close Button */}
          {mobileOpen && (
            <button
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setMobileOpen(false)}
              aria-label="Close Sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="sidebar-nav">
          {!collapsed && <div className="nav-section-title">ADMIN PANEL</div>}

          {navItems.map(item => {
            const Icon = item.icon;
            const isSelected = item.id === activeTab;

            return (
              <div
                key={item.id}
                className={`nav-item ${isSelected ? 'active' : ''}`}
                onClick={() => handleItemClick(item.action)}
                title={item.label}
              >
                <div className="nav-item-icon">
                  <Icon size={18} />
                </div>
                {!collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '10px',
                            background: `${item.badgeColor}20`,
                            color: item.badgeColor,
                            border: `1px solid ${item.badgeColor}40`
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {item.subtitle && (
                      <span style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {item.subtitle}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {onLogout && (
          <div style={{ padding: collapsed ? '12px 6px' : '12px 14px', borderTop: '1px solid var(--border-subtle)', marginTop: 'auto' }}>
            <button
              onClick={() => handleItemClick(onLogout)}
              title="Log Out"
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: '10px',
                padding: collapsed ? '10px 0' : '9px 12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                fontWeight: 600,
                fontSize: '0.84rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                e.currentTarget.style.color = '#ef4444';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <LogOut size={17} />
              {!collapsed && <span>Log Out</span>}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
