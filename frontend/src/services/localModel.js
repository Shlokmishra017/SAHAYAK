// On-device wellness scoring (Z0). Raw text and continuous scores never leave the device.

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

  for (const phrase of MULTILINGUAL_LEXICON.acute_crisis) {
    if (normalized.includes(phrase)) {
      isAcute = true;
      matches.push("Acute Crisis Marker");
      score -= 3.0;
      break;
    }
  }

  for (const phrase of MULTILINGUAL_LEXICON.high_distress) {
    if (normalized.includes(phrase)) {
      matches.push("Emotional Distress");
      score -= 0.8;
    }
  }

  for (const phrase of MULTILINGUAL_LEXICON.somatic_fatigue) {
    if (normalized.includes(phrase)) {
      somaticCount++;
      matches.push("Somatic Fatigue");
      score -= 0.5;
    }
  }

  for (const phrase of MULTILINGUAL_LEXICON.positive_resilience) {
    if (normalized.includes(phrase)) {
      score += 0.6;
    }
  }

  // Scale by length so short and long entries score comparably.
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

export function computeLocalWellnessScore(checkInsHistory) {
  if (!checkInsHistory || checkInsHistory.length === 0) {
    return { wScore: 0.35, trajectorySlope: 0, reasonCodes: [] };
  }

  const sorted = [...checkInsHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

  let ewmaStress = 0.5;
  const alpha = 0.35;
  const reasonCodes = [];

  let sleepDeprivationStreak = 0;
  let lowMoodStreak = 0;

  sorted.forEach((item, idx) => {
    const moodStress = (5 - item.mood) / 4.0;
    const sleepStress = Math.max(0, Math.min(1, (7.5 - item.sleepHours) / 4.0));
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

export function performLocalFusion(wScore, hBand, thresholds = { tau1: 0.45, tau2: 0.65, tau3: 0.85 }, hasAcute = false) {
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
