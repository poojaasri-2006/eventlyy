const { safeFetchUrl } = require('./ssrfProtection');

/**
 * Utility to extract title, meta descriptions, contact info, text,
 * and social/portfolio links from raw HTML using standard regex.
 */
function extractHtmlInformation(html) {
  if (!html || typeof html !== 'string') return {};

  // Title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Meta description
  const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                         html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

  // Strip script, style, and comments for text extraction
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Extract visible text
  const textContent = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  // Extract Emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const rawEmails = cleanHtml.match(emailRegex) || [];
  // Filter out image extensions or binary junk
  const emails = [...new Set(rawEmails.filter(e => !e.match(/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i)))];

  // Extract phone numbers (common patterns like +91..., (xxx)..., xxx-xxx-xxxx, 10-digit)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;
  const rawPhones = cleanHtml.match(phoneRegex) || [];
  const phones = [...new Set(
    rawPhones
      .map(p => p.trim())
      .filter(p => {
        const digits = p.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      })
  )];

  // Social / Portfolio domains
  const socialDomains = ['instagram.com', 'facebook.com', 'linkedin.com', 'twitter.com', 'x.com', 'behance.net', 'pinterest.com', 'youtube.com'];
  const socialLinks = [];
  const linkHrefRegex = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = linkHrefRegex.exec(cleanHtml)) !== null) {
    const href = match[1];
    if (socialDomains.some(domain => href.toLowerCase().includes(domain))) {
      if (!socialLinks.includes(href)) {
        socialLinks.push(href);
      }
    }
  }

  // Address signals
  const addressKeywords = ['road', 'street', 'lane', 'nagar', 'colony', 'avenue', 'floor', 'plot', 'sector', 'pincode', 'pin code', 'hyderabad', 'bangalore', 'mumbai', 'delhi', 'telangana', 'karnataka', 'india'];
  const lowerText = textContent.toLowerCase();
  const addressSignal = addressKeywords.some(kw => lowerText.includes(kw));

  return {
    title,
    metaDescription,
    textContent: textContent.slice(0, 10000), // First 10k characters
    emails,
    phones: phones.slice(0, 10),
    socialLinks: socialLinks.slice(0, 10),
    hasAddressSignal: addressSignal
  };
}

/**
 * Normalizes text for comparison (removes punctuation, excess spaces, lowercase)
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes phone numbers to digits only for robust comparison
 */
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  // Extract last 10 digits if longer
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Performs evidence-based vendor authenticity analysis.
 *
 * Assessments:
 * - LIKELY_GENUINE: Consistent evidence, required checks passed
 * - NEEDS_REVIEW: Incomplete evidence, conflicting info, or suspicious indicators
 * - POTENTIALLY_FAKE: Multiple significant warning signs detected
 * - UNABLE_TO_VERIFY: Website/evidence could not be checked sufficiently
 */
