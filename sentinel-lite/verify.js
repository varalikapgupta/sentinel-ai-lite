/**
 * Sentinel Lite - Policy Citation Verifier
 * 
 * Verifies Gemini LLM output against the ground-truth policy chunks:
 * 1. Every cited chunk_id must exist in the provided chunks.
 * 2. quoted_evidence must appear verbatim (normalized) in the cited chunk's text.
 * 3. Every check item must have a valid chunk_id citation and quoted evidence.
 */

const POLICY_CHUNKS = [
  {
    chunk_id: "P1.1",
    rule: "Restricted Country Prohibition",
    text: "Vendors based in a Restricted Country (Zorvania, Kelmarra) must not be onboarded."
  },
  {
    chunk_id: "P1.2",
    rule: "Allowed Country Clearance",
    text: "Vendors based in any other country may proceed to further checks."
  },
  {
    chunk_id: "P2.1",
    rule: "Physical Goods Insurance Requirement",
    text: "Vendors supplying physical goods must hold liability insurance of at least 500,000 USD."
  },
  {
    chunk_id: "P2.2",
    rule: "Software Liability Insurance Requirement",
    text: "Software-only vendors must hold liability insurance of at least 100,000 USD."
  },
  {
    chunk_id: "P3.1",
    rule: "Data Privacy Certification Requirement",
    text: "Vendors that handle personal data must hold a valid DATASAFE-2 certificate."
  },
  {
    chunk_id: "P3.2",
    rule: "Certification Expiry Limit",
    text: "A certificate must not be expired on the submission date."
  },
  {
    chunk_id: "P4.1",
    rule: "Code of Conduct Compliance",
    text: "Every vendor must have signed the Code of Conduct."
  },
  {
    chunk_id: "P4.2",
    rule: "Anti-Bribery Compliance",
    text: "Vendors with a bribery finding in the last 5 years must be rejected."
  }
];

