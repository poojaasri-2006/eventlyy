import API_BASE_URL from '../../config';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Ban,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Info,
  CalendarCheck2
} from 'lucide-react';
import { Modal } from '../../components/Modal';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Helper to format Date into YYYY-MM-DD
const formatDateKey = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const VendorAvailability = () => {
  const { token } = useAuth();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  const [availabilityList, setAvailabilityList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Selected date & modal state
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form inputs
  const [isBlocked, setIsBlocked] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');
  const [currentEntryId, setCurrentEntryId] = useState(null);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/vendor/availability`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to load availability');
      }

      const data = await res.json();
      setAvailabilityList(data.availability || []);
      setBookingsList(data.bookings || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    // eslint-disable-next-line
  }, [token]);

  // Navigate months
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  // Build mapping of dates to entries
  const availabilityMap = {};
  availabilityList.forEach(item => {
    const dateKey = item.date.split('T')[0];
    availabilityMap[dateKey] = item;
  });

  const bookingsMap = {};
  bookingsList.forEach(item => {
    if (item.event?.date) {
      const dateKey = item.event.date.split('T')[0];
      if (!bookingsMap[dateKey]) bookingsMap[dateKey] = [];
      bookingsMap[dateKey].push(item);
    }
  });

  // Calculate calendar days for grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Open modal for selected date
  const handleDateClick = (dayNumber) => {
    const clickedDate = new Date(currentYear, currentMonth, dayNumber);
    const dateKey = formatDateKey(clickedDate);
    setSelectedDate(clickedDate);

    const existingEntry = availabilityMap[dateKey];
    if (existingEntry) {
      setCurrentEntryId(existingEntry.id);
      setIsBlocked(existingEntry.isBlocked);
      setStartTime(existingEntry.startTime || '');
      setEndTime(existingEntry.endTime || '');
      setReason(existingEntry.reason || '');
    } else {
      setCurrentEntryId(null);
      setIsBlocked(false);
      setStartTime('');
      setEndTime('');
      setReason('');
    }

    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveAvailability = async (e) => {
    e.preventDefault();
    if (!selectedDate) return;

    if (startTime && endTime && startTime > endTime) {
      setFormError('End time cannot be earlier than start time.');
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const dateStr = formatDateKey(selectedDate);

      const res = await fetch(`${API_BASE_URL}/api/vendor/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          date: dateStr,
          isBlocked,
          startTime: startTime || null,
          endTime: endTime || null,
          reason: reason || null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to save availability');
      }

      setSuccessMessage('Availability updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
      fetchAvailability();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!currentEntryId) return;
    if (!window.confirm('Reset this date back to default available status?')) return;

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/vendor/availability/${currentEntryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to remove entry');
      }

      setSuccessMessage('Entry removed and reset to default.');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsModalOpen(false);
      fetchAvailability();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !availabilityList.length && !bookingsList.length) {
    return <LoadingState />;
  }

  if (error && !availabilityList.length && !bookingsList.length) {
    return (
      <Card style={{ padding: '2.5rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1.25rem' }}>{error}</p>
        <Button variant="primary" onClick={fetchAvailability}>Try Again</Button>
      </Card>
    );
  }

  // Count month stats
  const totalBookedThisMonth = Object.keys(bookingsMap).filter(key => {
    const [y, m] = key.split('-').map(Number);
    return y === currentYear && m === currentMonth + 1;
  }).length;

  const totalBlockedThisMonth = Object.keys(availabilityMap).filter(key => {
    const [y, m] = key.split('-').map(Number);
    return y === currentYear && m === currentMonth + 1 && availabilityMap[key].isBlocked;
  }).length;

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null;
  const selectedDateBookings = selectedDateKey ? (bookingsMap[selectedDateKey] || []) : [];

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', paddingBottom: '2.5rem' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Availability Calendar</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage the dates and hours you are available for organizer bookings.
          </p>
        </div>
        <Button variant="outline" onClick={handleToday} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CalendarIcon size={16} /> Today
        </Button>
      </div>

      {successMessage && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#d1fae5', color: '#10b981', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} /> {successMessage}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #6366f1' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Confirmed Bookings</p>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.6rem' }}>{totalBookedThisMonth}</h3>
          <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: '500' }}>In {MONTH_NAMES[currentMonth]}</span>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Blocked / Unavailable</p>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.6rem' }}>{totalBlockedThisMonth}</h3>
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '500' }}>In {MONTH_NAMES[currentMonth]}</span>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.25rem 0' }}>Available Days</p>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.6rem' }}>{Math.max(0, daysInMonth - totalBookedThisMonth - totalBlockedThisMonth)}</h3>
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '500' }}>Open for inquiries</span>
        </Card>
      </div>

      {/* Main Calendar Card */}
      <Card style={{ padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        
        {/* Calendar Month Navigation Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: '600' }}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handlePrevMonth}
              style={{
                background: 'var(--surface-soft)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-primary)'
              }}
              title="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNextMonth}
              style={{
                background: 'var(--surface-soft)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-primary)'
              }}
              title="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--surface-soft)', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#dcfce7', border: '1px solid #86efac' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Available</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Blocked / Unavailable</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#e0e7ff', border: '1px solid #a5b4fc' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Booked Event</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          
          {/* Day of Week Headers */}
          {DAYS_OF_WEEK.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', padding: '0.5rem 0', fontSize: '0.85rem' }}>
              {day}
            </div>
          ))}

          {/* Blank cells for offset */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`empty-${idx}`} style={{ minHeight: '90px', backgroundColor: '#fafafa', borderRadius: 'var(--radius-sm)', opacity: 0.4 }}></div>
          ))}

          {/* Month Day Cells */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const dateObj = new Date(currentYear, currentMonth, dayNum);
            const dateKey = formatDateKey(dateObj);

            const isToday =
              today.getFullYear() === currentYear &&
              today.getMonth() === currentMonth &&
              today.getDate() === dayNum;

            const entry = availabilityMap[dateKey];
            const bookings = bookingsMap[dateKey] || [];
            const hasBooking = bookings.length > 0;
            const isBlockedDate = entry?.isBlocked;
            const hasCustomTimes = entry && !entry.isBlocked && (entry.startTime || entry.endTime);

            // Determine cell styling
            let cellBg = '#fff';
            let cellBorder = '1px solid #e5e7eb';

            if (hasBooking) {
              cellBg = '#eef2ff';
              cellBorder = '1.5px solid #a5b4fc';
            } else if (isBlockedDate) {
              cellBg = '#fef2f2';
              cellBorder = '1.5px solid #fca5a5';
            } else if (hasCustomTimes) {
              cellBg = '#f0fdf4';
              cellBorder = '1.5px solid #86efac';
            }

            return (
              <div
                key={dateKey}
                onClick={() => handleDateClick(dayNum)}
                style={{
                  minHeight: '90px',
                  backgroundColor: cellBg,
                  border: cellBorder,
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.06)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Day Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: isToday ? '700' : '500',
                    color: isToday ? '#fff' : 'var(--text-primary)',
                    backgroundColor: isToday ? 'var(--primary-rose)' : 'transparent',
                    width: isToday ? '24px' : 'auto',
                    height: isToday ? '24px' : 'auto',
                    borderRadius: isToday ? '50%' : '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {dayNum}
                  </span>

                  {hasBooking && <CalendarCheck2 size={14} style={{ color: '#6366f1' }} />}
                  {!hasBooking && isBlockedDate && <Ban size={14} style={{ color: '#ef4444' }} />}
                </div>

                {/* Day Content Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: 'auto' }}>
                  {hasBooking && (
                    <span style={{
                      backgroundColor: '#6366f1',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.35rem',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {bookings[0].event?.title || 'Booked'}
                    </span>
                  )}

                  {!hasBooking && isBlockedDate && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: '#fff',
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      padding: '0.15rem 0.35rem',
                      borderRadius: '3px',
                      textAlign: 'center'
                    }}>
                      Blocked
                    </span>
                  )}

                  {!hasBooking && !isBlockedDate && hasCustomTimes && (
                    <span style={{
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      fontSize: '0.68rem',
                      fontWeight: '500',
                      padding: '0.15rem 0.35rem',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {entry.startTime ? `${entry.startTime}-${entry.endTime || ''}` : 'Custom'}
                    </span>
                  )}

                  {!hasBooking && !isBlockedDate && !hasCustomTimes && (
                    <span style={{
                      fontSize: '0.68rem',
                      color: '#15803d',
                      fontWeight: '500'
                    }}>
                      Available
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Date Details & Manage Availability Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDate ? `${selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : 'Manage Availability'}
      >
        {formError && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} /> {formError}
          </div>
        )}

        {/* Existing Bookings for this date */}
        {selectedDateBookings.length > 0 && (
          <div style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#4338ca', fontWeight: '600', marginBottom: '0.4rem', fontSize: '0.95rem' }}>
              <CalendarCheck2 size={18} /> Confirmed Event Booking
            </div>
            {selectedDateBookings.map(b => (
              <div key={b.id} style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                <p style={{ margin: '0 0 0.2rem 0', fontWeight: '600' }}>{b.event?.title || 'Private Event'}</p>
                {b.event?.location && <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>📍 {b.event.location}</p>}
              </div>
            ))}
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#4338ca', fontStyle: 'italic' }}>
              This date is reserved for a confirmed event.
            </p>
          </div>
        )}

        <form onSubmit={handleSaveAvailability} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Availability Toggle */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              Availability Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setIsBlocked(false)}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: !isBlocked ? '2px solid #10b981' : '1px solid #e5e7eb',
                  backgroundColor: !isBlocked ? '#f0fdf4' : '#fff',
                  color: !isBlocked ? '#15803d' : 'var(--text-secondary)',
                  fontWeight: !isBlocked ? '600' : '400',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={16} /> Available
              </button>

              <button
                type="button"
                onClick={() => setIsBlocked(true)}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  border: isBlocked ? '2px solid #ef4444' : '1px solid #e5e7eb',
                  backgroundColor: isBlocked ? '#fef2f2' : '#fff',
                  color: isBlocked ? '#b91c1c' : 'var(--text-secondary)',
                  fontWeight: isBlocked ? '600' : '400',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Ban size={16} /> Blocked / Off
              </button>
            </div>
          </div>

          {/* Time Window (Optional) */}
          {!isBlocked && (
            <div style={{ borderTop: '1px solid var(--surface-soft)', paddingTop: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                Working Hours (Optional)
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Start Time</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>End Time</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Note / Reason */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
              {isBlocked ? 'Reason for Blocking (Optional)' : 'Notes / Availability Details (Optional)'}
            </label>
            <input
              type="text"
              placeholder={isBlocked ? 'e.g., Vacation, Family event, Maintenance' : 'e.g., Morning bookings only, Open for travel'}
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--surface-soft)', borderRadius: 'var(--radius-md)' }}
            />
          </div>

          {/* Modal Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            {currentEntryId ? (
              <button
                type="button"
                onClick={handleDeleteEntry}
                disabled={saving}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  textDecoration: 'underline'
                }}
              >
                <Trash2 size={15} /> Reset to Default
              </button>
            ) : <div></div>}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Availability'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
};
