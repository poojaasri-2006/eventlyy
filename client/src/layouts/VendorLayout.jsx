import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  User, 
  Briefcase, 
  Package, 
  Calendar, 
  FileText, 
  MessageSquare, 
  CheckSquare, 
  Star,
  DollarSign, 
  Bell, 
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '../components/Button';

export const VendorLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/vendor/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'My Profile', path: '/vendor/profile', icon: <User size={20} /> },
    { name: 'Services', path: '/vendor/services', icon: <Briefcase size={20} /> },
    { name: 'Packages', path: '/vendor/packages', icon: <Package size={20} /> },
    { name: 'Availability', path: '/vendor/availability', icon: <Calendar size={20} /> },
    { name: 'Requests', path: '/vendor/requests', icon: <FileText size={20} /> },
    { name: 'Quotes', path: '/vendor/quotes', icon: <FileText size={20} /> },
    { name: 'Bookings', path: '/vendor/bookings', icon: <CheckSquare size={20} /> },
    { name: 'Messages', path: '/vendor/messages', icon: <MessageSquare size={20} /> },
    { name: 'Reviews', path: '/vendor/reviews', icon: <Star size={20} /> },
    { name: 'Settings', path: '/vendor/settings', icon: <Settings size={20} /> },
  ];

  const getPageTitle = () => {
    const currentItem = navItems.find(item => location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/vendor'));
    return currentItem ? currentItem.name : 'Dashboard';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--background-rose-light)' }}>
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside 
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          width: '260px',
          backgroundColor: 'var(--card-white)',
          borderRight: '1px solid var(--surface-soft)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 50,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          '@media (min-width: 1024px)': {
            transform: 'translateX(0)'
          }
        }}
        className="vendor-sidebar"
      >
        <div style={{ padding: '2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--primary-rose-dark)', margin: 0, fontSize: '1.75rem' }}>Evently</h2>
          <button 
            className="mobile-close-btn" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 2rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Vendor Portal
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-normal)',
                textDecoration: 'none',
                color: isActive ? 'var(--primary-rose-dark)' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary-rose-tint)' : 'transparent',
                fontWeight: isActive ? '500' : '400',
                transition: 'all 0.2s ease'
              })}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main 
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: 0
        }}
        className="vendor-main"
      >
        {/* Topbar */}
        <header style={{
          backgroundColor: 'var(--card-white)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 0,
          zIndex: 30
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <Menu size={24} />
            </button>
            <h1 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{getPageTitle()}</h1>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Notification placeholder for now, to be integrated later if schema allows */}
            <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}>
              <Bell size={24} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', backgroundColor: 'var(--primary-rose)', borderRadius: '50%' }}></span>
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid var(--surface-soft)', paddingLeft: '1.5rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-rose-dark)', fontWeight: '600' }}>
                {user?.fullName?.charAt(0) || user?.businessName?.charAt(0) || user?.email?.charAt(0) || 'V'}
              </div>
              <div className="user-info-desktop" style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: '500', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{user?.fullName || user?.businessName || user?.email}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Vendor</span>
              </div>
              <Button variant="outline" onClick={handleLogout} style={{ padding: '0.5rem', marginLeft: '1rem' }} title="Log out">
                <LogOut size={18} />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: '2rem', overflowY: 'auto' }}>
          <Outlet />
        </div>
      </main>

      {/* Inline styles for media queries */}
      <style>{`
        @media (min-width: 1024px) {
          .vendor-sidebar {
            transform: translateX(0) !important;
          }
          .vendor-main {
            margin-left: 260px !important;
          }
          .mobile-menu-btn {
            display: none !important;
          }
          .mobile-close-btn {
            display: none !important;
          }
        }
        @media (max-width: 768px) {
          .user-info-desktop {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
