const prisma = require('../utils/prisma');
const { getCommittedBookingTotals, summarizeBudget } = require('../utils/eventBudget');

const getEvents = async (req, res) => {
  try {
    const userId = req.user.id;

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId }
    });

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    const events = await prisma.event.findMany({
      where: { organizerId: organizer.id },
      orderBy: { date: 'asc' },
      include: {
        requirements: true,
        budget: { include: { items: true } },
        bookings: true,
        inquiries: true
      }
    });

    const bookingTotals = await getCommittedBookingTotals(prisma, events.map((event) => event.id));
    res.json(events.map((event) => ({
      ...event,
      budget: event.budget
        ? summarizeBudget(event.budget, bookingTotals.get(event.id) || 0)
        : null
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching events' });
  }
};

const getEventBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await prisma.budget.findUnique({
      where: { eventId: id },
      include: { items: true }
    });

    if (!budget) {
      return res.json(null);
    }

    res.json(budget);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching budget' });
  }
};

const createEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const { name, type, date, location, guestCount, budget, description } = req.body;
    const parsedBudget = budget === undefined || budget === null || budget === ''
      ? null
      : Number(budget);
    if (parsedBudget !== null && (!Number.isFinite(parsedBudget) || parsedBudget < 0)) {
      return res.status(400).json({ message: 'Budget must be a non-negative number' });
    }

    const fullDescription = `Event Type: ${type || 'Not specified'}\nExpected Guests: ${guestCount || 'Not specified'}\n\n${description || ''}`;

    const newEvent = await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          organizerId: organizer.id,
          title: name,
          description: fullDescription.trim(),
          date: date ? new Date(date) : null,
          location,
          status: 'DRAFT'
        }
      });

      if (parsedBudget !== null) {
        await tx.budget.create({
          data: {
            eventId: event.id,
            organizerId: organizer.id,
            totalBudget: parsedBudget
          }
        });
      }

      return event;
    });

    res.status(201).json(newEvent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to create event. Please try again.' });
  }
};

const getEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        requirements: true,
        budget: { include: { items: true } },
        shortlists: true,
        inquiries: {
          include: { vendor: true }
        },
        bookings: true
      }
    });

    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizerId !== organizer.id) return res.status(403).json({ message: 'Forbidden' });

    const bookingTotals = await getCommittedBookingTotals(prisma, [event.id]);
    res.json({
      ...event,
      budget: event.budget
        ? summarizeBudget(event.budget, bookingTotals.get(event.id) || 0)
        : null
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching event' });
  }
};

module.exports = { getEvents, getEventBudget, createEvent, getEvent };