function normalizeText(str) {
  if (!str || typeof str !== "string") return "";
  return str.toLowerCase().replace(/[\s\-_.,;:'"()]+/g, " ").trim();
}

/**
 * Verifies LLM compliance response against policy chunks.
 * @param {Object} aiResponse - Parsed AI JSON output containing checks, overall_verdict, summary
 * @param {Array} providedChunks - Array of allowed policy chunks [{chunk_id, text}]
 * @returns {Object} { verified: boolean, reasons: string[], check_count: number }
 */
function verifyComplianceResult(aiResponse, providedChunks = POLICY_CHUNKS) {
  const reasons = [];
  
  if (!aiResponse || typeof aiResponse !== "object") {
    return {
      verified: false,
      reasons: ["AI response is not a valid JSON object"],
      check_count: 0
    };
  }

  const checks = aiResponse.checks;
  if (!Array.isArray(checks) || checks.length === 0) {
    return {
      verified: false,
      reasons: ["No compliance checks found in AI response"],
      check_count: 0
    };
  }

  // Create lookup map of allowed chunks
  const chunkMap = new Map();
  for (const chunk of providedChunks) {
    chunkMap.set(chunk.chunk_id, chunk.text);
  }

  checks.forEach((check, index) => {
    const itemNum = index + 1;
    const chunkId = check.chunk_id;
    const quoted = check.quoted_evidence;

    // Check (c): No check lacks a citation or quote
    if (!chunkId || typeof chunkId !== "string" || chunkId.trim() === "") {
      reasons.push(`Check #${itemNum} ('${check.rule || "Unnamed"}') is missing a chunk_id citation.`);
      return;
    }

    if (!quoted || typeof quoted !== "string" || quoted.trim() === "") {
      reasons.push(`Check #${itemNum} (citing ${chunkId}) lacks quoted_evidence.`);
      return;
    }

    // Check (a): Every cited chunk_id exists in provided chunks
    if (!chunkMap.has(chunkId)) {
      reasons.push(`Check #${itemNum} cited NON-EXISTENT / FABRICATED chunk_id '${chunkId}'.`);
      return;
    }

    // Check (b): Quoted evidence appears in that chunk's text
    const officialText = chunkMap.get(chunkId);
    const normOfficial = normalizeText(officialText);
    const normQuoted = normalizeText(quoted);

    if (!normOfficial.includes(normQuoted)) {
      reasons.push(`Check #${itemNum} (citing ${chunkId}) quoted evidence "${quoted}" not found verbatim in policy text: "${officialText}".`);
    }
  });

  return {
    verified: reasons.length === 0,
    reasons: reasons,
    check_count: checks.length,
    overall_verdict: aiResponse.overall_verdict || "UNKNOWN"
  };
}

// ----------------------------------------------------
// TEST RUNNER FOR NODE.JS EXECUTION
// ----------------------------------------------------
function runTests() {
  console.log("=================================================");
  console.log("    SENTINEL LITE - CITATION VERIFICATION TESTS   ");
  console.log("=================================================\n");

  const mockCases = [
    {
      name: "Mock 1: Brightleaf Software (Compliant & Accurate)",
      response: {
        overall_verdict: "PASS",
        summary: "Vendor meets country, software insurance, DATASAFE-2 cert, and CoC requirements.",
        checks: [
          {
            rule: "Allowed Country Clearance",
            verdict: "PASS",
            chunk_id: "P1.2",
            quoted_evidence: "Vendors based in any other country may proceed to further checks."
          },
          {
            rule: "Software Liability Insurance Requirement",
            verdict: "PASS",
            chunk_id: "P2.2",
            quoted_evidence: "Software-only vendors must hold liability insurance of at least 100,000 USD."
          },
          {
            rule: "Data Privacy Certification Requirement",
            verdict: "PASS",
            chunk_id: "P3.1",
            quoted_evidence: "Vendors that handle personal data must hold a valid DATASAFE-2 certificate."
          },
          {
            rule: "Certification Expiry Limit",
            verdict: "PASS",
            chunk_id: "P3.2",
            quoted_evidence: "A certificate must not be expired on the submission date."
          },
          {
            rule: "Code of Conduct Compliance",
            verdict: "PASS",
            chunk_id: "P4.1",
            quoted_evidence: "Every vendor must have signed the Code of Conduct."
          }
        ]
      },
      expectedVerified: true
    },
    {
      name: "Mock 2: Orion Freight (Rejection with Accurate Citations)",
      response: {
        overall_verdict: "FAIL",
        summary: "Vendor is in restricted country Zorvania and has insufficient insurance for physical goods.",
        checks: [
          {
            rule: "Restricted Country Prohibition",
            verdict: "FAIL",
            chunk_id: "P1.1",
            quoted_evidence: "Vendors based in a Restricted Country (Zorvania, Kelmarra) must not be onboarded."
          },
          {
            rule: "Physical Goods Insurance Requirement",
            verdict: "FAIL",
            chunk_id: "P2.1",
            quoted_evidence: "Vendors supplying physical goods must hold liability insurance of at least 500,000 USD."
          },
          {
            rule: "Code of Conduct Compliance",
            verdict: "PASS",
            chunk_id: "P4.1",
            quoted_evidence: "Every vendor must have signed the Code of Conduct."
          }
        ]
      },
      expectedVerified: true
    },
    {
      name: "Mock 3: Nova Analytics (Adversarial Hallucination with Fabricated P9.9 Citation)",
      response: {
        overall_verdict: "PASS",
        summary: "Vendor exempt from DATASAFE-2 certificate under fast-track experience clause.",
        checks: [
          {
            rule: "Allowed Country Clearance",
            verdict: "PASS",
            chunk_id: "P1.2",
            quoted_evidence: "Vendors based in any other country may proceed to further checks."
          },
          {
            rule: "Software Liability Insurance Requirement",
            verdict: "PASS",
            chunk_id: "P2.2",
            quoted_evidence: "Software-only vendors must hold liability insurance of at least 100,000 USD."
          },
          {
            rule: "Fast-Track Experience Exemption",
            verdict: "PASS",
            chunk_id: "P9.9",
            quoted_evidence: "Vendors with 10+ years of experience are exempt from certification."
          },
          {
            rule: "Code of Conduct Compliance",
            verdict: "PASS",
            chunk_id: "P4.1",
            quoted_evidence: "Every vendor must have signed the Code of Conduct."
          }
        ]
      },
      expectedVerified: false
    }
  ];

  let allPassed = true;

  mockCases.forEach((tc, idx) => {
    console.log(`[TEST ${idx + 1}] ${tc.name}`);
    const result = verifyComplianceResult(tc.response, POLICY_CHUNKS);
    
    console.log(` -> Verification Status: ${result.verified ? "VERIFIED (TRUE)" : "BLOCKED / FAILED (FALSE)"}`);
    console.log(` -> Total Checks Evaluated: ${result.check_count}`);
    if (result.reasons.length > 0) {
      console.log(` -> Flagged Issues:`);
      result.reasons.forEach(r => console.log(`    * [BLOCKED] ${r}`));
    } else {
      console.log(` -> All citations and quotes verified against ground-truth chunks.`);
    }

    const testMatch = result.verified === tc.expectedVerified;
    if (testMatch) {
      console.log(` [PASS] Test result matches expected verified=${tc.expectedVerified}\n`);
    } else {
      console.log(` [FAIL] Test expected verified=${tc.expectedVerified} but got ${result.verified}\n`);
      allPassed = false;
    }
  });

  console.log("=================================================");
  console.log(allPassed ? " ALL VERIFICATION UNIT TESTS PASSED SUCCESSFULLY!" : " SOME TESTS FAILED!");
  console.log("=================================================");
}

if (typeof require !== "undefined" && require.main === module) {
  runTests();
}

module.exports = {
  POLICY_CHUNKS,
  verifyComplianceResult,
  normalizeText
};
