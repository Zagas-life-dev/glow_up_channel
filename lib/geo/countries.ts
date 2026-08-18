/**
 * Country reference data: the thing that turns "nigeria", "NG", and "Nigeria "
 * into one comparable value.
 *
 * Carries four facts per country, each earning its place in the algorithm:
 *   - subregion, so "West Africa" content still ranks for a Ghanaian user
 *   - supported languages, so we can guess a locale before the user picks one
 *   - a centroid, so GPS coordinates can be scored against content that only
 *     names a country
 *   - the English display name, so free-text profiles normalize to one spelling
 *
 * Packed as a string rather than 190 object literals — it parses once at module
 * load and keeps the file readable.
 */

export type Region = "Africa" | "Europe" | "Americas" | "Asia" | "Oceania"

export type Subregion =
  | "north-africa"
  | "west-africa"
  | "central-africa"
  | "east-africa"
  | "southern-africa"
  | "north-europe"
  | "west-europe"
  | "south-europe"
  | "east-europe"
  | "north-america"
  | "central-america"
  | "caribbean"
  | "south-america"
  | "central-asia"
  | "east-asia"
  | "southeast-asia"
  | "south-asia"
  | "west-asia"
  | "australasia"
  | "melanesia"
  | "micronesia"
  | "polynesia"

export type Country = {
  code: string
  name: string
  subregion: Subregion
  region: Region
  /** Supported UI languages spoken here, most common first. Empty means none. */
  languages: string[]
  lat: number
  lng: number
}

const REGION_OF_SUBREGION: Record<Subregion, Region> = {
  "north-africa": "Africa",
  "west-africa": "Africa",
  "central-africa": "Africa",
  "east-africa": "Africa",
  "southern-africa": "Africa",
  "north-europe": "Europe",
  "west-europe": "Europe",
  "south-europe": "Europe",
  "east-europe": "Europe",
  "north-america": "Americas",
  "central-america": "Americas",
  caribbean: "Americas",
  "south-america": "Americas",
  "central-asia": "Asia",
  "east-asia": "Asia",
  "southeast-asia": "Asia",
  "south-asia": "Asia",
  "west-asia": "Asia",
  australasia: "Oceania",
  melanesia: "Oceania",
  micronesia: "Oceania",
  polynesia: "Oceania",
}

