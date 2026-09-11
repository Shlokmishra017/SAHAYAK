/**
 * Local On-Device Wellness ML & Fusion Simulation (Z0 Device Zone)
 * Executes 100% client-side in the browser / mobile WebView.
 * Proves that raw text, audio, and continuous wellness scores NEVER egress the device.
 */

// Multilingual Distress & Fatigue Lexicon
const MULTILINGUAL_LEXICON = {
  acute_crisis: [
    "suicide", "end my life", "cannot live", "no reason to live", "kill myself",
    "आत्महत्या", "जीने की इच्छा नहीं", "जान दे दूंगा", "मरना चाहता हूँ",
    "आत्महत्या", "जगावेसे वाटत नाही", "मरायचं आहे", "जीव द्यावासा वाटतो",
    "ਆਤਮ ਹੱਤਿਆ", "ਜਿਊਣ ਦਾ ਦਿਲ ਨਹੀਂ", "ਮਰਨਾ ਚਾਹੁੰਦਾ ਹਾਂ"
  ],
  high_distress: [
    "hopeless", "broken", "cannot take it anymore", "torture", "isolated", "crying", "despair",
    "हिम्मत टूट गई", "परेशान", "अकेलापन", "बर्दाश्त नहीं", "तनाव", "घुटन", "रो रहा हूँ",
    "त्रास", "एकटेपणा", "सहन होत नाही", "निराशा", "गुदमरल्यासारखे वाटते",
    "ਬਹੁਤ ਪਰੇਸ਼ਾਨ", "ਇਕੱਲਾਪਣ", "ਬਰਦਾਸ਼ਤ ਨਹੀਂ", "ਦਿਲ ਭਾਰੀ"
  ],
  somatic_fatigue: [
    "exhausted", "headache", "chest pain", "cannot sleep", "nightmare", "drained", "dizzy",
    "सिरदर्द", "नींद नहीं आ रही", "थकान", "कमजोरी", "छाती में भारीपन", "बेचैनी",
    "डोकेदुखी", "झोप येत नाही", "थकवा", "अस्वस्थ",
    "ਸਿਰ ਦਰਦ", "ਨੀਂਦ ਨਹੀਂ ਆਉਂਦੀ", "ਥਕਾਵਟ", "ਬੇਚੈਨੀ"
  ],
  positive_resilience: [
    "good", "better", "peaceful", "proud", "motivated", "refreshed", "happy", "strong",
    "अच्छा", "संतुष्ट", "शांति", "तरोताजा", "मजबूत", "खुश", "उत्साहित",
    "छान", "समाधानी", "शांत", "उत्साही", "आनंदी",
    "ਵਧੀਆ", "ਚੰਗਾ", "ਖੁਸ਼", "ਹੌਸਲਾ"
  ]
};

/**
 * Analyzes journal text client-side.
 * Returns sentiment score [-1.0, 1.0], distress markers, and acute safety alert boolean.
 */
export function analyzeJournalTextLocally(text) {
  if (!text || text.trim() === '') {
    return {
      sentiment: 0.0,
      distressMarkers: [],
      hasAcuteDistress: false,
      somaticCount: 0,
      wordCount: 0
    };
  }

  const normalized = text.toLowerCase();
  let score = 0;
  let matches = [];
  let isAcute = false;
  let somaticCount = 0;

  // Check acute crisis markers
  for (const phrase of MULTILINGUAL_LEXICON.acute_crisis) {
    if (normalized.includes(phrase)) {
      isAcute = true;
      matches.push("Acute Crisis Marker");
      score -= 3.0;
      break;
    }
  }

  // Check high distress
  for (const phrase of MULTILINGUAL_LEXICON.high_distress) {
    if (normalized.includes(phrase)) {
      matches.push("Emotional Distress");
      score -= 0.8;
    }
  }

  // Check somatic fatigue
  for (const phrase of MULTILINGUAL_LEXICON.somatic_fatigue) {
    if (normalized.includes(phrase)) {
      somaticCount++;
      matches.push("Somatic Fatigue");
      score -= 0.5;
    }
  }

  // Check positive markers
  for (const phrase of MULTILINGUAL_LEXICON.positive_resilience) {
    if (normalized.includes(phrase)) {
      score += 0.6;
    }
  }

  // Normalization
  const words = normalized.split(/\s+/).length;
  const normalizedSentiment = Math.max(-1.0, Math.min(1.0, score / Math.max(1, words * 0.15)));

  return {
    sentiment: Math.round(normalizedSentiment * 100) / 100,
    distressMarkers: Array.from(new Set(matches)),
    hasAcuteDistress: isAcute,
    somaticCount,
    wordCount: words
  };
}

