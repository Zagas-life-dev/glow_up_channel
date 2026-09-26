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
    permissionTitle: "Find opportunities near you",
    permissionBody: "UP uses your location to show jobs, events and scholarships in your country and city first, and to hide ones you can't apply for.",
    permissionPrivacy: "We only save your approximate area, never your exact position, and you can turn this off any time in settings.",
    permissionAllow: "Allow location",
    permissionDenied:
      "Location is blocked in your browser. We'll use your country from your connection instead.",
    blockedStepsTitle: "To turn location back on:",
    blockedStep1: "Tap the lock or settings icon next to the web address.",
    blockedStep2: "Find Location and choose Allow.",
    blockedStep3: "Reload this page.",
    useMyLocation: "Use my location",
    clearSaved: "Clear my saved location",
    cleared: "Your saved location was cleared.",
    selectCountry: "Choose a country",
    selectRegion: "Choose a {label}",
    selectCity: "Choose a city",
    cityNotListed: "Not listed — type it",
    regionState: "State",
    regionRegion: "Region",
    regionCounty: "County",
    isRemote: "This is remote",
    remoteWho: "Who can apply?",
    remoteAnywhere: "Anyone, anywhere",
    remoteCountries: "Only people in these countries",
    remoteCountriesHint: "Pick every country applicants may be in.",
    required: "Choose the country, and the {label} unless it is remote.",
    permissionUnsupported: "Your browser does not support precise location.",
    usingProfile: "Using the location on your profile.",
    chooseCountry: "Show opportunities in",
    searchCountries: "Search countries",
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
    accuracyNote: "We only save your approximate area (about 1 km), never your exact position.",
  },

  /** The official tag list: pickers, chips and their groups. */
  tags: {
    title: "Tags",
    search: "Search tags",
    suggested: "Suggested from your description",
    addSuggested: "Add",
    none: "No tags yet",
    noMatches: "No tags match “{query}”",
    limit: "Up to {count}",
    atLimit: "You've picked the most for this group",
    remove: "Remove {tag}",
    facetType: "What it is",
    facetFormat: "Event format",
    facetWork: "Work arrangement",
    facetLevel: "Career level",
    facetCommunity: "Community groups",
    facetIndustry: "Industry",
    facetSkill: "Skills",
    communityHelp:
      "Who is this made for? Only pick a group if the listing is aimed at them — an ordinary job is not for “Women” just because women can apply.",
    industryRequired: "Pick at least one industry",
    levelRequired: "Pick the career level this is for",
  },

  onboarding: {
    communitiesTitle: "Which communities describe you?",
    communitiesHelp:
      "We'll show you opportunities made specifically for these groups. Pick any that fit, or skip.",
    skillsHelp: "Pick from the list so we can match you accurately.",
    locationConfirmTitle: "Is this where you are?",
    locationConfirmBody: "We tidied up the location on your profile. Check it's right so we show you what's near you.",
    locationConfirm: "Yes, that's right",
    locationChange: "Change it",
  },

  /** Location analytics for providers and monitors. */
  locationAnalytics: {
    title: "Where your audience is",
    subtitle: "Views, clicks and applications by place, last {days} days.",
    countries: "Countries",
    states: "States and regions",
    cities: "Cities",
    place: "Place",
    views: "Views",
    clicks: "Clicks",
    applications: "Applications",
    total: "Total",
    other: "Other",
    otherPlaces: "{count} smaller places",
    privacyNote: "Places with fewer than {count} people are grouped as Other so no one can be identified.",
    noData: "No location data yet. It appears as people view and apply.",
    loadError: "Couldn't load location analytics.",
    range7: "7 days",
    range30: "30 days",
    range90: "90 days",
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
    youStartedThis: "You started this",
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

  /**
   * Gifts: admin-published resources handed to every user at once. They never
   * appear in a feed — the popup and the profile-page list are the only
   * surfaces they exist on.
   */
  gifts: {
    badge: "Gift",
    popupTitle: "You've got a gift!",
    view: "View",
    viewOthers: "View others",
    close: "Close",
    oneMore: "+1 more new gift waiting",
    moreWaiting: "+{count} more new gifts waiting",
    tab: "Gifts",
    listTitle: "Your gifts",
    listSubtitle: "Free resources from the UP team. Everyone gets the same ones.",
    empty: "No gifts yet",
    emptyHint: "When the UP team sends one, it lands here and you'll hear about it.",
    isNew: "New",
    openGift: "Open gift",
    openLink: "Open link",
    signedInOnly: "Sign in to see your gifts",
    loadError: "Couldn't load your gifts.",
    viewOnly: "Viewing only — this gift can't be downloaded.",
    downloadable: "Read it here, or download it to keep.",
    download: "Download",
    downloading: "Downloading…",
    downloadFailed: "Couldn't download that gift. Try again.",
    readInApp: "read in the app",
    readOrDownload: "read in the app or download",
    liked: "Liked",
    like: "Like",
    saved: "Saved",
    save: "Save",
    addToPlaylist: "Add to list",
    fromTeam: "From the UP team — free for every member",
    railNote: "Every member gets the same gifts. They never show up in your feed.",
    added: "Added",
    backToGifts: "Back to gifts",
    listingClosed: "Closed",
    openListing: "View the {type}",
    listingGone: "This {type} has closed",
    listingPaid: "This one is paid. The gift points you to it — it doesn't cover the price.",
    railNoteListing: "Every member gets the same gifts. This one hands you something you can also find in the feed.",
  },
}

/**
 * Not `as const` — the other dictionaries are typed against this, and literal
 * types would force every translation to equal the English string.
 */
export type Dictionary = typeof en
