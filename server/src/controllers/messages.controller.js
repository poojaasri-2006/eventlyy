const prisma = require('../utils/prisma');

const contactSelect = {
  id: true,
  email: true,
  role: true,
  vendorProfile: {
    select: {
      id: true,
      businessName: true,
      imageUrl: true
    }
  },
  organizerProfile: {
    select: {
      id: true,
      firstName: true,
      lastName: true
    }
  }
};

const addPeer = (peers, user, event) => {
  if (!user) return;
  const peer = peers.get(user.id) || { contact: user, events: [] };
  if (event && !peer.events.some((item) => item.id === event.id)) {
    peer.events.push(event);
  }
  peers.set(user.id, peer);
};

const getConversationPeers = async (user) => {
  const peers = new Map();

  if (user.role === 'ORGANIZER') {
    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId: user.id }
    });
    if (!organizer) return null;

    const inquiries = await prisma.vendorInquiry.findMany({
      where: { event: { organizerId: organizer.id } },
      include: {
        vendor: { include: { user: { select: contactSelect } } },
        event: { select: { id: true, title: true, date: true } }
      }
    });
    inquiries.forEach((inquiry) => {
      addPeer(peers, inquiry.vendor.user, inquiry.event);
    });

    const shortlists = await prisma.shortlist.findMany({
      where: { organizerId: organizer.id },
      include: { event: { select: { id: true, title: true, date: true } } }
    });
    if (shortlists.length) {
      const vendorProfiles = await prisma.vendorProfile.findMany({
        where: { id: { in: [...new Set(shortlists.map((item) => item.vendorId))] } },
        include: { user: { select: contactSelect } }
      });
      const vendorMap = new Map(vendorProfiles.map((vendor) => [vendor.id, vendor]));
      shortlists.forEach((shortlist) => {
        addPeer(peers, vendorMap.get(shortlist.vendorId)?.user, shortlist.event);
      });
    }

    return peers;
  }

  if (user.role === 'VENDOR') {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { userId: user.id }
    });
    if (!vendor) return null;

    const inquiries = await prisma.vendorInquiry.findMany({
      where: { vendorId: vendor.id },
      include: {
        event: {
          include: {
            organizer: { include: { user: { select: contactSelect } }
            }
          }
        }
      }
    });
    inquiries.forEach((inquiry) => {
      addPeer(peers, inquiry.event.organizer.user, {
        id: inquiry.event.id,
        title: inquiry.event.title,
        date: inquiry.event.date
      });
    });

    const shortlists = await prisma.shortlist.findMany({
      where: { vendorId: vendor.id },
      include: {
        event: {
          include: {
            organizer: { include: { user: { select: contactSelect } }
            }
          }
        }
      }
    });
    shortlists.forEach((shortlist) => {
      addPeer(peers, shortlist.event.organizer.user, {
        id: shortlist.event.id,
        title: shortlist.event.title,
        date: shortlist.event.date
      });
    });

    const quotes = await prisma.quote.findMany({
      where: { vendorId: vendor.id },
      select: { id: true, inquiryId: true }
    });
    const quoteIds = quotes.map((quote) => quote.id);
    const inquiryIds = [...new Set(quotes.map((quote) => quote.inquiryId))];
    if (quoteIds.length && inquiryIds.length) {
      const inquiries = await prisma.vendorInquiry.findMany({
        where: { id: { in: inquiryIds }, vendorId: vendor.id },
        include: {
          event: {
            include: {
              organizer: { include: { user: { select: contactSelect } } }
            }
          }
        }
      });
      const inquiryMap = new Map(inquiries.map((inquiry) => [inquiry.id, inquiry]));
      const quoteMap = new Map(quotes.map((quote) => [quote.id, quote]));
      const bookings = await prisma.booking.findMany({
        where: { quoteId: { in: quoteIds } },
        select: { eventId: true, quoteId: true }
      });
      bookings.forEach((booking) => {
        const inquiry = inquiryMap.get(quoteMap.get(booking.quoteId)?.inquiryId);
        if (!inquiry || inquiry.eventId !== booking.eventId) return;
        addPeer(peers, inquiry.event.organizer.user, inquiry.event);
      });
    }

    return peers;
  }

  return null;
};

const getConversations = async (req, res) => {
  try {
    const peers = await getConversationPeers(req.user);
    if (!peers) {
      return res.status(404).json({ message: 'Profile not found for this account' });
    }

    const peerIds = [...peers.keys()];
    const messages = peerIds.length
      ? await prisma.message.findMany({
          where: {
            OR: [
              { senderId: req.user.id, receiverId: { in: peerIds } },
              { receiverId: req.user.id, senderId: { in: peerIds } }
            ]
          },
          orderBy: { createdAt: 'desc' }
        })
      : [];

    const latestMessage = new Map();
    messages.forEach((message) => {
      const contactId = message.senderId === req.user.id
        ? message.receiverId
        : message.senderId;
      if (!latestMessage.has(contactId)) latestMessage.set(contactId, message);
    });

    const conversations = [...peers.entries()].map(([contactId, peer]) => ({
      contact: peer.contact,
      events: peer.events,
      lastMessage: latestMessage.get(contactId) || null
    }));
    conversations.sort((left, right) => {
      const leftTime = left.lastMessage ? new Date(left.lastMessage.createdAt).getTime() : 0;
      const rightTime = right.lastMessage ? new Date(right.lastMessage.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    return res.json(conversations);
  } catch (error) {
    console.error('[Get Conversations Error]', error);
    return res.status(500).json({ message: 'Error fetching conversations' });
  }
};

const authorizeConversation = async (userId, role, contactId) => {
  if (typeof contactId !== 'string' || !contactId || contactId === userId) {
    return { error: 'Invalid conversation participant', statusCode: 400 };
  }
  if (!['ORGANIZER', 'VENDOR'].includes(role)) {
    return { error: 'Unauthorized role', statusCode: 403 };
  }

  const peers = await getConversationPeers({ id: userId, role });
  if (!peers) return { error: 'Profile not found for this account', statusCode: 404 };
  const peer = peers.get(contactId);
  if (!peer) return { error: 'Conversation not found or unauthorized', statusCode: 404 };
  return { peer };
};

const getMessagesWithUser = async (req, res) => {
  try {
    const authorization = await authorizeConversation(
      req.user.id,
      req.user.role,
      req.params.contactId
    );
    if (authorization.error) {
      return res.status(authorization.statusCode).json({ message: authorization.error });
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user.id, receiverId: req.params.contactId },
          { senderId: req.params.contactId, receiverId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(messages);
  } catch (error) {
    console.error('[Get Messages Error]', error);
    return res.status(500).json({ message: 'Error fetching messages' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }
    if (content.trim().length > 5000) {
      return res.status(400).json({ message: 'Message cannot exceed 5000 characters' });
    }

    const authorization = await authorizeConversation(
      req.user.id,
      req.user.role,
      req.params.contactId
    );
    if (authorization.error) {
      return res.status(authorization.statusCode).json({ message: authorization.error });
    }

    const message = await prisma.message.create({
      data: {
        senderId: req.user.id,
        receiverId: req.params.contactId,
        content: content.trim()
      }
    });
    return res.status(201).json(message);
  } catch (error) {
    console.error('[Send Message Error]', error);
    return res.status(500).json({ message: 'Error sending message' });
  }
};

module.exports = { getConversations, getMessagesWithUser, sendMessage };
