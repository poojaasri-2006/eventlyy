const prisma = require('../utils/prisma');
const {
  getCommittedBookingTotals,
  getEventBudgetExpensesAndActivity,
  summarizeBudget
} = require('../utils/eventBudget');

const getBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId }
    });

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: organizer.id }
    });

    if (!event) {
      return res.status(403).json({ message: 'Not authorized or event not found' });
    }

    const budget = await prisma.budget.findUnique({
      where: { eventId },
      include: { items: true }
    });

    const [totals, { expenses, activityHistory }] = await Promise.all([
      getCommittedBookingTotals(prisma, [eventId]),
      getEventBudgetExpensesAndActivity(prisma, eventId, event.title)
    ]);

    if (!budget) {
      return res.json(summarizeBudget({ totalBudget: 0, items: [] }, 0, expenses, activityHistory));
    }

    res.json(summarizeBudget(budget, totals.get(eventId) || 0, expenses, activityHistory));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching budget' });
  }
};

const updateBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { totalBudget } = req.body;

    const parsedTotal = Number(totalBudget);
    if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
      return res.status(400).json({ message: 'Total budget must be a non-negative number' });
    }

    const organizer = await prisma.organizerProfile.findUnique({
      where: { userId }
    });

    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: organizer.id }
    });

    if (!event) return res.status(403).json({ message: 'Not authorized' });

    const budget = await prisma.budget.upsert({
      where: { eventId },
      update: { totalBudget: parsedTotal },
      create: {
        eventId,
        organizerId: organizer.id,
        totalBudget: parsedTotal
      },
      include: { items: true }
    });

    const [totals, { expenses, activityHistory }] = await Promise.all([
      getCommittedBookingTotals(prisma, [eventId]),
      getEventBudgetExpensesAndActivity(prisma, eventId, event.title)
    ]);
    res.json(summarizeBudget(budget, totals.get(eventId) || 0, expenses, activityHistory));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating budget' });
  }
};

const addBudgetItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { category, amount, description } = req.body;
    const parsedAmount = Number(amount);
    if (typeof category !== 'string' || !category.trim() ||
        !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({ message: 'Valid category and non-negative amount are required' });
    }

    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const event = await prisma.event.findFirst({
      where: { id: eventId, organizerId: organizer.id },
      select: { id: true }
    });
    if (!event) return res.status(403).json({ message: 'Not authorized or event not found' });

    let budget = await prisma.budget.findUnique({ where: { eventId } });
    
    // Auto-create budget if it doesn't exist
    if (!budget) {
      budget = await prisma.budget.create({
        data: {
          eventId,
          organizerId: organizer.id,
          totalBudget: 0
        }
      });
    }

    // verify ownership
    if (budget.organizerId !== organizer.id) {
       return res.status(403).json({ message: 'Not authorized' });
    }

    const newItem = await prisma.budgetItem.create({
      data: {
        budgetId: budget.id,
        category: category.trim(),
        amount: parsedAmount,
        description: description || null
      }
    });

    res.status(201).json(newItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding budget item' });
  }
};

const deleteBudgetItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, itemId } = req.params;

    const organizer = await prisma.organizerProfile.findUnique({ where: { userId } });
    if (!organizer) return res.status(404).json({ message: 'Organizer not found' });

    const budget = await prisma.budget.findUnique({ where: { eventId } });
    if (!budget || budget.organizerId !== organizer.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await prisma.budgetItem.deleteMany({
      where: {
        id: itemId,
        budgetId: budget.id
      }
    });

    res.json({ message: 'Item deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting budget item' });
  }
};

module.exports = { getBudget, updateBudget, addBudgetItem, deleteBudgetItem };
