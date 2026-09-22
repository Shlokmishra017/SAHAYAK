/**
 * Vernacular-ready text architecture for the personnel experience (7.3).
 * All user-facing personnel strings live here in `en` + `hi` dictionaries
 * so additional languages plug in without touching components.
 */
export const PERSONNEL_STRINGS = {
  en: {
    eyebrow: 'Private On-Device Wellness',
    title: 'Confidential wellness',
    description:
      'Your journal entries and self-reported wellness indicators never leave your personal device. Only whitelisted reason codes reach the welfare board. This supports you — it is not surveillance, and nothing here is a diagnosis.',
    rhythmLabel: 'Your recent rhythm',
    rhythmDetail: 'From your sleep and mood check-ins. Not a diagnosis.',
    steady: 'Steady',
    uneven: 'Uneven patch',
    low: 'Low patch — support is here',
    tempoLabel: 'Deployment tempo',
    tempoBuilding: 'Building your picture',
    tempoBuildingDetail: 'Not enough history yet for a tempo reading.',
    tempoHigh: 'High tempo — rest matters',
    tempoNormal: 'Normal tempo',
    tempoDetail: 'Your duty pattern. Used for rest planning, never for evaluation.',
    checkinsLabel: 'Daily check-ins',
    checkinsDetail: 'Your private routine',
    checkinHeading: "Today's private check-in",
    moodQuestion: 'How are you feeling today?',
    moods: ['Exhausted', 'Low', 'Okay', 'Good', 'Excellent'],
    sleepLabel: 'Hours of rest / sleep',
    hours: 'hours',
    journalLabel: 'Confidential journal',
    journalPlaceholder:
      'Write whatever is on your mind. This text is analyzed locally and NEVER transmitted to any server…',
    journalNote: '100% on-device analysis. Zero cloud transmission.',
    saveCheckin: 'Save check-in safely on device',
    saving: 'Saving…',
    supportHeading: 'Discreet support request',
    supportBody: 'Connect with confidential welfare support without command exposure.',
    supportChannel: 'Select preferred support channel',
    channels: {
      buddy: 'Peer buddy (informal battalion peer)',
      welfare_officer: 'Unit Welfare Officer',
      medical_officer: 'Regimental Medical Officer',
      tele_manas: 'Tele-MANAS (14416) confidential helpline'
    },
    requestSupport: 'Request confidential support',
    transmitting: 'Sending…',
    supportDone: 'A confidential welfare liaison will contact you discreetly within 24 hours.',
    erasureHeading: 'Data rights and erasure',
    erasureBody:
      'You can request erasure of your case and intervention records at any time. An audit event is retained per policy (no personal content).',
    purge: 'Erase my wellness data',
    purging: 'Erasing records…',
    purged: 'Records successfully erased.',
    consentTitle: 'Your choice, always',
    consentBody:
      'Check-ins and journal entries are voluntary and stay on this device. Sharing happens only if you ask for support. You can erase everything at any time.',
    consentAgree: 'I voluntarily take part'
  },
  hi: {
    eyebrow: 'निजी ऑन-डिवाइस वेलनेस',
    title: 'गोपनीय वेलनेस',
    description:
      'आपकी जर्नल प्रविष्टियाँ और स्व-रिपोर्ट किए गए संकेत यह डिवाइस कभी नहीं छोड़ते। यह आपकी सहायता के लिए है — निगरानी नहीं, और यहाँ कुछ भी निदान नहीं है।',
    rhythmLabel: 'आपकी हाल की दिनचर्या',
    rhythmDetail: 'आपकी नींद और मनोदशा से। यह कोई निदान नहीं है।',
    steady: 'स्थिर',
    uneven: 'उतार-चढ़ाव',
    low: 'कठिन दौर — सहायता उपलब्ध है',
    tempoLabel: 'तैनाती की गति',
    tempoBuilding: 'आपकी तस्वीर बन रही है',
    tempoBuildingDetail: 'अभी पर्याप्त इतिहास नहीं है।',
    tempoHigh: 'तेज़ गति — आराम ज़रूरी है',
    tempoNormal: 'सामान्य गति',
    tempoDetail: 'आपकी ड्यूटी का स्वरूप। केवल आराम की योजना हेतु।',
    checkinsLabel: 'दैनिक जाँच',
    checkinsDetail: 'आपकी निजी दिनचर्या',
    checkinHeading: 'आज की निजी जाँच',
    moodQuestion: 'आज आप कैसा महसूस कर रहे हैं?',
    moods: ['थका हुआ', 'उदास', 'ठीक-ठाक', 'अच्छा', 'बहुत अच्छा'],
    sleepLabel: 'आराम / नींद के घंटे',
    hours: 'घंटे',
    journalLabel: 'गोपनीय जर्नल',
    journalPlaceholder:
      'जो मन में हो लिखें। यह पाठ केवल इसी डिवाइस पर विश्लेषित होता है, कभी सर्वर को नहीं भेजा जाता…',
    journalNote: '100% ऑन-डिवाइस विश्लेषण। कोई क्लाउड प्रेषण नहीं।',
    saveCheckin: 'चेक-इन सुरक्षित रूप से सहेजें',
    saving: 'सहेजा जा रहा है…',
    supportHeading: 'विवेकपूर्ण सहायता अनुरोध',
    supportBody: 'कमांड की जानकारी के बिना गोपनीय सहायता से जुड़ें।',
    supportChannel: 'पसंदीदा सहायता माध्यम चुनें',
    channels: {
      buddy: 'साथी मित्र (अनौपचारिक)',
      welfare_officer: 'यूनिट कल्याण अधिकारी',
      medical_officer: 'रेजिमेंटल चिकित्सा अधिकारी',
      tele_manas: 'टेली-मानस (14416) गोपनीय हेल्पलाइन'
    },
    requestSupport: 'गोपनीय सहायता का अनुरोध करें',
    transmitting: 'भेजा जा रहा है…',
    supportDone: 'गोपनीय कल्याण संपर्क 24 घंटों के भीतर विवेकपूर्वक संपर्क करेगा।',
    erasureHeading: 'डेटा अधिकार और मिटाना',
    erasureBody:
      'आप कभी भी अपने रिकॉर्ड मिटाने का अनुरोध कर सकते हैं। नीति अनुसार केवल ऑडिट घटना रहती है (कोई निजी सामग्री नहीं)।',
    purge: 'मेरा वेलनेस डेटा मिटाएँ',
    purging: 'रिकॉर्ड मिटाए जा रहे हैं…',
    purged: 'रिकॉर्ड सफलतापूर्वक मिटा दिए गए।',
    consentTitle: 'हमेशा आपकी मर्ज़ी',
    consentBody:
      'जाँच और जर्नल स्वैच्छिक हैं और इसी डिवाइस पर रहते हैं। साझाकरण तभी होता है जब आप सहायता माँगें। आप कभी भी सब कुछ मिटा सकते हैं।',
    consentAgree: 'मैं स्वेच्छा से भाग लेता/लेती हूँ'
  }
};