async function performVendorAuthenticityCheck(vendor, existingVerification = null) {
  const checks = [];
  const reasons = [];
  const missingEvidence = [];
  const suspiciousIndicators = [];
  let score = 0; // Out of 100

  const businessName = vendor.businessName || '';
  const website = (vendor.website || '').trim();
  const phone = vendor.phone || '';
  const categoryName = vendor.category?.name || '';
  const address = vendor.address || '';
  const city = vendor.city || '';
  const state = vendor.state || '';
  const services = vendor.services || [];
  const packages = vendor.packages || [];
  const documents = vendor.documents || [];

  // ==========================================
  // Check 1: Evently Profile Completeness
  // ==========================================
  const profileItems = [];
  if (businessName) profileItems.push('Business Name');
  if (categoryName) profileItems.push('Category');
  if (phone) profileItems.push('Phone');
  if (vendor.description) profileItems.push('Description');
  if (vendor.imageUrl) profileItems.push('Profile Photo');
  if (services.length > 0 || packages.length > 0) profileItems.push('Services/Packages');
  if (address || city || state) profileItems.push('Location');

  const profileComplete = profileItems.length >= 5;
  if (profileComplete) {
    score += 15;
    checks.push({
      id: 'profile_completeness',
      label: 'Evently Profile Completeness',
      status: 'PASSED',
      explanation: `Profile includes key business information: ${profileItems.join(', ')}.`
    });
  } else {
    score += 5;
    const missing = ['Location', 'Phone', 'Description', 'Profile Photo', 'Services']
      .filter(item => !profileItems.includes(item));
    missingEvidence.push(`Incomplete profile details: missing ${missing.join(', ')}.`);
    checks.push({
      id: 'profile_completeness',
      label: 'Evently Profile Completeness',
      status: 'WARNING',
      explanation: `Profile is partially filled. Missing: ${missing.join(', ')}.`
    });
  }

  // ==========================================
  // Check 2: Website & HTTPS Presence
  // ==========================================
  let websiteFetchResult = null;
  let extracted = null;

  if (!website) {
    checks.push({
      id: 'website_accessibility',
      label: 'Website & Digital Presence',
      status: 'NOT_CHECKED',
      explanation: 'No official website URL provided on Evently profile. Inconclusive (not proof of fraud).'
    });
    missingEvidence.push('No website URL provided.');
  } else {
    // Attempt safe fetch
    try {
      websiteFetchResult = await safeFetchUrl(website, { timeoutMs: 7000 });
      if (websiteFetchResult.success) {
        extracted = extractHtmlInformation(websiteFetchResult.body);

        // HTTPS check
        if (websiteFetchResult.isHttps) {
          score += 10;
          checks.push({
            id: 'website_security',
            label: 'Website HTTPS & Security',
            status: 'PASSED',
            explanation: 'Website is accessible over secure HTTPS protocol.'
          });
        } else {
          score += 5;
          checks.push({
            id: 'website_security',
            label: 'Website HTTPS & Security',
            status: 'WARNING',
            explanation: 'Website is running over unencrypted HTTP protocol.'
          });
          suspiciousIndicators.push('Website lacks HTTPS encryption.');
        }

        score += 15;
        checks.push({
          id: 'website_accessibility',
          label: 'Website Accessibility',
          status: 'PASSED',
          explanation: `Successfully reached website (${websiteFetchResult.statusCode} OK). Content retrieved for analysis.`
        });
      } else {
        // Website inaccessible
        checks.push({
          id: 'website_accessibility',
          label: 'Website Accessibility',
          status: 'WARNING',
          explanation: `Website could not be reached: ${websiteFetchResult.error || 'Server error'}. This is inconclusive and not proof of fraud.`
        });
        missingEvidence.push(`Website is currently unreachable (${websiteFetchResult.error || 'Connection error'}).`);
      }
    } catch (fetchErr) {
      checks.push({
        id: 'website_accessibility',
        label: 'Website Accessibility',
        status: 'WARNING',
        explanation: `Unable to access website (${fetchErr.message}). Inconclusive.`
      });
      missingEvidence.push('Website could not be reached for automated verification.');
    }
  }

  // ==========================================
  // Check 3: Business Name Match
  // ==========================================
  if (extracted && businessName) {
    const normProfileName = normalizeText(businessName);
    const normTitle = normalizeText(extracted.title || '');
    const normMeta = normalizeText(extracted.metaDescription || '');
    const normBody = normalizeText(extracted.textContent || '');

    // Check if profile words appear in website
    const nameWords = normProfileName.split(' ').filter(w => w.length > 2);
    const matchCount = nameWords.filter(w => normTitle.includes(w) || normMeta.includes(w) || normBody.includes(w)).length;
    const matchRatio = nameWords.length > 0 ? matchCount / nameWords.length : 0;

    if (matchRatio >= 0.7 || normTitle.includes(normProfileName)) {
      score += 20;
      reasons.push('Business name aligns between Evently profile and official website.');
      checks.push({
        id: 'business_name_match',
        label: 'Business Name Consistency',
        status: 'PASSED',
        explanation: `Strong match: "${businessName}" found in website title/meta content ("${extracted.title}").`
      });
    } else if (matchRatio >= 0.3) {
      score += 10;
      checks.push({
        id: 'business_name_match',
        label: 'Business Name Consistency',
        status: 'WARNING',
        explanation: `Partial match: Some keywords of "${businessName}" were found, but title reflects "${extracted.title || 'Different Name'}".`
      });
      suspiciousIndicators.push(`Possible business name discrepancy between profile ("${businessName}") and website title ("${extracted.title || 'N/A'}").`);
    } else {
      checks.push({
        id: 'business_name_match',
        label: 'Business Name Consistency',
        status: 'FAILED',
        explanation: `Significant mismatch: "${businessName}" was not identified on website title ("${extracted.title}") or main text.`
      });
      suspiciousIndicators.push(`Significant business identity mismatch: website appears to belong to "${extracted.title || 'another entity'}".`);
    }
  } else {
    checks.push({
      id: 'business_name_match',
      label: 'Business Name Consistency',
      status: 'NOT_CHECKED',
      explanation: 'Could not compare business name because website content is unavailable.'
    });
  }

  // ==========================================
  // Check 4: Contact Information Match
  // ==========================================
  if (extracted && phone) {
    const normPhone = normalizePhone(phone);
    const matchedPhone = extracted.phones.find(p => normalizePhone(p) === normPhone);
    const matchedEmail = extracted.emails.find(e => vendor.user?.email && e.toLowerCase() === vendor.user.email.toLowerCase());

    if (matchedPhone || matchedEmail) {
      score += 15;
      reasons.push('Verified contact information found directly on vendor website.');
      checks.push({
        id: 'contact_info_match',
        label: 'Contact Details Match',
        status: 'PASSED',
        explanation: `Direct contact match found on website: ${matchedPhone ? `Phone ${matchedPhone}` : ''} ${matchedEmail ? `Email ${matchedEmail}` : ''}.`
      });
    } else if (extracted.phones.length > 0 || extracted.emails.length > 0) {
      score += 5;
      checks.push({
        id: 'contact_info_match',
        label: 'Contact Details Match',
        status: 'WARNING',
        explanation: `Website lists contact numbers (${extracted.phones.slice(0, 2).join(', ')}), but profile phone (${phone}) did not match directly.`
      });
      suspiciousIndicators.push(`Contact number listed on profile (${phone}) differs from website (${extracted.phones.slice(0, 2).join(', ')}).`);
    } else {
      checks.push({
        id: 'contact_info_match',
        label: 'Contact Details Match',
        status: 'WARNING',
        explanation: 'No explicit phone numbers or emails could be parsed from the website homepage.'
      });
    }
  } else {
    checks.push({
      id: 'contact_info_match',
      label: 'Contact Details Match',
      status: 'NOT_CHECKED',
      explanation: 'Contact match check skipped due to missing profile phone or inaccessible website.'
    });
  }

  // ==========================================
  // Check 5: Address & Geographic Consistency
  // ==========================================
  const locationStrings = [address, city, state].filter(Boolean);
  if (extracted && locationStrings.length > 0) {
    const normLocation = normalizeText(locationStrings.join(' '));
    const locationKeywords = normLocation.split(' ').filter(w => w.length > 3);
    const bodyText = normalizeText(extracted.textContent || '');

    const foundKeywords = locationKeywords.filter(kw => bodyText.includes(kw));
    if (foundKeywords.length > 0) {
      score += 10;
      checks.push({
        id: 'address_match',
        label: 'Geographic & Address Consistency',
        status: 'PASSED',
        explanation: `Location keywords (${foundKeywords.join(', ')}) matched on the vendor's website.`
      });
    } else if (extracted.hasAddressSignal) {
      checks.push({
        id: 'address_match',
        label: 'Geographic & Address Consistency',
        status: 'WARNING',
        explanation: `Website contains address markers, but profile location (${locationStrings.join(', ')}) was not explicitly verified.`
      });
    } else {
      checks.push({
        id: 'address_match',
        label: 'Geographic & Address Consistency',
        status: 'WARNING',
        explanation: `No physical address or location mentions matching "${locationStrings.join(', ')}" found on website.`
      });
    }
  } else if (!locationStrings.length) {
    missingEvidence.push('No physical business address provided on Evently profile.');
    checks.push({
      id: 'address_match',
      label: 'Geographic & Address Consistency',
      status: 'NOT_CHECKED',
      explanation: 'Vendor profile does not provide a physical address to verify.'
    });
  } else {
    checks.push({
      id: 'address_match',
      label: 'Geographic & Address Consistency',
      status: 'NOT_CHECKED',
      explanation: 'Address consistency could not be tested because website is inaccessible.'
    });
  }

  // ==========================================
  // Check 6: Business Registration & Documents
  // ==========================================
  const regDocs = documents.filter(d => d.type === 'BUSINESS_REGISTRATION');
  const certificates = documents.filter(d => d.type === 'CERTIFICATE');
  const verifiedDocs = documents.filter(d => d.isVerified);

  if (verifiedDocs.length > 0) {
    score += 20;
    reasons.push(`${verifiedDocs.length} official document(s) verified on file.`);
    checks.push({
      id: 'business_registration',
      label: 'Registration & Documentation',
      status: 'PASSED',
      explanation: `Verified documentation on file: ${verifiedDocs.map(d => d.title).join(', ')}.`
    });
  } else if (documents.length > 0) {
    score += 10;
    checks.push({
      id: 'business_registration',
      label: 'Registration & Documentation',
      status: 'WARNING',
      explanation: `${documents.length} document(s) submitted (${documents.map(d => d.title).join(', ')}), pending manual verification.`
    });
  } else {
    missingEvidence.push('No business registration certificate or license submitted.');
    checks.push({
      id: 'business_registration',
      label: 'Registration & Documentation',
      status: 'NOT_CHECKED',
      explanation: 'No registration documents or trade licenses have been submitted.'
    });
  }

  // ==========================================
  // Check 7: Portfolio & Social Consistency
  // ==========================================
  if (extracted && extracted.socialLinks.length > 0) {
    score += 10;
    checks.push({
      id: 'portfolio_consistency',
      label: 'Portfolio & Social Profiles',
      status: 'PASSED',
      explanation: `Active online presence found with ${extracted.socialLinks.length} social profile link(s) on website (${extracted.socialLinks.slice(0, 3).map(l => new URL(l).hostname).join(', ')}).`
    });
  } else if (services.length > 0 || packages.length > 0) {
    score += 5;
    checks.push({
      id: 'portfolio_consistency',
      label: 'Portfolio & Service Catalog',
      status: 'PASSED',
      explanation: `Vendor offers a catalog of ${services.length} service(s) and ${packages.length} package(s) on Evently.`
    });
  } else {
    missingEvidence.push('No portfolio or external social channels linked.');
    checks.push({
      id: 'portfolio_consistency',
      label: 'Portfolio & Social Profiles',
      status: 'WARNING',
      explanation: 'No service catalog, portfolio links, or social channels were detected.'
    });
  }

  // ==========================================
  // Assessment Decision Logic
  // Transparent, evidence-based rules:
  // - Never claim definitely fake or genuine without evidence.
  // - Inaccessible website != fake.
  // ==========================================
  let assessment = 'UNABLE_TO_VERIFY';
  let summary = '';

  const hasSevereMismatch = checks.some(c => c.id === 'business_name_match' && c.status === 'FAILED');
  const failedChecksCount = checks.filter(c => c.status === 'FAILED').length;
  const passedChecksCount = checks.filter(c => c.status === 'PASSED').length;
  const warningChecksCount = checks.filter(c => c.status === 'WARNING').length;

  if (hasSevereMismatch && suspiciousIndicators.length >= 2) {
    // Multiple significant evidence-based warning signs
    assessment = 'POTENTIALLY_FAKE';
    summary = 'Multiple significant warning signs detected, including a business identity mismatch with the provided website.';
    reasons.unshift('Website identity significantly diverges from Evently profile.');
  } else if (!website && documents.length === 0 && profileItems.length < 4) {
    // Very little info available to test
    assessment = 'UNABLE_TO_VERIFY';
    summary = 'Insufficient public evidence or documentation available to verify this vendor.';
    reasons.push('No website or business documents available for automated verification.');
  } else if (passedChecksCount >= 4 && !hasSevereMismatch && suspiciousIndicators.length === 0) {
    // Evidence consistent, key checks passed
    assessment = 'LIKELY_GENUINE';
    summary = 'Available evidence is consistent and core verification checks have passed successfully.';
    if (reasons.length === 0) {
      reasons.push('Verified website and profile details are consistent.');
    }
  } else {
    // Incomplete, conflicting, or partial
    assessment = 'NEEDS_REVIEW';
    summary = 'Evidence is incomplete, inconclusive, or contains items requiring organizer review.';
    if (suspiciousIndicators.length > 0) {
      reasons.push(`Contains review items: ${suspiciousIndicators.slice(0, 2).join('; ')}`);
    } else if (missingEvidence.length > 0) {
      reasons.push(`Evidence missing: ${missingEvidence.slice(0, 2).join('; ')}`);
    } else {
      reasons.push('Partial evidence matches; organizer review recommended.');
    }
  }

  return {
    assessment,
    score: Math.min(100, Math.max(0, score)),
    summary,
    reasons,
    missingEvidence,
    suspiciousIndicators,
    checks,
    extractedData: extracted ? {
      title: extracted.title,
      metaDescription: extracted.metaDescription,
      emailsFound: extracted.emails,
      phonesFound: extracted.phones,
      socialLinks: extracted.socialLinks
    } : null,
    isStale: false
  };
}

module.exports = {
  extractHtmlInformation,
  normalizeText,
  normalizePhone,
  performVendorAuthenticityCheck
};
