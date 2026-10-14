import API_BASE_URL from '../../config';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { LoadingState } from '../../components/LoadingState';
import { ArrowLeft, Calendar, MessageSquare, Search, Send } from 'lucide-react';

const contactName = (contact) => {
  const profile = contact?.organizerProfile;
  const name = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim();
  return name || contact?.email || 'Organizer';
};

const eventLabel = (event) => (
  `${event.title}${event.date ? ` · ${new Date(event.date).toLocaleDateString()}` : ''}`
);

export const VendorMessages = () => {
  const { token, user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageError, setMessageError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadConversations = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || `Unable to load conversations (HTTP ${response.status}).`);
    }
    if (!Array.isArray(data)) throw new Error('The conversations API returned an invalid response.');
    return data;
  }, [token]);

  const refreshConversations = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await loadConversations();
      setConversations(data);
      setError(null);
      setActiveConversation((current) => (
        current
          ? data.find((conversation) => conversation.contact.id === current.contact.id) || null
          : null
      ));
    } catch (fetchError) {
      console.error('[Vendor Conversations Error]', fetchError);
      setError(fetchError.message || 'Unable to load conversations.');
    } finally {
      setLoading(false);
    }
  }, [loadConversations]);

  const fetchMessages = useCallback(async (contactId) => {
    const response = await fetch(`${API_BASE_URL}/api/messages/${contactId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.message || `Unable to load messages (HTTP ${response.status}).`);
    }
    if (!Array.isArray(data)) throw new Error('The messages API returned an invalid response.');
    return data;
  }, [token]);

  const loadMessages = useCallback(async (contactId, { showLoading = false } = {}) => {
    if (showLoading) setMessagesLoading(true);
    try {
      setMessages(await fetchMessages(contactId));
      setMessageError(null);
    } catch (fetchError) {
      console.error('[Vendor Messages Error]', fetchError);
      setMessageError(fetchError.message || 'Unable to load messages.');
    } finally {
      setMessagesLoading(false);
    }
  }, [fetchMessages]);

  const activeContactId = activeConversation?.contact.id;
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        const data = await loadConversations();
        if (!mounted) return;
        setConversations(data);
        setError(null);
        setActiveConversation((current) => (
          current
            ? data.find((conversation) => conversation.contact.id === current.contact.id) || null
            : null
        ));
      } catch (fetchError) {
        console.error('[Vendor Conversations Error]', fetchError);
        if (mounted) setError(fetchError.message || 'Unable to load conversations.');
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

  useEffect(() => {
    if (!activeContactId) return undefined;
    let mounted = true;
    const refresh = async () => {
      try {
        const data = await fetchMessages(activeContactId);
        if (!mounted) return;
        setMessages(data);
        setMessageError(null);
      } catch (fetchError) {
        console.error('[Vendor Messages Error]', fetchError);
        if (mounted) setMessageError(fetchError.message || 'Unable to load messages.');
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
  }, [activeContactId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeConversation || sending) return;

    setSending(true);
    setMessageError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/messages/${activeConversation.contact.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ content })
        }
      );
      const sentMessage = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(sentMessage?.message || `Unable to send message (HTTP ${response.status}).`);
      }
      if (!sentMessage?.id) throw new Error('The message API returned an invalid response.');

      setDraft('');
      setMessages((current) => (
        current.some((message) => message.id === sentMessage.id)
          ? current
          : [...current, sentMessage]
      ));
      await refreshConversations();
    } catch (sendError) {
      console.error('[Vendor Send Message Error]', sendError);
      setMessageError(sendError.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter((conversation) => {
    const name = contactName(conversation.contact).toLowerCase();
    const eventNames = (conversation.events || []).map((event) => event.title.toLowerCase());
    const query = searchQuery.toLowerCase();
    return name.includes(query) || eventNames.some((eventTitle) => eventTitle.includes(query));
  });

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p role="alert" style={{ color: 'var(--primary-rose-dark)', marginBottom: '1rem' }}>{error}</p>
        <Button variant="primary" onClick={() => refreshConversations(true)}>Try Again</Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 150px)', minHeight: '520px', maxWidth: '1400px', margin: '0 auto', gap: '1rem' }}>
      <div>
        <h1 style={{ color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>Messages</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Communicate with organizers connected to your requests and bookings.</p>
      </div>

      <Card style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', padding: 0 }} className="vendor-messages-container">
        <aside
          className={activeConversation ? 'vendor-conversations-panel vendor-conversations-hidden-mobile' : 'vendor-conversations-panel'}
          style={{ width: '340px', flexShrink: 0, borderRight: '1px solid var(--surface-soft)', display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--surface-soft)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <Input
                aria-label="Search conversations"
                placeholder="Search organizer or event..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                style={{ width: '100%', paddingLeft: '2.6rem', backgroundColor: 'var(--surface-soft)', border: 'none' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length ? filteredConversations.map((conversation) => {
              const active = activeConversation?.contact.id === conversation.contact.id;
              const name = contactName(conversation.contact);
              const latest = conversation.lastMessage;
              const eventTitle = conversation.events?.[0]?.title;
              return (
                <button
                  key={conversation.contact.id}
                  type="button"
                  onClick={() => {
                    setActiveConversation(conversation);
                    setMessages([]);
                    setMessagesLoading(true);
                    setMessageError(null);
                  }}
                  aria-pressed={active}
                  style={{
                    width: '100%',
                    border: 0,
                    borderBottom: '1px solid var(--surface-soft)',
                    padding: '1rem',
                    display: 'flex',
                    gap: '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    backgroundColor: active ? 'var(--primary-rose-tint)' : '#fff'
                  }}
                >
                  {conversation.contact.vendorProfile?.imageUrl ? (
                    <img
                      src={conversation.contact.vendorProfile.imageUrl}
                      alt=""
                      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <span style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', backgroundColor: 'var(--primary-rose-tint)', color: 'var(--primary-rose-dark)', fontWeight: 600, flexShrink: 0 }}>
                      {name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
                      <strong style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong>
                      {latest && <small style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{new Date(latest.createdAt).toLocaleDateString()}</small>}
                    </span>
                    {eventTitle && <span style={{ display: 'block', marginTop: '0.15rem', color: 'var(--primary-rose-dark)', fontSize: '0.8rem' }}>{eventTitle}</span>}
                    <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {latest ? `${latest.senderId === user?.id ? 'You: ' : ''}${latest.content}` : 'No messages yet'}
                    </span>
                  </span>
                </button>
              );
            }) : (
              <div style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {conversations.length ? 'No conversations match your search.' : 'No organizer conversations yet. An inquiry, shortlist, or booking will connect you with an organizer.'}
              </div>
            )}
          </div>
        </aside>

        <section className={activeConversation ? 'vendor-chat-panel' : 'vendor-chat-panel vendor-chat-hidden-mobile'} style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background-rose-light)' }}>
          {activeConversation ? (
            <>
              <header style={{ padding: '0.9rem 1.25rem', backgroundColor: '#fff', borderBottom: '1px solid var(--surface-soft)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button type="button" className="vendor-message-back" onClick={() => { setActiveConversation(null); setMessages([]); }} aria-label="Back to conversations" style={{ display: 'none', border: 0, background: 'transparent', color: 'var(--primary-rose-dark)' }}>
                  <ArrowLeft size={20} />
                </button>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>{contactName(activeConversation.contact)}</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem 0.8rem', marginTop: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {(activeConversation.events || []).map((event) => (
                      <span key={event.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={13} />{eventLabel(event)}
                      </span>
                    ))}
                  </div>
                </div>
              </header>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messagesLoading && messages.length === 0 ? (
                  <LoadingState />
                ) : messageError ? (
                  <div role="alert" style={{ margin: 'auto', textAlign: 'center', color: 'var(--primary-rose-dark)' }}>
                    <p>{messageError}</p>
                    <Button variant="outline" onClick={() => loadMessages(activeConversation.contact.id, { showLoading: true })}>Retry</Button>
                  </div>
                ) : messages.length ? messages.map((message) => {
                  const own = message.senderId === user?.id;
                  return (
                    <div key={message.id} style={{ display: 'flex', justifyContent: own ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: 'min(75%, 620px)', padding: '0.8rem 1rem', borderRadius: '1rem', borderBottomRightRadius: own ? '0.2rem' : '1rem', borderBottomLeftRadius: own ? '1rem' : '0.2rem', backgroundColor: own ? 'var(--primary-rose)' : '#fff', color: own ? '#fff' : 'var(--text-primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{message.content}</p>
                        <time dateTime={message.createdAt} style={{ display: 'block', textAlign: 'right', marginTop: '0.4rem', fontSize: '0.7rem', opacity: 0.8 }}>
                          {new Date(message.createdAt).toLocaleString()}
                        </time>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <MessageSquare size={34} style={{ color: 'var(--primary-rose)', marginBottom: '0.5rem' }} />
                    <p style={{ margin: 0 }}>No messages yet. Send a message to start the conversation.</p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.75rem', padding: '1rem', backgroundColor: '#fff', borderTop: '1px solid var(--surface-soft)' }}>
                <Input
                  aria-label="Message"
                  placeholder="Type your message..."
                  value={draft}
                  maxLength={5000}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={sending}
                  style={{ flex: 1, backgroundColor: 'var(--surface-soft)', border: 'none' }}
                />
                <Button type="submit" disabled={sending || !draft.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Send size={17} />{sending ? 'Sending…' : 'Send'}
                </Button>
              </form>
              {messageError && messages.length > 0 && (
                <div role="alert" style={{ padding: '0.5rem 1rem', color: 'var(--primary-rose-dark)', backgroundColor: '#fff' }}>{messageError}</div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <div>
                <MessageSquare size={42} style={{ color: 'var(--primary-rose)', marginBottom: '0.75rem' }} />
                <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Select a conversation</h2>
                <p style={{ margin: 0 }}>Choose an organizer to view or send messages.</p>
              </div>
            </div>
          )}
        </section>
      </Card>

      <style>{`
        @media (max-width: 760px) {
          .vendor-messages-container { min-height: 0; }
          .vendor-conversations-panel { width: 100% !important; border-right: 0 !important; }
          .vendor-conversations-hidden-mobile, .vendor-chat-hidden-mobile { display: none !important; }
          .vendor-chat-panel { width: 100%; }
          .vendor-message-back { display: inline-flex !important; }
        }
      `}</style>
    </div>
  );
};
