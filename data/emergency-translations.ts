export type LanguageCode = "en" | "tl" | "ceb" | "war" | "hil" | "es" | "fr";

export interface TranslationPhrase {
  en: string;
  tl: string;
  ceb: string;
  war: string;
  hil: string;
  es?: string;
  fr?: string;
}

export const emergencyTranslations: Record<string, TranslationPhrase> = {
  // Emergency Alerts
  emergency_alert: {
    en: "Emergency Alert",
    tl: "Alerto sa Emerhensya",
    ceb: "Alerto sa Emerhensya",
    war: "Alerto sa Emerhensya",
    hil: "Alerto sa Emerhensya",
  },
  evacuate_now: {
    en: "Evacuate Now",
    tl: "Mag-evacuate na Ngayon",
    ceb: "Mag-evacuate Karon",
    war: "Mag-evacuate Yana",
    hil: "Mag-evacuate Karon",
  },
  seek_shelter: {
    en: "Seek Shelter Immediately",
    tl: "Maghanap ng Refugyo Agad",
    ceb: "Pangitaag Balay-balay Ugma",
    war: "Pangitaag Balay-balay Dayon",
    hil: "Pangitaag Balay-balay Dayon",
  },
  stay_calm: {
    en: "Stay Calm",
    tl: "Manatiling Calm",
    ceb: "Paghunahunaa Kalmado",
    war: "Paghunahunaa Kalmado",
    hil: "Paghunahunaa Kalmado",
  },

  // Natural Disasters
  flood_warning: {
    en: "Flood Warning",
    tl: "Babala sa Baha",
    ceb: "Bala sa Baha",
    war: "Bala sa Baha",
    hil: "Bala sa Baha",
  },
  earthquake_warning: {
    en: "Earthquake Warning",
    tl: "Babala sa Lindol",
    ceb: "Bala sa Lindol",
    war: "Bala sa Lindol",
    hil: "Bala sa Lindol",
  },
  typhoon_warning: {
    en: "Typhoon Warning",
    tl: "Babala sa Bagyo",
    ceb: "Bala sa Bagyo",
    war: "Bala sa Bagyo",
    hil: "Bala sa Bagyo",
  },
  landslide_warning: {
    en: "Landslide Warning",
    tl: "Babala sa Landslide",
    ceb: "Bala sa Landslide",
    war: "Bala sa Landslide",
    hil: "Bala sa Landslide",
  },
  volcanic_eruption: {
    en: "Volcanic Eruption Warning",
    tl: "Babala sa Eruption ng Bulkan",
    ceb: "Bala sa Eruption sa Bulkan",
    war: "Bala sa Eruption sa Bulkan",
    hil: "Bala sa Eruption sa Bulkan",
  },
  tsunami_warning: {
    en: "Tsunami Warning",
    tl: "Babala sa Tsunami",
    ceb: "Bala sa Tsunami",
    war: "Bala sa Tsunami",
    hil: "Bala sa Tsunami",
  },

  // Safety Instructions
  move_to_higher_ground: {
    en: "Move to Higher Ground",
    tl: "Lumipat sa Mas Mataas na Lugar",
    ceb: "Lihok sa Mas Taas nga Lugar",
    war: "Lihok sa Mas Taas nga Lugar",
    hil: "Lihok sa Mas Taas nga Lugar",
  },
  drop_cover_hold: {
    en: "Drop, Cover, and Hold On",
    tl: "Drop, Cover, at Hold On",
    ceb: "Drop, Cover, ug Hold On",
    war: "Drop, Cover, ngan Hold On",
    hil: "Drop, Cover, kag Hold On",
  },
  stay_away_from_windows: {
    en: "Stay Away from Windows",
    tl: "Malayo sa Mga Bintana",
    ceb: "Palayo sa Mga Bintana",
    war: "Palayo sa Mga Bintana",
    hil: "Palayo sa Mga Bintana",
  },
  do_not_cross_floodwaters: {
    en: "Do Not Cross Floodwaters",
    tl: "Huwag Tawirin ang Baha",
    ceb: "Ayaw Tawagon ang Baha",
    war: "Waray Tawagon ang Baha",
    hil: "Ayaw Tawagan ang Baha",
  },
  follow_evacuation_routes: {
    en: "Follow Evacuation Routes",
    tl: "Sundan ang mga Ruta ng Evacuation",
    ceb: "Sundan ang mga Ruta sa Evacuation",
    war: "Sundan an mga Ruta san Evacuation",
    hil: "Sundan ang mga Ruta sang Evacuation",
  },

  // Crime & Security
  crime_alert: {
    en: "Crime Alert",
    tl: "Alerto sa Krimen",
    ceb: "Alerto sa Krimen",
    war: "Alerto sa Krimen",
    hil: "Alerto sa Krimen",
  },
  suspicious_activity: {
    en: "Suspicious Activity Reported",
    tl: "Naiulat ang Suspicious na Activity",
    ceb: "Naiulat ang Suspicious nga Activity",
    war: "Naiulat an Suspicious nga Activity",
    hil: "Naiulat ang Suspicious nga Activity",
  },
  avoid_area: {
    en: "Avoid This Area",
    tl: "Iwasan ang Area na Ito",
    ceb: "Likayi kining Area",
    war: "Iwasan ini nga Area",
    hil: "Likayi ini nga Area",
  },
  lockdown_in_effect: {
    en: "Lockdown in Effect",
    tl: "Lockdown ay Naepekto",
    ceb: "Lockdown na Naepekto",
    war: "Lockdown nga Naepekto",
    hil: "Lockdown nga Naepekto",
  },
  report_emergency: {
    en: "Report Emergency",
    tl: "I-ulat ang Emerhensya",
    ceb: "I-ulat ang Emerhensya",
    war: "I-ulat an Emerhensya",
    hil: "I-ulat ang Emerhensya",
  },

  // Health & Medical
  medical_emergency: {
    en: "Medical Emergency",
    tl: "Medikal na Emerhensya",
    ceb: "Medikal nga Emerhensya",
    war: "Medikal nga Emerhensya",
    hil: "Medikal nga Emerhensya",
  },
  seek_medical_attention: {
    en: "Seek Medical Attention",
    tl: "Maghanap ng Medikal na Atensyon",
    ceb: "Pangitaag Medikal nga Atensyon",
    war: "Pangitaag Medikal nga Atensyon",
    hil: "Pangitaag Medikal nga Atensyon",
  },
  health_advisory: {
    en: "Health Advisory",
    tl: "Health Advisory",
    ceb: "Health Advisory",
    war: "Health Advisory",
    hil: "Health Advisory",
  },
  disease_outbreak: {
    en: "Disease Outbreak Warning",
    tl: "Babala sa Disease Outbreak",
    ceb: "Bala sa Disease Outbreak",
    war: "Bala sa Disease Outbreak",
    hil: "Bala sa Disease Outbreak",
  },

  // Fire Safety
  fire_alert: {
    en: "Fire Alert",
    tl: "Alerto sa Sunog",
    ceb: "Alerto sa Sunog",
    war: "Alerto sa Sunog",
    hil: "Alerto sa Sunog",
  },
  evacuate_building: {
    en: "Evacuate the Building",
    tl: "Mag-evacuate sa Building",
    ceb: "Mag-evacuate sa Building",
    war: "Mag-evacuate sa Building",
    hil: "Mag-evacuate sa Building",
  },
  use_fire_exits: {
    en: "Use Fire Exits Only",
    tl: "Gamitin lang ang Fire Exits",
    ceb: "Gamitin lang ang Fire Exits",
    war: "Gamiton la an Fire Exits",
    hil: "Gamiton lang ang Fire Exits",
  },
  do_not_use_elevator: {
    en: "Do Not Use Elevator",
    tl: "Huwag Gamitin ang Elevator",
    ceb: "Ayaw Gamiton ang Elevator",
    war: "Waray Gamiton an Elevator",
    hil: "Ayaw Gamiton ang Elevator",
  },

  // Communication & Status
  all_clear: {
    en: "All Clear",
    tl: "Ligtas Na",
    ceb: "Ligtas Na",
    war: "Ligtas Na",
    hil: "Ligtas Na",
  },
  stand_by_for_updates: {
    en: "Stand By for Updates",
    tl: "Mag-antay para sa Updates",
    ceb: "Mag-antay para sa Updates",
    war: "Mag-antay para sa Updates",
    hil: "Mag-antay para sa Updates",
  },
  emergency_services_dispatched: {
    en: "Emergency Services Dispatched",
    tl: "Emergency Services ay Nadispatch",
    ceb: "Emergency Services nga Nadispatch",
    war: "Emergency Services nga Nadispatch",
    hil: "Emergency Services nga Nadispatch",
  },
  follow_instructions: {
    en: "Follow Official Instructions",
    tl: "Sundan ang Opisyal na Instructions",
    ceb: "Sundan ang Opisyal nga Instructions",
    war: "Sundan an Opisyal nga Instructions",
    hil: "Sundan ang Opisyal nga Instructions",
  },

  // Evacuation Centers
  evacuation_center_open: {
    en: "Evacuation Center Open",
    tl: "Bukas ang Evacuation Center",
    ceb: "Bukas ang Evacuation Center",
    war: "Bukas an Evacuation Center",
    hil: "Bukas ang Evacuation Center",
  },
  bring_essentials: {
    en: "Bring Essential Items",
    tl: "Dalhin ang Essential na Items",
    ceb: "Dala ang Essential nga Items",
    war: "Dala an Essential nga Items",
    hil: "Dala ang Essential nga Items",
  },
  register_at_center: {
    en: "Register at Evacuation Center",
    tl: "Mag-rehistro sa Evacuation Center",
    ceb: "Mag-rehistro sa Evacuation Center",
    war: "Mag-rehistro sa Evacuation Center",
    hil: "Mag-rehistro sa Evacuation Center",
  },

  // Weather Related
  heavy_rain_warning: {
    en: "Heavy Rain Warning",
    tl: "Babala sa Mabibigat na Ulan",
    ceb: "Bala sa Bug-at nga Ulan",
    war: "Bala sa Bug-at nga Ulan",
    hil: "Bala sa Bug-at nga Ulan",
  },
  strong_winds: {
    en: "Strong Winds Expected",
    tl: "Malakas na Angin Inaasahan",
    ceb: "Kusog nga Hangin Giexpect",
    war: "Kusog nga Hangin Giexpect",
    hil: "Kusog nga Hangin Giexpect",
  },
  storm_surge_warning: {
    en: "Storm Surge Warning",
    tl: "Babala sa Storm Surge",
    ceb: "Bala sa Storm Surge",
    war: "Bala sa Storm Surge",
    hil: "Bala sa Storm Surge",
  },

  // Common Phrases
  please_remain_calm: {
    en: "Please Remain Calm",
    tl: "Pakihintay na Calm",
    ceb: "Palihug Paghunahunaang Kalmado",
    war: "Palihug Paghunahunaang Kalmado",
    hil: "Palihug Paghunahunaang Kalmado",
  },
  your_safety_first: {
    en: "Your Safety is Our Priority",
    tl: "Ang Iyong Safety ang Priority Namin",
    ceb: "Ang Iyong Safety ang Priority Namo",
    war: "An Iyong Safety an Priority Namon",
    hil: "Ang Iyong Safety ang Priority Namo",
  },
  help_is_on_the_way: {
    en: "Help is on the Way",
    tl: "Tulong ay Paparating na",
    ceb: "Tulong nga Naa paabot",
    war: "Tulong nga Naa paabot",
    hil: "Tulong nga Naa paabot",
  },
  stay_informed: {
    en: "Stay Informed",
    tl: "Manatiling Informed",
    ceb: "Paghunahunaang Informed",
    war: "Paghunahunaang Informed",
    hil: "Paghunahunaang Informed",
  },
  contact_family: {
    en: "Contact Your Family",
    tl: "Kontakin ang Iyong Pamilya",
    ceb: "Kontaki ang Iyong Pamilya",
    war: "Kontaki an Iyong Pamilya",
    hil: "Kontaki ang Iyong Pamilya",
  },
};

// Helper function to get translation for a specific phrase and language
export function getTranslation(phraseKey: string, language: LanguageCode): string {
  const phrase = emergencyTranslations[phraseKey];
  if (!phrase) {
    console.warn(`Translation not found for phrase key: ${phraseKey}`);
    return phraseKey; // Return key as fallback
  }
  
  // Return the translation for the requested language, fallback to English if not available
  return phrase[language] || phrase.en || phraseKey;
}

// Get all available phrase keys
export function getAvailablePhraseKeys(): string[] {
  return Object.keys(emergencyTranslations);
}

// Get all supported languages
export function getSupportedLanguages(): LanguageCode[] {
  return ["en", "tl"];
}

// Language display names
export const languageNames: Partial<Record<LanguageCode, string>> & Record<"en" | "tl", string> = {
  en: "English",
  tl: "Tagalog",
};