// code|name|subregion|languages|lat|lng
const PACKED = `
DZ|Algeria|north-africa|fr|28.03|1.66
EG|Egypt|north-africa|en|26.82|30.80
LY|Libya|north-africa||26.34|17.23
MA|Morocco|north-africa|fr|31.79|-7.09
SD|Sudan|north-africa|en|12.86|30.22
TN|Tunisia|north-africa|fr|33.89|9.54
EH|Western Sahara|north-africa|es|24.22|-12.89
BJ|Benin|west-africa|fr|9.31|2.32
BF|Burkina Faso|west-africa|fr|12.24|-1.56
CV|Cabo Verde|west-africa|pt|16.00|-24.01
CI|Côte d'Ivoire|west-africa|fr|7.54|-5.55
GM|Gambia|west-africa|en|13.44|-15.31
GH|Ghana|west-africa|en|7.95|-1.02
GN|Guinea|west-africa|fr|9.95|-9.70
GW|Guinea-Bissau|west-africa|pt|11.80|-15.18
LR|Liberia|west-africa|en|6.43|-9.43
ML|Mali|west-africa|fr|17.57|-4.00
MR|Mauritania|west-africa|fr|21.01|-10.94
NE|Niger|west-africa|fr|17.61|8.08
NG|Nigeria|west-africa|en|9.08|8.68
SN|Senegal|west-africa|fr|14.50|-14.45
SL|Sierra Leone|west-africa|en|8.46|-11.78
TG|Togo|west-africa|fr|8.62|0.82
AO|Angola|central-africa|pt|-11.20|17.87
CM|Cameroon|central-africa|fr,en|7.37|12.35
CF|Central African Republic|central-africa|fr|6.61|20.94
TD|Chad|central-africa|fr|15.45|18.73
CG|Congo|central-africa|fr|-0.23|15.83
CD|DR Congo|central-africa|fr|-4.04|21.76
GQ|Equatorial Guinea|central-africa|es,pt,fr|1.65|10.27
GA|Gabon|central-africa|fr|-0.80|11.61
ST|São Tomé and Príncipe|central-africa|pt|0.19|6.61
BI|Burundi|east-africa|fr|-3.37|29.92
KM|Comoros|east-africa|fr|-11.65|43.33
DJ|Djibouti|east-africa|fr|11.83|42.59
ER|Eritrea|east-africa|en|15.18|39.78
ET|Ethiopia|east-africa|en|9.15|40.49
KE|Kenya|east-africa|en|-0.02|37.91
MG|Madagascar|east-africa|fr|-18.77|46.87
MW|Malawi|east-africa|en|-13.25|34.30
MU|Mauritius|east-africa|en,fr|-20.35|57.55
MZ|Mozambique|east-africa|pt|-18.67|35.53
RW|Rwanda|east-africa|en,fr|-1.94|29.87
SC|Seychelles|east-africa|en,fr|-4.68|55.49
SO|Somalia|east-africa|en|5.15|46.20
SS|South Sudan|east-africa|en|6.88|31.31
TZ|Tanzania|east-africa|en|-6.37|34.89
UG|Uganda|east-africa|en|1.37|32.29
ZM|Zambia|east-africa|en|-13.13|27.85
ZW|Zimbabwe|east-africa|en|-19.02|29.15
BW|Botswana|southern-africa|en|-22.33|24.68
SZ|Eswatini|southern-africa|en|-26.52|31.47
LS|Lesotho|southern-africa|en|-29.61|28.23
NA|Namibia|southern-africa|en|-22.96|18.49
ZA|South Africa|southern-africa|en|-30.56|22.94
DK|Denmark|north-europe|en|56.26|9.50
EE|Estonia|north-europe|en|58.60|25.01
FI|Finland|north-europe|en|61.92|25.75
IS|Iceland|north-europe|en|64.96|-19.02
IE|Ireland|north-europe|en|53.41|-8.24
LV|Latvia|north-europe|en|56.88|24.60
LT|Lithuania|north-europe|en|55.17|23.88
NO|Norway|north-europe|en|60.47|8.47
SE|Sweden|north-europe|en|60.13|18.64
GB|United Kingdom|north-europe|en|55.38|-3.44
AT|Austria|west-europe|en|47.52|14.55
BE|Belgium|west-europe|fr,en|50.50|4.47
FR|France|west-europe|fr|46.23|2.21
DE|Germany|west-europe|en|51.17|10.45
LI|Liechtenstein|west-europe|en|47.17|9.56
LU|Luxembourg|west-europe|fr,en|49.82|6.13
MC|Monaco|west-europe|fr|43.75|7.41
NL|Netherlands|west-europe|en|52.13|5.29
CH|Switzerland|west-europe|fr,en|46.82|8.23
AL|Albania|south-europe|en|41.15|20.17
AD|Andorra|south-europe|es,fr|42.55|1.60
BA|Bosnia and Herzegovina|south-europe|en|43.92|17.68
HR|Croatia|south-europe|en|45.10|15.20
GR|Greece|south-europe|en|39.07|21.82
IT|Italy|south-europe|en|41.87|12.57
MT|Malta|south-europe|en|35.94|14.38
ME|Montenegro|south-europe|en|42.71|19.37
MK|North Macedonia|south-europe|en|41.61|21.75
PT|Portugal|south-europe|pt|39.40|-8.22
SM|San Marino|south-europe|en|43.94|12.46
RS|Serbia|south-europe|en|44.02|21.01
SI|Slovenia|south-europe|en|46.15|14.99
ES|Spain|south-europe|es|40.46|-3.75
VA|Vatican City|south-europe|en|41.90|12.45
BY|Belarus|east-europe|en|53.71|27.95
BG|Bulgaria|east-europe|en|42.73|25.49
CZ|Czechia|east-europe|en|49.82|15.47
HU|Hungary|east-europe|en|47.16|19.50
MD|Moldova|east-europe|fr|47.41|28.37
PL|Poland|east-europe|en|51.92|19.15
RO|Romania|east-europe|fr,en|45.94|24.97
RU|Russia|east-europe|en|61.52|105.32
SK|Slovakia|east-europe|en|48.67|19.70
UA|Ukraine|east-europe|en|48.38|31.17
CA|Canada|north-america|en,fr|56.13|-106.35
US|United States|north-america|en,es|37.09|-95.71
BZ|Belize|central-america|en,es|17.19|-88.50
CR|Costa Rica|central-america|es|9.75|-83.75
SV|El Salvador|central-america|es|13.79|-88.90
GT|Guatemala|central-america|es|15.78|-90.23
HN|Honduras|central-america|es|15.20|-86.24
MX|Mexico|central-america|es|23.63|-102.55
NI|Nicaragua|central-america|es|12.87|-85.21
PA|Panama|central-america|es|8.54|-80.78
AG|Antigua and Barbuda|caribbean|en|17.06|-61.80
BS|Bahamas|caribbean|en|25.03|-77.40
BB|Barbados|caribbean|en|13.19|-59.54
CU|Cuba|caribbean|es|21.52|-77.78
DM|Dominica|caribbean|en,fr|15.41|-61.37
DO|Dominican Republic|caribbean|es|18.74|-70.16
GD|Grenada|caribbean|en|12.12|-61.68
HT|Haiti|caribbean|fr|18.97|-72.29
JM|Jamaica|caribbean|en|18.11|-77.30
KN|Saint Kitts and Nevis|caribbean|en|17.36|-62.78
LC|Saint Lucia|caribbean|en,fr|13.91|-60.98
VC|Saint Vincent and the Grenadines|caribbean|en|12.98|-61.29
TT|Trinidad and Tobago|caribbean|en|10.69|-61.22
PR|Puerto Rico|caribbean|es,en|18.22|-66.59
AR|Argentina|south-america|es|-38.42|-63.62
BO|Bolivia|south-america|es|-16.29|-63.59
BR|Brazil|south-america|pt|-14.24|-51.93
CL|Chile|south-america|es|-35.68|-71.54
CO|Colombia|south-america|es|4.57|-74.30
EC|Ecuador|south-america|es|-1.83|-78.18
GY|Guyana|south-america|en|4.86|-58.93
PY|Paraguay|south-america|es|-23.44|-58.44
PE|Peru|south-america|es|-9.19|-75.02
SR|Suriname|south-america|en|3.92|-56.03
UY|Uruguay|south-america|es|-32.52|-55.77
VE|Venezuela|south-america|es|6.42|-66.59
KZ|Kazakhstan|central-asia|en|48.02|66.92
KG|Kyrgyzstan|central-asia|en|41.20|74.77
TJ|Tajikistan|central-asia|en|38.86|71.28
TM|Turkmenistan|central-asia|en|38.97|59.56
UZ|Uzbekistan|central-asia|en|41.38|64.59
CN|China|east-asia|en|35.86|104.20
HK|Hong Kong|east-asia|en|22.32|114.17
JP|Japan|east-asia|en|36.20|138.25
KP|North Korea|east-asia|en|40.34|127.51
KR|South Korea|east-asia|en|35.91|127.77
MO|Macao|east-asia|pt,en|22.20|113.54
MN|Mongolia|east-asia|en|46.86|103.85
TW|Taiwan|east-asia|en|23.70|120.96
BN|Brunei|southeast-asia|en|4.54|114.73
KH|Cambodia|southeast-asia|en,fr|12.57|104.99
ID|Indonesia|southeast-asia|en|-0.79|113.92
LA|Laos|southeast-asia|fr,en|19.86|102.50
MY|Malaysia|southeast-asia|en|4.21|101.98
MM|Myanmar|southeast-asia|en|21.91|95.96
PH|Philippines|southeast-asia|en,es|12.88|121.77
SG|Singapore|southeast-asia|en|1.35|103.82
TH|Thailand|southeast-asia|en|15.87|100.99
TL|Timor-Leste|southeast-asia|pt|-8.87|125.73
VN|Vietnam|southeast-asia|en,fr|14.06|108.28
AF|Afghanistan|south-asia|en|33.94|67.71
BD|Bangladesh|south-asia|en|23.68|90.36
BT|Bhutan|south-asia|en|27.51|90.43
IN|India|south-asia|en|20.59|78.96
IR|Iran|south-asia|en|32.43|53.69
MV|Maldives|south-asia|en|3.20|73.22
NP|Nepal|south-asia|en|28.39|84.12
PK|Pakistan|south-asia|en|30.38|69.35
LK|Sri Lanka|south-asia|en|7.87|80.77
AM|Armenia|west-asia|en|40.07|45.04
AZ|Azerbaijan|west-asia|en|40.14|47.58
BH|Bahrain|west-asia|en|25.93|50.64
CY|Cyprus|west-asia|en|35.13|33.43
GE|Georgia|west-asia|en|42.32|43.36
IQ|Iraq|west-asia|en|33.22|43.68
IL|Israel|west-asia|en|31.05|34.85
JO|Jordan|west-asia|en|30.59|36.24
KW|Kuwait|west-asia|en|29.31|47.48
LB|Lebanon|west-asia|fr,en|33.85|35.86
OM|Oman|west-asia|en|21.51|55.92
PS|Palestine|west-asia|en|31.95|35.23
QA|Qatar|west-asia|en|25.35|51.18
SA|Saudi Arabia|west-asia|en|23.89|45.08
SY|Syria|west-asia|fr,en|34.80|39.00
TR|Turkey|west-asia|en|38.96|35.24
AE|United Arab Emirates|west-asia|en|23.42|53.85
YE|Yemen|west-asia|en|15.55|48.52
AU|Australia|australasia|en|-25.27|133.78
NZ|New Zealand|australasia|en|-40.90|174.89
FJ|Fiji|melanesia|en|-17.71|178.07
NC|New Caledonia|melanesia|fr|-20.90|165.62
PG|Papua New Guinea|melanesia|en|-6.31|143.96
SB|Solomon Islands|melanesia|en|-9.65|160.16
VU|Vanuatu|melanesia|en,fr|-15.38|166.96
FM|Micronesia|micronesia|en|7.43|150.55
KI|Kiribati|micronesia|en|-3.37|-168.73
MH|Marshall Islands|micronesia|en|7.13|171.18
NR|Nauru|micronesia|en|-0.52|166.93
PW|Palau|micronesia|en|7.51|134.58
PF|French Polynesia|polynesia|fr|-17.68|-149.41
WS|Samoa|polynesia|en|-13.76|-172.10
TO|Tonga|polynesia|en|-21.18|-175.20
TV|Tuvalu|polynesia|en|-7.11|177.65
`

