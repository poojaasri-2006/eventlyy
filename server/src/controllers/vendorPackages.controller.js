const prisma = require('../utils/prisma');

const getPackages = async (req, res) => {
  try {
    const userId = req.user.id;
    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const packages = await prisma.vendorPackage.findMany({
      where: { vendorId: vendor.id },
      include: {
        category: true,
        services: true
      },
      orderBy: { price: 'asc' }
    });

    res.json(packages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching packages' });
  }
};

const createPackage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description, price, categoryId, serviceIds } = req.body;

    if (!name || price === undefined || price === null || price === '') {
      return res.status(400).json({ message: 'Package name and price are required' });
    }

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    // Validate category if provided
    if (categoryId) {
      const catExists = await prisma.vendorCategory.findUnique({ where: { id: categoryId } });
      if (!catExists) {
        return res.status(400).json({ message: 'Selected category does not exist' });
      }
    }

    // Validate that all selected services belong to this authenticated vendor
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      const vendorServices = await prisma.vendorService.findMany({
        where: {
          id: { in: serviceIds },
          vendorId: vendor.id
        }
      });

      if (vendorServices.length !== serviceIds.length) {
        return res.status(403).json({
          message: 'One or more selected services do not belong to you or do not exist'
        });
      }
    }

    const pkg = await prisma.vendorPackage.create({
      data: {
        vendorId: vendor.id,
        name: name.trim(),
        description: description ? description.trim() : null,
        price: parseFloat(price),
        categoryId: categoryId || null,
        services: Array.isArray(serviceIds) && serviceIds.length > 0
          ? { connect: serviceIds.map(id => ({ id })) }
          : undefined
      },
      include: {
        category: true,
        services: true
      }
    });

    res.status(201).json(pkg);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating package' });
  }
};

const updatePackage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, description, price, categoryId, serviceIds } = req.body;

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const existingPackage = await prisma.vendorPackage.findFirst({
      where: { id, vendorId: vendor.id },
      include: { services: true }
    });

    if (!existingPackage) {
      return res.status(404).json({ message: 'Package not found or unauthorized' });
    }

    // Validate category if provided
    if (categoryId) {
      const catExists = await prisma.vendorCategory.findUnique({ where: { id: categoryId } });
      if (!catExists) {
        return res.status(400).json({ message: 'Selected category does not exist' });
      }
    }

    // Validate services ownership if provided
    if (Array.isArray(serviceIds) && serviceIds.length > 0) {
      const vendorServices = await prisma.vendorService.findMany({
        where: {
          id: { in: serviceIds },
          vendorId: vendor.id
        }
      });

      if (vendorServices.length !== serviceIds.length) {
        return res.status(403).json({
          message: 'One or more selected services do not belong to you or do not exist'
        });
      }
    }

    const dataToUpdate = {
      name: name !== undefined ? name.trim() : existingPackage.name,
      description: description !== undefined ? (description ? description.trim() : null) : existingPackage.description,
      price: price !== undefined && price !== '' ? parseFloat(price) : existingPackage.price,
      categoryId: categoryId !== undefined ? (categoryId || null) : existingPackage.categoryId
    };

    if (Array.isArray(serviceIds)) {
      dataToUpdate.services = {
        set: serviceIds.map(sId => ({ id: sId }))
      };
    }

    const updatedPackage = await prisma.vendorPackage.update({
      where: { id },
      data: dataToUpdate,
      include: {
        category: true,
        services: true
      }
    });

    res.json(updatedPackage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error updating package' });
  }
};

const deletePackage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const vendor = await prisma.vendorProfile.findUnique({ where: { userId } });
    if (!vendor) return res.status(404).json({ message: 'Vendor profile not found' });

    const existingPackage = await prisma.vendorPackage.findFirst({
      where: { id, vendorId: vendor.id }
    });

    if (!existingPackage) {
      return res.status(404).json({ message: 'Package not found or unauthorized' });
    }

    await prisma.vendorPackage.delete({ where: { id } });

    res.json({ message: 'Package deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error deleting package' });
  }
};

module.exports = {
  getPackages,
  createPackage,
  updatePackage,
  deletePackage
};
