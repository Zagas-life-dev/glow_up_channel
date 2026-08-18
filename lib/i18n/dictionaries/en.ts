/**
 * English is the source dictionary — every other language is typed against its
 * shape, so a missing key is a compile error rather than a blank label.
 *
 * Scope note: this covers the surfaces this feature introduces or changes
 * (ranking reasons, location consent, language switching, filters, the
 * onboarding location step) plus the shared words those screens need. It is not
 * a translation of the whole app; adding the rest is a mechanical sweep against
 * this same file.
 *
 * `{placeholders}` are substituted by `translate` in `lib/i18n/translate.ts`.
 */

export const en = {
  common: {
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    next: "Next",
    previous: "Previous",
    loading: "Loading…",
    retry: "Try again",
    notNow: "Not now",
    allow: "Allow",
    optional: "Optional",
    required: "Required",
    anywhere: "Anywhere",
    any: "Any",
    clearAll: "Clear all",
  },

  language: {
    label: "Language",
    switch: "Change language",
    current: "Reading in {language}",
    description: "Content in your language is ranked higher.",
  },

  location: {
    title: "Where are you?",
    subtitle: "This helps us find opportunities near you.",
    country: "Country",
    province: "Province/State",
    city: "City/Town",
    countryPlaceholder: "e.g., Nigeria",
    provincePlaceholder: "e.g., Lagos",
    cityPlaceholder: "e.g., Ikeja",
    detecting: "Finding your location…",
    detected: "Detected {place}",
    useDetected: "Use this",
    permissionTitle: "Show opportunities near you",
    permissionBody:
      "Sharing your location lets us rank jobs, events and programmes by how close they are. You can turn this off at any time.",
    permissionAllow: "Share my location",
    permissionDenied:
      "Location is blocked in your browser settings. We will use your profile location instead.",
    permissionUnsupported: "Your browser does not support precise location.",
    usingProfile: "Using the location on your profile.",
    chooseCountry: "Show opportunities in",
    yourCountry: "Your location",
    anywhere: "Anywhere",
    viewingFrom: "Showing {country}",
    unknown: "not detected",
    notCovered: "not covered yet",
    regionWestAfrica: "West Africa",
    regionEastAfrica: "East Africa",
    regionSouthernAfrica: "Southern Africa",
    regionCentralAfrica: "Central Africa",
    stopSharing: "Stop using my location",
    accuracyNote: "Only used for ranking. Your coordinates never leave your device.",
  },

  filters: {
    title: "Filters",
    country: "Country",
    city: "City or state",
    anyCountry: "Any country",
    type: "Type",
    anyType: "Any type",
    dateRange: "Date range",
    from: "From",
    to: "To",
    remote: "Remote",
    paid: "Paid",
    yes: "yes",
    no: "no",
    noneYet: "None yet",
    nearMe: "Near me",
    inMyLanguage: "In my language",
  },

  /**
   * Why an item was ranked where it was. Keys match `RankReason.key`.
   */
  reasons: {
    matchesInterests: "Matches your interests",
    matchesTag: "Matches your interest in {tag}",
    inYourCity: "In {city}",
    inYourCountry: "In {country}",
    nearYou: "Near you",
    remote: "Remote — open to anyone",
    closingSoon: "Closing soon",
    justPosted: "Just posted",
    popular: "Popular right now",
    inYourLanguage: "In your language",
  },

  feed: {
    forYou: "For you",
    recommended: "Recommended for you",
    whyThis: "Why this?",
    noResults: "Nothing here yet",
    noResultsHint: "Try widening your filters or adding more interests to your profile.",
    personalising: "Personalising your feed…",
    basedOn: "Based on your interests and location",
    basedOnLocation: "Based on your location",
    basedOnInterests: "Based on your interests",
  },
}

/**
 * Not `as const` — the other dictionaries are typed against this, and literal
 * types would force every translation to equal the English string.
 */
export type Dictionary = typeof en
