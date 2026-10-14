const prisma = require('../utils/prisma');

const getServices = async (req, res) => {
  try {
    const userId = req.user.id;
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const services = await prisma.vendorService.findMany({
      where: { vendorId: vendor.id },
      include: { category: true },
      orderBy: { name: 'asc' }
    });

    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching services' });
  }
};

const createService = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, price, pricingType, categoryId } = req.body;

    if (!name) return res.status(400).json({ message: 'Service name is required' });

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const service = await prisma.vendorService.create({
      data: {
        vendorId: vendor.id,
        name,
        description: description || null,
        price: price !== undefined && price !== null && price !== '' ? parseFloat(price) : null,
        pricingType: pricingType || "FLAT_RATE",
        categoryId: categoryId || null
      },
      include: { category: true }
    });

    res.status(201).json(service);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating service' });
  }
};

const updateService = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, price, pricingType, categoryId } = req.body;

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const existingService = await prisma.vendorService.findFirst({
      where: { id, vendorId: vendor.id }
    });

    if (!existingService) {
      return res.status(404).json({ message: 'Service not found or unauthorized' });
    }

    const updatedService = await prisma.vendorService.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingService.name,
        description: description !== undefined ? description : existingService.description,
        price: price !== undefined ? (price === '' ? null : parseFloat(price)) : existingService.price,
        pricingType: pricingType !== undefined ? pricingType : existingService.pricingType,
        categoryId: categoryId !== undefined ? (categoryId === '' ? null : categoryId) : existingService.categoryId
      },
      include: { category: true }
    });

    res.json(updatedService);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating service' });
  }
};

const deleteService = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const existingService = await prisma.vendorService.findFirst({
      where: { id, vendorId: vendor.id }
    });

    if (!existingService) {
      return res.status(404).json({ message: 'Service not found or unauthorized' });
    }

    await prisma.vendorService.delete({ where: { id } });

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting service' });
  }
};

module.exports = {
  getServices,
  createService,
  updateService,
  deleteService
};
