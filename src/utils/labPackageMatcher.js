// =============================================================================
// LAB PACKAGE & TEST MATCHER UTILITY
// Detects if an individual lab test is already covered by a package in the cart,
// prevents redundant bookings, and enriches lab item details.
// =============================================================================

import { getAllNovusPackages, NOVUS_POPULAR_PACKAGES } from '../data/novusPackagesData.js';
import { LAB_TESTS_MASTER } from '../data/labTestData.js';
import labTests from '../data/labTests.js';

// Core medical test signatures for cross-matching tests against package contents
const MEDICAL_PATTERNS = [
  {
    key: 'cbc',
    label: 'Complete Blood Count (CBC)',
    regex: /\b(cbc|complete blood count|hemogram|fbc|blood count)\b/i,
  },
  {
    key: 'fbs',
    label: 'Fasting Blood Sugar (FBS)',
    regex: /\b(fbs|fasting blood sugar|fasting glucose|fasting blood glucose)\b/i,
  },
  {
    key: 'ppbs',
    label: 'Post-Prandial Blood Sugar (PPBS)',
    regex: /\b(ppbs|post[- ]prandial)\b/i,
  },
  {
    key: 'hba1c',
    label: 'HbA1c (Glycated Hemoglobin)',
    regex: /\b(hba1c|glycated|glycosylated|a1c)\b/i,
  },
  {
    key: 'lipid',
    label: 'Lipid Profile',
    regex: /\b(lipid|cholesterol|triglycerides|hdl|ldl)\b/i,
  },
  {
    key: 'lft',
    label: 'Liver Function Test (LFT)',
    regex: /\b(lft|liver function|hepatic function|bilirubin|sgot|sgpt)\b/i,
  },
  {
    key: 'kft',
    label: 'Kidney Function Test (KFT)',
    regex: /\b(kft|rft|kidney function|renal function|urea|creatinine)\b/i,
  },
  {
    key: 'thyroid',
    label: 'Thyroid Profile / TSH',
    regex: /\b(thyroid|tft|tsh|t3\b|t4\b)\b/i,
  },
  {
    key: 'urine',
    label: 'Urine Routine & Microscopy',
    regex: /\b(urine routine|urinalysis|urine microscopy|urine examination|urine r\/m|urine analysis)\b/i,
  },
  {
    key: 'vit_d',
    label: 'Vitamin D (25-OH)',
    regex: /\b(vitamin d|vit d|25[- ]oh|25[- ]hydroxy|d3)\b/i,
  },
  {
    key: 'vit_b12',
    label: 'Vitamin B12',
    regex: /\b(vitamin b12|vit b12|cyanocobalamin|b12)\b/i,
  },
  {
    key: 'iron',
    label: 'Iron Profile',
    regex: /\b(iron profile|ferritin|tibc|serum iron)\b/i,
  },
  {
    key: 'calcium',
    label: 'Calcium',
    regex: /\b(calcium|serum calcium)\b/i,
  },
  {
    key: 'electrolytes',
    label: 'Electrolytes',
    regex: /\b(electrolyte|electrolytes|serum electrolytes)\b/i,
  },
  {
    key: 'crp',
    label: 'CRP / hs-CRP',
    regex: /\b(crp|c[- ]reactive protein|hs[- ]crp)\b/i,
  },
  {
    key: 'ecg',
    label: '12-Lead ECG',
    regex: /\b(ecg|ekg|electrocardiogram)\b/i,
  },
  {
    key: 'usg',
    label: 'Ultrasound (USG)',
    regex: /\b(ultrasound|usg|sonography)\b/i,
  },
  {
    key: 'echo',
    label: '2D Echo',
    regex: /\b(echo|2d echo|echocardiogram)\b/i,
  },
];

/**
 * Normalizes text for lenient fuzzy comparisons
 */
