import API_BASE_URL from '../../config';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingState } from '../../components/LoadingState';
import { Search, Send } from 'lucide-react';

export const Messages = () => {
  const { token, user } = useAuth();
  
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        throw new Error('Authentication expired. Please log in again.');
      }
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${res.status}`);
      }
      
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('The conversations API returned an invalid response.');
      return data;
  }, [token]);

  const fetchConversations = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      setConversations(await loadConversations());
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load conversations.');
    } finally {
      setLoading(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const data = await loadConversations();
        if (!mounted) return;
        setConversations(data);
        setError(null);
      } catch (err) {
        console.error(err);
        if (mounted) setError(err.message || 'Unable to load conversations.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void refresh();
    const intervalId = window.setInterval(refresh, 10000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [loadConversations]);

  const loadMessages = useCallback(async (contactId) => {
    const res = await fetch(`${API_BASE_URL}/api/messages/${contactId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to fetch messages (HTTP ${res.status})`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('The messages API returned an invalid response.');
    return data;
  }, [token]);

  const activeContactId = activeContact?.id;
  useEffect(() => {
    if (!activeContactId) return undefined;
    let mounted = true;
    const refresh = async () => {
      try {
        const data = await loadMessages(activeContactId);
        if (!mounted) return;
        setMessages(data);
        setMessagesError('');
      } catch (err) {
        console.error(err);
        if (mounted) setMessagesError(err.message || 'Unable to load messages.');
      } finally {
        if (mounted) setMessagesLoading(false);
      }
    };
    void refresh();
    const intervalId = window.setInterval(refresh, 3000);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [activeContactId, loadMessages]);

  const fetchMessages = async (contactId, showLoading = false) => {
    if (showLoading) setMessagesLoading(true);
    try {
      setMessages(await loadMessages(contactId));
      setMessagesError('');
    } catch (err) {
      console.error(err);
      setMessagesError(err.message || 'Unable to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    setSending(true);
    setSendError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/${activeContact.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newMessage })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to send message');
      }

      const sentMessage = await res.json();
      setMessages(prev => [...prev, sentMessage]);
      setNewMessage('');
      
      // Update conversations list so the latest message shows
      fetchConversations();
    } catch (err) {
      console.error(err);
      setSendError(err.message);
    } finally {
      setSending(false);
    }
  };

  const getContactName = (contactUser) => {
    if (contactUser.vendorProfile) return contactUser.vendorProfile.businessName;
    if (contactUser.organizerProfile) return `${contactUser.organizerProfile.firstName} ${contactUser.organizerProfile.lastName}`;
    return 'Unknown User';
  };

  const filteredConversations = conversations.filter(conv => {
    const name = getContactName(conv.contact).toLowerCase();
    const eventNames = (conv.events || []).map(event => event.title.toLowerCase());
    const query = searchQuery.toLowerCase();
    return name.includes(query) || eventNames.some(eventName => eventName.includes(query));
  });

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={() => fetchConversations(true)}>Try Again</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxWidth: '1400px', margin: '0 auto', gap: '1.5rem' }}>
      <div>
        <h1 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Messages</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Communicate with your connected vendors.</p>
      </div>

      <Card style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 0, flexDirection: 'row' }} className="messages-container">
        
        {/* Left Panel: Conversations List */}
        <div className={`conversations-panel ${activeContact ? 'hidden-mobile' : ''}`} style={{ width: '350px', borderRight: '1px solid var(--surface-soft)', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
          
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-soft)' }}>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} size={18} />
              <Input 
                placeholder="Search conversations..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '2.75rem', width: '100%', backgroundColor: 'var(--surface-soft)', border: 'none' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length > 0 ? (
              filteredConversations.map(conv => {
                const isActive = activeContact?.id === conv.contact.id;
                const contactName = getContactName(conv.contact);
                return (
                  <div 
                    key={conv.contact.id}
                    onClick={() => {
                      setActiveContact(conv.contact);
                      setMessages([]);
                      setMessagesLoading(true);
                      setMessagesError('');
                    }}
                    style={{ 
                      padding: '1.25rem 1.5rem', 
                      borderBottom: '1px solid var(--surface-soft)',
                      cursor: 'pointer',
                      backgroundColor: isActive ? 'var(--primary-rose-tint)' : 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: isActive ? 'var(--card-white)' : 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)', fontSize: '1.1rem', flexShrink: 0 }}>
                        {contactName.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                          <h4 style={{ margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contactName}</h4>
                          {conv.lastMessage && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              {new Date(conv.lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {conv.lastMessage
                            ? `${conv.lastMessage.senderId === user.id ? 'You: ' : ''}${conv.lastMessage.content}`
                            : (conv.events || []).map(event => event.title).join(', ') || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {conversations.length === 0 ? "No messages yet." : "No matching conversations."}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Chat Area */}
        <div className={`chat-panel ${!activeContact ? 'hidden-mobile' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#FAFAFA' }}>
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-soft)', backgroundColor: '#fff', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className="back-btn" 
                  onClick={() => setActiveContact(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--primary-rose)', display: 'none' }}
                >
                  &larr; Back
                </button>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-rose-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', color: 'var(--primary-rose-dark)' }}>
                  {getContactName(activeContact).charAt(0)}
                </div>
                <h3 style={{ margin: 0 }}>{getContactName(activeContact)}</h3>
                <Button variant="outline" onClick={fetchConversations} style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>Refresh</Button>
              </div>

              {/* Chat Messages */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {messagesLoading ? (
                  <LoadingState />
                ) : messagesError ? (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--primary-rose-dark)' }}>
                    <p>{messagesError}</p>
                    <Button variant="outline" onClick={() => fetchMessages(activeContact.id, true)}>Retry</Button>
                  </div>
                ) : (
                  messages.length > 0 ? (
                    messages.map((msg, index) => {
                      const isMe = msg.senderId === user.id;
                      return (
                        <div key={msg.id || index} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                          <div style={{ 
                            maxWidth: '70%', 
                            padding: '1rem', 
                            borderRadius: '1rem', 
                            borderBottomRightRadius: isMe ? 0 : '1rem',
                            borderBottomLeftRadius: !isMe ? 0 : '1rem',
                            backgroundColor: isMe ? 'var(--primary-rose)' : '#fff',
                            color: isMe ? '#fff' : 'var(--text-primary)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                          }}>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>{msg.content}</p>
                            <div style={{ fontSize: '0.7rem', marginTop: '0.5rem', textAlign: 'right', opacity: 0.8 }}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ margin: 'auto', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      <p>No messages yet.</p>
                      <p style={{ fontSize: '0.9rem' }}>Send a message to start the conversation.</p>
                    </div>
                  )
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderTop: '1px solid var(--surface-soft)' }}>
                {sendError && <div style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem', fontSize: '0.9rem' }}>{sendError}</div>}
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                  <Input 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ flex: 1, backgroundColor: 'var(--surface-soft)', border: 'none' }}
                    disabled={sending}
                  />
                  <Button type="submit" variant="primary" disabled={sending || !newMessage.trim()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1.5rem' }}>
                    <Send size={18} /> {sending ? 'Sending...' : 'Send'}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
              <div>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>No conversation selected</h3>
                <p>Select a conversation from the list to view messages.</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <style>{`
        @media (max-width: 768px) {
          .messages-container {
            flex-direction: column !important;
          }
          .conversations-panel {
            width: 100% !important;
            border-right: none !important;
          }
          .hidden-mobile {
            display: none !important;
          }
          .back-btn {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};