function parse(): Country[] {
  return PACKED.trim()
    .split("\n")
    .map((line) => {
      const [code, name, subregion, languages, lat, lng] = line.split("|")
      return {
        code,
        name,
        subregion: subregion as Subregion,
        region: REGION_OF_SUBREGION[subregion as Subregion],
        languages: languages ? languages.split(",") : [],
        lat: Number(lat),
        lng: Number(lng),
      }
    })
}

export const COUNTRIES: Country[] = parse()

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]))

/**
 * Spellings people actually type or that upstream feeds emit, mapped to a code.
 * Alpha-3 codes are here because scraped listings are full of them.
 */
const ALIASES: Record<string, string> = {
  // Frequently typed variants
  "ivory coast": "CI",
  "cote divoire": "CI",
  "cote d ivoire": "CI",
  "republic of cote divoire": "CI",
  "cape verde": "CV",
  "united states of america": "US",
  usa: "US",
  "u s a": "US",
  america: "US",
  uk: "GB",
  "great britain": "GB",
  britain: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  "northern ireland": "GB",
  "united kingdom of great britain and northern ireland": "GB",
  uae: "AE",
  emirates: "AE",
  drc: "CD",
  "dr congo": "CD",
  "democratic republic of the congo": "CD",
  "democratic republic of congo": "CD",
  "congo kinshasa": "CD",
  zaire: "CD",
  "republic of the congo": "CG",
  "congo brazzaville": "CG",
  "south korea": "KR",
  "korea republic of": "KR",
  "republic of korea": "KR",
  "north korea": "KP",
  swaziland: "SZ",
  "sao tome and principe": "ST",
  "sao tome": "ST",
  burma: "MM",
  "east timor": "TL",
  "timor leste": "TL",
  holland: "NL",
  "the netherlands": "NL",
  "czech republic": "CZ",
  "russian federation": "RU",
  "vatican": "VA",
  "holy see": "VA",
  "macedonia": "MK",
  "turkiye": "TR",
  "viet nam": "VN",
  "brasil": "BR",
  "espana": "ES",
  "deutschland": "DE",
  "tanzania united republic of": "TZ",
  "united republic of tanzania": "TZ",
  "gambia the": "GM",
  "the gambia": "GM",
  "bahamas the": "BS",
  "trinidad": "TT",
  "palestinian territories": "PS",
  "state of palestine": "PS",
  "hong kong sar": "HK",
  "macau": "MO",
  "remote": "",
  "worldwide": "",
  "global": "",
  "anywhere": "",
  "online": "",

  // ISO alpha-3 for every country above
  dza: "DZ", egy: "EG", lby: "LY", mar: "MA", sdn: "SD", tun: "TN", esh: "EH",
  ben: "BJ", bfa: "BF", cpv: "CV", civ: "CI", gmb: "GM", gha: "GH", gin: "GN",
  gnb: "GW", lbr: "LR", mli: "ML", mrt: "MR", ner: "NE", nga: "NG", sen: "SN",
  sle: "SL", tgo: "TG", ago: "AO", cmr: "CM", caf: "CF", tcd: "TD", cog: "CG",
  cod: "CD", gnq: "GQ", gab: "GA", stp: "ST", bdi: "BI", com: "KM", dji: "DJ",
  eri: "ER", eth: "ET", ken: "KE", mdg: "MG", mwi: "MW", mus: "MU", moz: "MZ",
  rwa: "RW", syc: "SC", som: "SO", ssd: "SS", tza: "TZ", uga: "UG", zmb: "ZM",
  zwe: "ZW", bwa: "BW", swz: "SZ", lso: "LS", nam: "NA", zaf: "ZA", dnk: "DK",
  est: "EE", fin: "FI", isl: "IS", irl: "IE", lva: "LV", ltu: "LT", nor: "NO",
  swe: "SE", gbr: "GB", aut: "AT", bel: "BE", fra: "FR", deu: "DE", lie: "LI",
  lux: "LU", mco: "MC", nld: "NL", che: "CH", alb: "AL", and: "AD", bih: "BA",
  hrv: "HR", grc: "GR", ita: "IT", mlt: "MT", mne: "ME", mkd: "MK", prt: "PT",
  smr: "SM", srb: "RS", svn: "SI", esp: "ES", vat: "VA", blr: "BY", bgr: "BG",
  cze: "CZ", hun: "HU", mda: "MD", pol: "PL", rou: "RO", rus: "RU", svk: "SK",
  ukr: "UA", can: "CA",
  hnd: "HN", mex: "MX", nic: "NI", pan: "PA", atg: "AG", bhs: "BS", brb: "BB",
  cub: "CU", dma: "DM", dom: "DO", grd: "GD", hti: "HT", jam: "JM", kna: "KN",
  lca: "LC", vct: "VC", tto: "TT", pri: "PR", arg: "AR", bol: "BO", bra: "BR",
  chl: "CL", col: "CO", ecu: "EC", guy: "GY", pry: "PY", per: "PE", sur: "SR",
  ury: "UY", ven: "VE", kaz: "KZ", kgz: "KG", tjk: "TJ", tkm: "TM", uzb: "UZ",
  chn: "CN", hkg: "HK", jpn: "JP", prk: "KP", kor: "KR", mac: "MO", mng: "MN",
  twn: "TW", brn: "BN", khm: "KH", idn: "ID", lao: "LA", mys: "MY", mmr: "MM",
  phl: "PH", sgp: "SG", tha: "TH", tls: "TL", vnm: "VN", afg: "AF", bgd: "BD",
  btn: "BT", ind: "IN", irn: "IR", mdv: "MV", npl: "NP", pak: "PK", lka: "LK",
  arm: "AM", aze: "AZ", bhr: "BH", cyp: "CY", geo: "GE", irq: "IQ", isr: "IL",
  jor: "JO", kwt: "KW", lbn: "LB", omn: "OM", pse: "PS", qat: "QA", sau: "SA",
  syr: "SY", tur: "TR", are: "AE", yem: "YE", aus: "AU", nzl: "NZ", fji: "FJ",
  ncl: "NC", png: "PG", slb: "SB", vut: "VU", fsm: "FM", kir: "KI", mhl: "MH",
  nru: "NR", plw: "PW", pyf: "PF", wsm: "WS", ton: "TO", tuv: "TV",
}