/**
 * Computes Exponential Moving Average (EWMA) of recent wellness check-ins.
 * Combines Mood (1-5), Sleep Hours (0-12), and Journal Sentiment (-1 to 1).
 */
export function computeLocalWellnessScore(checkInsHistory) {
  if (!checkInsHistory || checkInsHistory.length === 0) {
    return { wScore: 0.35, trajectorySlope: 0, reasonCodes: [] };
  }

  // Sort chronological
  const sorted = [...checkInsHistory].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  let ewmaStress = 0.5;
  const alpha = 0.35; // Smoothing factor
  const reasonCodes = [];

  let sleepDeprivationStreak = 0;
  let lowMoodStreak = 0;

  sorted.forEach((item, idx) => {
    // Convert 1-5 mood to 0.0-1.0 stress (5 = 0.0 stress, 1 = 1.0 stress)
    const moodStress = (5 - item.mood) / 4.0;
    
    // Convert sleep hours to stress (ideal 7-8h -> 0 stress; <=4h -> 1.0 stress)
    const sleepStress = Math.max(0, Math.min(1, (7.5 - item.sleepHours) / 4.0));
    
    // Journal sentiment component
    const journalStress = item.journalSentiment ? (1.0 - item.journalSentiment) / 2.0 : 0.4;

    const dailyStress = 0.45 * moodStress + 0.35 * sleepStress + 0.20 * journalStress;
    
    if (idx === 0) {
      ewmaStress = dailyStress;
    } else {
      ewmaStress = alpha * dailyStress + (1 - alpha) * ewmaStress;
    }

    if (item.sleepHours <= 4.5) sleepDeprivationStreak++;
    else sleepDeprivationStreak = 0;

    if (item.mood <= 2) lowMoodStreak++;
    else lowMoodStreak = 0;
  });

  if (sleepDeprivationStreak >= 3) {
    reasonCodes.push("RC_SLEEP_DEGRADATION_TREND");
  }
  if (lowMoodStreak >= 3) {
    reasonCodes.push("RC_MOOD_TRAJECTORY_DROP");
  }

  return {
    wScore: Math.round(ewmaStress * 100) / 100,
    trajectorySlope: sorted.length > 1 ? (sorted[sorted.length - 1].mood - sorted[0].mood) : 0,
    reasonCodes: Array.from(new Set(reasonCodes))
  };
}

/**
 * Local Fusion formula:
 * Composite = 0.55 * w_score + 0.45 * band_to_score(h_band)
 * Maps to tier: Emerging, Elevated, Critical
 */
export function performLocalFusion(wScore, hBand, thresholds = { tau1: 0.45, tau2: 0.65, tau3: 0.85 }, hasAcute = false) {
  // Map h_band (0-4) to normalized score (0.0 to 1.0)
  const hScore = hBand / 4.0;
  const composite = 0.55 * wScore + 0.45 * hScore;

  let tier = "nominal";
  if (hasAcute || composite >= thresholds.tau3) {
    tier = "critical";
  } else if (composite >= thresholds.tau2) {
    tier = "elevated";
  } else if (composite >= thresholds.tau1) {
    tier = "emerging";
  }

  return {
    compositeScore: Math.round(composite * 100) / 100,
    tier,
    isEscalationRequired: tier === "elevated" || tier === "critical"
  };
}
