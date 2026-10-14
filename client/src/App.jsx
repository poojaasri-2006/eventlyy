import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import './styles/design-system.css';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Card } from './components/Card';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { OrganizerLayout } from './layouts/OrganizerLayout';
import { VendorLayout } from './layouts/VendorLayout';
import { OrganizerDashboard } from './pages/organizer/OrganizerDashboard';
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { VendorProfile } from './pages/vendor/VendorProfile';
import { VendorServices } from './pages/vendor/VendorServices';
import { VendorPackages } from './pages/vendor/VendorPackages';
import { VendorAvailability } from './pages/vendor/VendorAvailability';
import { VendorRequests } from './pages/vendor/VendorRequests';
import { VendorSendQuote } from './pages/vendor/VendorSendQuote';
import { VendorBookings } from './pages/vendor/VendorBookings';
import { VendorMessages } from './pages/vendor/VendorMessages';
import { VendorSettings } from './pages/vendor/VendorSettings';
import { VendorReviews } from './pages/vendor/VendorReviews';
import { MyEvents } from './pages/organizer/MyEvents';
import { CreateEvent } from './pages/organizer/CreateEvent';
import { EventDetails } from './pages/organizer/EventDetails';
import { VendorMarketplace } from './pages/organizer/VendorMarketplace';
import { VendorDetails } from './pages/organizer/VendorDetails';
import { Shortlist } from './pages/organizer/Shortlist';
import { CompareVendors } from './pages/organizer/CompareVendors';
import { Requests } from './pages/organizer/Requests';
import { Quotes } from './pages/organizer/Quotes';
import { Bookings } from './pages/organizer/Bookings';
import { BookingDetails } from './pages/organizer/BookingDetails';
import { Messages } from './pages/organizer/Messages';
import { Budget } from './pages/organizer/Budget';
import { Notifications } from './pages/organizer/Notifications';
import { Profile } from './pages/organizer/Profile';
import { Settings } from './pages/organizer/Settings';

// Layouts
const PublicLayout = () => (
  <div className="app" style={{ display: 'block' }}>
    <Outlet />
  </div>
);

const AppLayout = () => (
  <div className="app">
    <Sidebar />
    <div className="main">
      <Topbar />
      <Outlet />
    </div>
  </div>
);

// Placeholder Pages
const PlaceholderPage = ({ title }) => (
  <Card>
    <h2>{title}</h2>
    <p>Coming in the next module</p>
  </Card>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/find-vendors" element={<PlaceholderPage title="Find Vendors" />} />
            <Route path="/vendor/:id" element={<PlaceholderPage title="Vendor Details" />} />
          </Route>

          {/* Organizer Routes */}
          <Route element={<ProtectedRoute allowedRole="ORGANIZER" />}>
            <Route path="/organizer" element={<OrganizerLayout />}>
              <Route path="dashboard" element={<OrganizerDashboard />} />
              <Route path="events" element={<MyEvents />} />
              <Route path="events/create" element={<CreateEvent />} />
              <Route path="events/:id" element={<EventDetails />} />
              <Route path="events/:id/edit" element={<PlaceholderPage title="Edit Event" />} />
              <Route path="vendors" element={<VendorMarketplace />} />
              <Route path="vendors/:id" element={<VendorDetails />} />
              <Route path="shortlist" element={<Shortlist />} />
              <Route path="compare" element={<CompareVendors />} />
              <Route path="requests" element={<Requests />} />
              <Route path="quotes" element={<Quotes />} />
              <Route path="quotes/:id" element={<PlaceholderPage title="Quote Details" />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/:id" element={<BookingDetails />} />
              <Route path="messages" element={<Messages />} />
              <Route path="budget" element={<Budget />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Vendor Routes */}
          <Route element={<ProtectedRoute allowedRole="VENDOR" />}>
            <Route path="/vendor" element={<VendorLayout />}>
              <Route path="dashboard" element={<VendorDashboard />} />
              <Route path="profile" element={<VendorProfile />} />
              <Route path="services" element={<VendorServices />} />
              <Route path="packages" element={<VendorPackages />} />
              <Route path="availability" element={<VendorAvailability />} />
              <Route path="requests" element={<VendorRequests />} />
              <Route path="requests/:id" element={<VendorRequests />} />
              <Route path="requests/:id/quote" element={<VendorSendQuote />} />
              <Route path="quotes" element={<VendorSendQuote />} />
              <Route path="quotes/:id" element={<VendorSendQuote />} />
              <Route path="quotes/send" element={<VendorSendQuote />} />
              <Route path="quotes/send/:inquiryId" element={<VendorSendQuote />} />
              <Route path="bookings" element={<VendorBookings />} />
              <Route path="bookings/:id" element={<VendorBookings />} />
              <Route path="messages" element={<VendorMessages />} />
              <Route path="reviews" element={<VendorReviews />} />
              <Route path="settings" element={<VendorSettings />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