/** Combining marks left behind by NFD decomposition (U+0300–U+036F). */
const DIACRITICS = /[̀-ͯ]/g

/** Lowercase, strip accents and punctuation — "Côte d'Ivoire" → "cote d ivoire". */
function simplify(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const BY_NAME = new Map<string, string>()
for (const country of COUNTRIES) {
  BY_NAME.set(simplify(country.name), country.code)
}

/**
 * Any spelling of a country → the country record, or null.
 *
 * Handles ISO alpha-2/alpha-3, English names, common aliases, and the
 * "Lagos, Nigeria" shape that scraped listings love, where the country is the
 * last comma-separated part.
 */
export function lookupCountry(input: string | null | undefined): Country | null {
  if (!input) return null
  const raw = input.trim()
  if (!raw) return null

  const upper = raw.toUpperCase()
  if (upper.length === 2 && BY_CODE.has(upper)) return BY_CODE.get(upper) ?? null

  const key = simplify(raw)
  if (!key) return null

  const aliased = ALIASES[key]
  if (aliased !== undefined) return aliased ? (BY_CODE.get(aliased) ?? null) : null

  const named = BY_NAME.get(key)
  if (named) return BY_CODE.get(named) ?? null

  // "Lagos, Nigeria" / "Remote — Kenya": try each comma- or dash-separated part,
  // last first, since the country is conventionally last.
  const parts = raw.split(/[,–—|/]|\s-\s/).map((p) => p.trim()).filter(Boolean)
  if (parts.length > 1) {
    for (let i = parts.length - 1; i >= 0; i -= 1) {
      const match = lookupCountry(parts[i])
      if (match) return match
    }
  }

  return null
}

export function countryByCode(code: string | null | undefined): Country | null {
  if (!code) return null
  return BY_CODE.get(code.trim().toUpperCase()) ?? null
}

/** Sorted English names — for the onboarding picker and filter dropdowns. */
export function countryNames(): string[] {
  return COUNTRIES.map((c) => c.name).sort((a, b) => a.localeCompare(b))
}