const normalizeText = (text) => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[()[\]{}_,./\\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Checks whether an item represents a health checkup package
 */
export const isPackageItem = (item) => {
  if (!item) return false;
  if (item.isPackage === true) return true;
  if (item.tier || item.type === 'popular') return true;
  if (item.testsCount && item.testsCount > 1) return true;
  if (Array.isArray(item.tests) && item.tests.length > 1) return true;
  if (Array.isArray(item.testsList) && item.testsList.length > 1) return true;
  const cat = String(item.category || item.categoryId || '').toLowerCase();
  if (cat.includes('package') || cat.includes('checkup') || cat.includes('executive') || cat.includes('full body')) {
    return true;
  }
  const allPkgs = getAllNovusPackages ? getAllNovusPackages() : NOVUS_POPULAR_PACKAGES;
  return allPkgs.some((p) => p.id === item.id || p.code === item.id);
};

/**
 * Retrieves the full list of tests included in a package item
 */
export const getPackageTests = (pkgItem) => {
  if (!pkgItem) return [];

  // 1. Direct array of tests on item
  if (Array.isArray(pkgItem.tests) && pkgItem.tests.length > 0) {
    return pkgItem.tests;
  }
  if (Array.isArray(pkgItem.testsList) && pkgItem.testsList.length > 0) {
    return pkgItem.testsList;
  }

  // 2. Lookup in master package database
  const allPkgs = getAllNovusPackages ? getAllNovusPackages() : NOVUS_POPULAR_PACKAGES;
  const matched = allPkgs.find(
    (p) => p.id === pkgItem.id || p.code === pkgItem.id || normalizeText(p.name) === normalizeText(pkgItem.name)
  );

  if (matched && Array.isArray(matched.tests) && matched.tests.length > 0) {
    return matched.tests;
  }

  // 3. Fallback: parametersList
  if (Array.isArray(pkgItem.parametersList)) {
    return pkgItem.parametersList.map((p) => (typeof p === 'string' ? { name: p, parameters: '' } : p));
  }

  return [];
};

/**
 * Checks if a specific package includes an individual test
 */
export const doesPackageIncludeTest = (pkgItem, test) => {
  if (!pkgItem || !test) return { included: false };

  // A package cannot be blocked by another package
  if (isPackageItem(test)) {
    return { included: false };
  }

  // Exact ID match
  if (pkgItem.id === test.id) {
    return { included: true, packageName: pkgItem.name, matchedTestName: pkgItem.name };
  }

  const pkgTests = getPackageTests(pkgItem);
  if (!pkgTests || pkgTests.length === 0) {
    return { included: false };
  }

  const testNameNorm = normalizeText(test.name);
  const testDescNorm = normalizeText(test.description || '');

  // Detect which medical patterns the target test triggers
  const matchedPatternsInTest = MEDICAL_PATTERNS.filter((pattern) => {
    return pattern.regex.test(test.name) || pattern.regex.test(test.description || '');
  });

  // Check each test inside the package
  for (const pt of pkgTests) {
    const ptName = typeof pt === 'string' ? pt : pt.name || '';
    const ptParams = typeof pt === 'string' ? '' : pt.parameters || '';
    const ptNameNorm = normalizeText(ptName);
    const ptParamsNorm = normalizeText(ptParams);
    const combinedPtNorm = `${ptNameNorm} ${ptParamsNorm}`;

    // 1. Direct medical pattern match (e.g. CBC, Lipid, LFT, KFT, TFT/Thyroid, HbA1c, FBS, Urine)
    for (const pattern of matchedPatternsInTest) {
      if (pattern.regex.test(ptName) || pattern.regex.test(ptParams)) {
        return {
          included: true,
          packageName: pkgItem.name,
          matchedTestName: ptName,
          matchedPattern: pattern.label,
        };
      }
    }

    // 2. Normalized text inclusion check
    if (testNameNorm && ptNameNorm) {
      if (
        (testNameNorm.length >= 6 && ptNameNorm.includes(testNameNorm)) ||
        (ptNameNorm.length >= 6 && testNameNorm.includes(ptNameNorm))
      ) {
        return {
          included: true,
          packageName: pkgItem.name,
          matchedTestName: ptName,
        };
      }
    }

    // 3. Check keywords / synonyms if test has them
    if (Array.isArray(test.keywords)) {
      for (const kw of test.keywords) {
        if (kw.length >= 4 && combinedPtNorm.includes(normalizeText(kw))) {
          return {
            included: true,
            packageName: pkgItem.name,
            matchedTestName: ptName,
          };
        }
      }
    }
    if (Array.isArray(test.synonyms)) {
      for (const syn of test.synonyms) {
        if (syn.length >= 4 && combinedPtNorm.includes(normalizeText(syn))) {
          return {
            included: true,
            packageName: pkgItem.name,
            matchedTestName: ptName,
          };
        }
      }
    }
  }

  return { included: false };
};

/**
 * Checks if the given test is already included in any package currently in labCart
 * @param {Object} test - The lab test the user wants to add
 * @param {Array} labCart - The current lab cart array
 * @returns {Object} { included: boolean, packageName?: string, packageId?: string, matchedTestName?: string }
 */
export const isTestIncludedInCartPackages = (test, labCart = []) => {
  if (!test || !Array.isArray(labCart) || labCart.length === 0) {
    return { included: false };
  }

  // If the item itself is a package, it should not be blocked
  if (isPackageItem(test)) {
    return { included: false };
  }

  for (const item of labCart) {
    if (isPackageItem(item)) {
      const match = doesPackageIncludeTest(item, test);
      if (match.included) {
        return {
          included: true,
          packageName: item.name,
          packageId: item.id,
          matchedTestName: match.matchedTestName,
          testName: test.name,
        };
      }
    }
  }

  return { included: false };
};

/**
 * Enriches a lab item (package or test) with complete clinical parameters,
 * fasting rules, sample collection details, and descriptions for full-details display.
 */
export const enrichLabItemDetails = (item) => {
  if (!item) return null;

  const allPkgs = getAllNovusPackages ? getAllNovusPackages() : NOVUS_POPULAR_PACKAGES;
  const matchedPkg = allPkgs.find(
    (p) => p.id === item.id || p.code === item.id || normalizeText(p.name) === normalizeText(item.name)
  );

  const matchedMasterTest = LAB_TESTS_MASTER?.find(
    (t) => t.id === item.id || normalizeText(t.name) === normalizeText(item.name)
  );

  const simpleTestsList = Array.isArray(labTests) ? labTests : [];
  const matchedSimpleTest = simpleTestsList.find(
    (t) => t.id === item.id || normalizeText(t.name) === normalizeText(item.name)
  );

  const isPkg = isPackageItem(item) || Boolean(matchedPkg);

  // Tests list for packages
  let tests = [];
  if (isPkg) {
    tests = item.tests || matchedPkg?.tests || [];
    if (tests.length === 0 && Array.isArray(item.testsList)) {
      tests = item.testsList;
    }
  }

  // Parameters list
  let parametersList = item.parametersList;
  if (!parametersList || parametersList.length === 0) {
    if (matchedPkg?.parametersList) {
      parametersList = matchedPkg.parametersList;
    } else if (matchedSimpleTest?.parametersList) {
      parametersList = matchedSimpleTest.parametersList;
    } else if (tests.length > 0) {
      parametersList = tests.map((t) => (t.parameters ? `${t.name} (${t.parameters})` : t.name));
    }
  }

  const price = Number(item.price || matchedPkg?.price || matchedMasterTest?.price || matchedSimpleTest?.price || 0);
  const mrp = Number(
    item.mrp || matchedPkg?.mrp || matchedMasterTest?.mrp || matchedSimpleTest?.mrp || Math.round(price * 1.3)
  );
  const discount =
    item.discount ||
    matchedPkg?.discount ||
    matchedMasterTest?.discount ||
    matchedSimpleTest?.discount ||
    (mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : null);

  const sampleType =
    item.sampleType ||
    matchedPkg?.sampleSummary ||
    matchedMasterTest?.sampleType ||
    matchedSimpleTest?.sampleType ||
    'Blood Sample';

  const preparation =
    item.preparation ||
    item.fastingDetails ||
    matchedPkg?.preparationSummary ||
    matchedMasterTest?.preparation ||
    matchedSimpleTest?.fastingDetails ||
    'No special dietary restrictions. Stay hydrated.';

  const fastingRequired =
    item.fastingRequired !== undefined
      ? item.fastingRequired
      : matchedPkg
      ? matchedPkg.preparationSummary?.toLowerCase().includes('fasting')
      : matchedMasterTest
      ? matchedMasterTest.fastingRequirement?.toLowerCase().includes('not') === false
      : matchedSimpleTest
      ? Boolean(matchedSimpleTest.fastingRequired)
      : preparation.toLowerCase().includes('fasting');

  const reportTime =
    item.reportTime ||
    item.tat ||
    item.reportTAT ||
    matchedPkg?.tatSummary ||
    matchedMasterTest?.reportTAT ||
    matchedSimpleTest?.reportTime ||
    'Within 24 Hours';

  const description =
    item.description ||
    item.clinicalNote ||
    matchedPkg?.clinicalNote ||
    matchedMasterTest?.description ||
    matchedSimpleTest?.description ||
    `${item.name} diagnostic evaluation delivered with verified NABL accredited clinical quality.`;

  return {
    ...item,
    id: item.id,
    name: item.name || matchedPkg?.name || matchedMasterTest?.name || matchedSimpleTest?.name,
    category: isPkg ? 'Diagnostic Health Package' : item.category || 'Pathology Test',
    isPackage: isPkg,
    testsCount: isPkg ? (tests.length || item.testsCount || matchedPkg?.testsCount || 1) : undefined,
    tests,
    parametersList: parametersList || [],
    price,
    mrp,
    discount,
    sampleType,
    preparation,
    fastingRequired,
    reportTime,
    description,
    centerName: item.centerName || item.labName || 'MediUnify Certified Diagnostic Lab',
    badge: item.badge || matchedPkg?.badge || (isPkg ? 'Popular Package' : 'Verified Test'),
  };
};
