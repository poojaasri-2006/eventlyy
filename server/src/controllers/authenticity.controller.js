const prisma = require('../utils/prisma');
const { performVendorAuthenticityCheck } = require('../utils/vendorVerificationEngine');
const { createNotification } = require('../utils/createNotification');

// Active in-memory jobs mutex to prevent concurrent duplicate verification runs
const runningVerificationJobs = new Map();

// Freshness threshold: 24 hours (results older than 24h are considered stale)
const FRESHNESS_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/**
 * Checks if a verification record is considered stale
 */
function isVerificationStale(verification) {
  if (!verification || !verification.lastCompletedAt) return true;
  const age = Date.now() - new Date(verification.lastCompletedAt).getTime();
  return age > FRESHNESS_THRESHOLD_MS || verification.isStale;
}

/**
 * Performs verification execution for a vendor and saves results in PostgreSQL.
 * Deduplicates concurrent requests using runningVerificationJobs map.
 */
async function runVerificationForVendor(vendorId, forced = false) {
  // If already running for this vendor, return the ongoing promise
  if (runningVerificationJobs.has(vendorId)) {
    return runningVerificationJobs.get(vendorId);
  }

  const jobPromise = (async () => {
    try {
      // Fetch full vendor profile with documents, services, packages, category, and user
      const vendor = await prisma.vendorProfile.findUnique({
        where: { id: vendorId },
        include: {
          user: true,
          category: true,
          services: true,
          packages: true,
          documents: true,
          verification: true
        }
      });

      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Mark status as IN_PROGRESS in DB
      await prisma.vendorVerification.upsert({
        where: { vendorId },
        create: {
          vendorId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          checks: []
        },
        update: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
        }
      });

      // Run analysis engine
      const analysis = await performVendorAuthenticityCheck(vendor, vendor.verification);

      // Save complete results to DB
      const updatedVerification = await prisma.vendorVerification.upsert({
        where: { vendorId },
        create: {
          vendorId,
          status: 'COMPLETED',
          assessment: analysis.assessment,
          score: analysis.score,
          summary: analysis.summary,
          reasons: analysis.reasons,
          missingEvidence: analysis.missingEvidence,
          suspiciousIndicators: analysis.suspiciousIndicators,
          checks: analysis.checks,
          extractedData: analysis.extractedData,
          isStale: false,
          lastCheckedAt: new Date(),
          lastCompletedAt: new Date(),
          errorMessage: null
        },
        update: {
          status: 'COMPLETED',
          assessment: analysis.assessment,
          score: analysis.score,
          summary: analysis.summary,
          reasons: analysis.reasons,
          missingEvidence: analysis.missingEvidence,
          suspiciousIndicators: analysis.suspiciousIndicators,
          checks: analysis.checks,
          extractedData: analysis.extractedData,
          isStale: false,
          lastCheckedAt: new Date(),
          lastCompletedAt: new Date(),
          errorMessage: null
        },
        include: {
          actions: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return updatedVerification;
    } catch (err) {
      console.error(`[Vendor Verification Error] Vendor ${vendorId}:`, err);
      // Update DB record with error
      try {
        await prisma.vendorVerification.upsert({
          where: { vendorId },
          create: {
            vendorId,
            status: 'FAILED',
            assessment: 'UNABLE_TO_VERIFY',
            summary: `Automated analysis failed: ${err.message}`,
            reasons: ['Error during automated authenticity analysis.'],
            checks: [],
            errorMessage: err.message,
            lastCheckedAt: new Date()
          },
          update: {
            status: 'FAILED',
            errorMessage: err.message,
            lastCheckedAt: new Date()
          }
        });
      } catch (dbErr) {
        console.error('[Vendor Verification DB Error]', dbErr);
      }
      throw err;
    } finally {
      runningVerificationJobs.delete(vendorId);
    }
  })();

  runningVerificationJobs.set(vendorId, jobPromise);
  return jobPromise;
}

/**
 * GET /api/vendors/:id/authenticity
 *
 * Automatically inspects the vendor:
 * 1. If verification is missing or stale, starts verification.
 * 2. If fresh, returns cached results immediately.
 * 3. If currently in progress, returns current status.
 */
const getVendorAuthenticity = async (req, res) => {
  try {
    const { id } = req.params;

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        verification: {
          include: {
            actions: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        documents: true
      }
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    let verification = vendor.verification;
    const stale = isVerificationStale(verification);

    // If never verified or stale, run automatically
    if (!verification || stale) {
      // If already in progress, return the current progress status
      if (runningVerificationJobs.has(id)) {
        return res.json({
          status: 'IN_PROGRESS',
          message: 'Authenticity checks are currently in progress...',
          verification: verification || {
            status: 'IN_PROGRESS',
            assessment: 'UNABLE_TO_VERIFY',
            checks: []
          },
          isFresh: false,
          isStale: true
        });
      }

      // Run verification
      verification = await runVerificationForVendor(id, true);
    }

    return res.json({
      status: verification.status,
      isFresh: !isVerificationStale(verification),
      isStale: isVerificationStale(verification),
      verification,
      documents: vendor.documents || []
    });
  } catch (error) {
    console.error('[getVendorAuthenticity Error]', error);
    res.status(500).json({ message: 'Error analyzing vendor authenticity' });
  }
};

/**
 * POST /api/vendors/:id/authenticity/refresh
 * Forces a refresh of the verification checks
 */
const refreshVendorAuthenticity = async (req, res) => {
  try {
    const { id } = req.params;
    const organizerId = req.user.id;

    const vendor = await prisma.vendorProfile.findUnique({ where: { id } });
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const verification = await runVerificationForVendor(id, true);

    // Record action audit log
    await prisma.vendorVerificationAction.create({
      data: {
        verificationId: verification.id,
        organizerId,
        actionType: 'REFRESH_TRIGGERED',
        notes: 'Organizer manually requested a verification refresh'
      }
    });

    return res.json({
      message: 'Authenticity checks refreshed successfully',
      verification
    });
  } catch (error) {
    console.error('[refreshVendorAuthenticity Error]', error);
    res.status(500).json({ message: 'Error refreshing vendor authenticity' });
  }
};

/**
 * POST /api/vendors/:id/authenticity/action
 *
 * Organizer manual workflow actions:
 * - REVIEWED: Mark as reviewed
 * - APPROVED: Approve verification
 * - INFO_REQUESTED: Request additional info from vendor
 * - REJECTED: Reject verification with reason
 */
const performOrganizerVerificationAction = async (req, res) => {
  try {
    const { id } = req.params;
    const organizerUserId = req.user.id;
    const { actionType, reason, notes } = req.body;

    const validActions = ['REVIEWED', 'APPROVED', 'INFO_REQUESTED', 'REJECTED'];
    if (!validActions.includes(actionType)) {
      return res.status(400).json({ message: `Invalid actionType. Must be one of: ${validActions.join(', ')}` });
    }

    if (actionType === 'REJECTED' && (!reason || !reason.trim())) {
      return res.status(400).json({ message: 'A documented reason is required when rejecting a vendor.' });
    }

    const vendor = await prisma.vendorProfile.findUnique({
      where: { id },
      include: {
        user: true,
        verification: true
      }
    });

    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    let verification = vendor.verification;
    if (!verification) {
      // Ensure verification record exists
      verification = await runVerificationForVendor(id, false);
    }

    // Map action to decision status
    const statusMap = {
      REVIEWED: 'REVIEWED',
      APPROVED: 'APPROVED',
      INFO_REQUESTED: 'INFO_REQUESTED',
      REJECTED: 'REJECTED'
    };

    const newDecisionStatus = statusMap[actionType];

    // Update verification record
    const updatedVerification = await prisma.vendorVerification.update({
      where: { id: verification.id },
      data: {
        decisionStatus: newDecisionStatus,
        decisionReason: reason || null,
        decisionAt: new Date(),
        decidedByOrganizerId: organizerUserId
      }
    });

    // Record action log entry
    await prisma.vendorVerificationAction.create({
      data: {
        verificationId: verification.id,
        organizerId: organizerUserId,
        actionType,
        reason: reason || null,
        notes: notes || null
      }
    });

    // Notify the vendor if appropriate
    if (vendor.user?.id) {
      let notifTitle = '';
      let notifContent = '';

      if (actionType === 'APPROVED') {
        notifTitle = 'Profile Verification Approved';
        notifContent = 'An event organizer reviewed and approved your business verification status on Evently.';
      } else if (actionType === 'INFO_REQUESTED') {
        notifTitle = 'Additional Verification Information Requested';
        notifContent = reason ? `An organizer requested more details: ${reason}` : 'An organizer requested additional documentation or verification details for your profile.';
      } else if (actionType === 'REJECTED') {
        notifTitle = 'Verification Review Notice';
        notifContent = `An organizer flagged your verification: ${reason}`;
      }

      if (notifTitle) {
        await createNotification({
          userId: vendor.user.id,
          type: 'GENERAL',
          title: notifTitle,
          content: notifContent
        });
      }
    }

    // Return updated verification with fresh action list
    const refreshed = await prisma.vendorVerification.findUnique({
      where: { id: verification.id },
      include: {
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    return res.json({
      message: `Action '${actionType}' completed successfully`,
      verification: refreshed
    });
  } catch (error) {
    console.error('[performOrganizerVerificationAction Error]', error);
    res.status(500).json({ message: 'Error updating verification status' });
  }
};

/**
 * GET /api/vendors/:id/documents
 * List vendor documents/certificates
 */
const getVendorDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const documents = await prisma.vendorDocument.findMany({
      where: { vendorId: id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(documents);
  } catch (error) {
    console.error('[getVendorDocuments Error]', error);
    res.status(500).json({ message: 'Error fetching vendor documents' });
  }
};

/**
 * POST /api/vendors/:id/documents
 * Vendor or Admin uploading document/certificate info
 */
const addVendorDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, title, registrationNumber, issuingAuthority, externalUrl, fileUrl, notes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Document title is required' });
    }

    const doc = await prisma.vendorDocument.create({
      data: {
        vendorId: id,
        type: type || 'BUSINESS_REGISTRATION',
        title: title.trim(),
        registrationNumber: registrationNumber || null,
        issuingAuthority: issuingAuthority || null,
        externalUrl: externalUrl || null,
        fileUrl: fileUrl || null,
        notes: notes || null,
        isVerified: false
      }
    });

    // Mark verification stale so next view re-runs with new evidence
    await prisma.vendorVerification.updateMany({
      where: { vendorId: id },
      data: { isStale: true }
    });

    res.status(201).json(doc);
  } catch (error) {
    console.error('[addVendorDocument Error]', error);
    res.status(500).json({ message: 'Error adding vendor document' });
  }
};

module.exports = {
  getVendorAuthenticity,
  refreshVendorAuthenticity,
  performOrganizerVerificationAction,
  getVendorDocuments,
  addVendorDocument,
  runVerificationForVendor
};
