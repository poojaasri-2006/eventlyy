const prisma = require('../utils/prisma');

const getShortlists = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const shortlists = await prisma.shortlist.findMany({
      where: { organizerId: organizer.id },
      include: { event: true }
    });

    const vendorIds = shortlists.map(s => s.vendorId);
    const eventIds = shortlists.map(s => s.eventId);
    
    const [vendors, inquiries] = await Promise.all([
      prisma.vendorProfile.findMany({
        where: { id: { in: vendorIds } },
        include: {
          category: true,
          services: true,
          packages: true,
          reviews: true,
          verification: true
        }
      }),
      prisma.vendorInquiry.findMany({
        where: {
          eventId: { in: eventIds },
          vendorId: { in: vendorIds }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const vendorMap = new Map();
    vendors.forEach(v => {
      const vScore = v.verification?.score;
      const ratingOutOf5 = Number.isFinite(vScore) ? Math.round(((vScore / 100) * 5) * 10) / 10 : null;
      let websiteAssessment = { status: 'NO_WEBSITE', score: null, label: 'Not enough data' };
      if (v.website && v.website.trim()) {
        if (!v.verification || v.verification.status === 'NOT_STARTED' || v.verification.status === 'IN_PROGRESS') {
          websiteAssessment = { status: 'CHECKING', score: null, label: 'Checking...' };
        } else if (v.verification.status === 'COMPLETED' && ratingOutOf5 !== null) {
          websiteAssessment = { status: 'SCORED', score: ratingOutOf5, label: `${ratingOutOf5.toFixed(1)}/5` };
        }
      }

      vendorMap.set(v.id, {
        ...v,
        websiteAssessment
      });
    });

    // Map each (eventId + vendorId) to its latest inquiry
    const inquiryMap = new Map();
    inquiries.forEach(inq => {
      const key = `${inq.eventId}_${inq.vendorId}`;
      if (!inquiryMap.has(key)) {
        inquiryMap.set(key, inq);
      }
    });

    const enrichedShortlists = shortlists.map(s => ({
      ...s,
      vendor: vendorMap.get(s.vendorId) || null,
      inquiry: inquiryMap.get(`${s.eventId}_${s.vendorId}`) || null
    }));

    res.json(enrichedShortlists);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching shortlists' });
  }
};

const addToShortlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, vendorId } = req.body;

    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const existing = await prisma.shortlist.findFirst({
      where: {
        organizerId: organizer.id,
        eventId,
        vendorId
      }
    });

    if (existing) {
      return res.status(409).json({ message: 'Vendor already shortlisted for this event' });
    }

    const shortlist = await prisma.shortlist.create({
      data: {
        organizerId: organizer.id,
        eventId,
        vendorId
      }
    });

    res.status(201).json(shortlist);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding to shortlist' });
  }
};

const removeShortlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const shortlist = await prisma.shortlist.findUnique({ where: { id } });
    
    if (!shortlist) return res.status(404).json({ message: 'Shortlist not found' });
    if (shortlist.organizerId !== organizer.id) return res.status(403).json({ message: 'Forbidden' });

    await prisma.shortlist.delete({ where: { id } });

    res.json({ message: 'Shortlist removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error removing shortlist' });
  }
};

module.exports = { getShortlists, addToShortlist, removeShortlist };
