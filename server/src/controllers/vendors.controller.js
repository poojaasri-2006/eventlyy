const prisma = require('../utils/prisma');

const addVendorRatings = async (vendors) => {
  if (vendors.length === 0) return vendors;

  const ratings = await prisma.review.groupBy({
    by: ['vendorId'],
    where: { vendorId: { in: vendors.map(vendor => vendor.id) } },
    _avg: { rating: true },
    _count: { _all: true }
  });
  const ratingsByVendor = new Map(ratings.map(rating => [rating.vendorId, rating]));

  return vendors.map(vendor => {
    const rating = ratingsByVendor.get(vendor.id);
    return {
      ...vendor,
      averageRating: rating?._avg.rating ?? null,
      reviewCount: rating?._count._all ?? 0
    };
  });
};

const computeWebsiteAssessment = (vendor) => {
  if (!vendor.website || !vendor.website.trim()) {
    return { status: 'NO_WEBSITE', score: null, label: 'Not enough data' };
  }

  const v = vendor.verification;
  if (!v || v.status === 'NOT_STARTED' || v.status === 'IN_PROGRESS') {
    return { status: 'CHECKING', score: null, label: 'Checking...' };
  }

  if (v.status === 'FAILED') {
    return { status: 'INSUFFICIENT', score: null, label: 'Not enough data' };
  }

  const checks = Array.isArray(v.checks) ? v.checks : [];
  const webAccessCheck = checks.find(c => c.id === 'website_accessibility');
  if (webAccessCheck && (webAccessCheck.status === 'FAILED' || webAccessCheck.status === 'NOT_CHECKED')) {
    return { status: 'INSUFFICIENT', score: null, label: 'Not enough data' };
  }

  if (v.assessment === 'UNABLE_TO_VERIFY') {
    return { status: 'INSUFFICIENT', score: null, label: 'Not enough data' };
  }

  const rawScore = Number.isFinite(v.score) ? v.score : 0;
  const ratingOutOf5 = Math.round(((rawScore / 100) * 5) * 10) / 10;
  return {
    status: 'SCORED',
    score: ratingOutOf5,
    label: `${ratingOutOf5.toFixed(1)}/5`
  };
};

const getVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendorProfile.findMany({
      include: {
        category: true,
        services: true,
        packages: {
          include: {
            category: true,
            services: true
          }
        },
        verification: true
      }
    });

    const ratedVendors = await addVendorRatings(vendors);
    const vendorsWithAssessment = ratedVendors.map(vendor => ({
      ...vendor,
      websiteAssessment: computeWebsiteAssessment(vendor)
    }));

    res.json(vendorsWithAssessment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching vendors' });
  }
};

const getVendorCategories = async (req, res) => {
  try {
    const categories = await prisma.vendorCategory.findMany();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

const getVendorById = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: { 
        category: true,
        services: true,
        packages: {
          include: {
            category: true,
            services: true
          }
        },
        reviews: true,
        verification: true
      }
    });

    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    const [ratedVendor] = await addVendorRatings([vendor]);
    res.json({
      ...ratedVendor,
      websiteAssessment: computeWebsiteAssessment(vendor)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching vendor' });
  }
};

module.exports = { getVendors, getVendorCategories, getVendorById };
