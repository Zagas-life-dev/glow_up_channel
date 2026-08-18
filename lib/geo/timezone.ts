/**
 * Country from the browser's timezone.
 *
 * The reason this exists: the CDN geo headers `/api/geo` reads only exist once
 * the app is deployed behind Vercel or Cloudflare. On localhost, on a plain
 * Node host, or behind a proxy that strips them, that endpoint correctly
 * reports "no idea" — and without this the feed would have no location at all
 * unless the user both granted GPS *and* had a profile.
 *
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` is available in every
 * browser, costs no network call, needs no permission, and is set from the OS
 * clock — so it tracks where the machine actually is. It is coarse (a timezone
 * is not a city) and wrong for anyone who leaves their laptop on home time, so
 * it ranks *below* the CDN lookup and far below the user's own profile.
 *
 * Also reads the region subtag of the browser locale ("pt-BR" → BR) as a last
 * resort, which catches users whose timezone is unmapped.
 */

import { countryByCode, type Country } from "@/lib/geo/countries"

// zone=CC, space-separated. Covers the canonical IANA zone for every country in
// `countries.ts`, plus the common legacy aliases browsers still report.
const PACKED = `
Africa/Abidjan=CI Africa/Accra=GH Africa/Addis_Ababa=ET Africa/Algiers=DZ
Africa/Asmara=ER Africa/Bamako=ML Africa/Bangui=CF Africa/Banjul=GM
Africa/Bissau=GW Africa/Blantyre=MW Africa/Brazzaville=CG Africa/Bujumbura=BI
Africa/Cairo=EG Africa/Casablanca=MA Africa/Ceuta=ES Africa/Conakry=GN
Africa/Dakar=SN Africa/Dar_es_Salaam=TZ Africa/Djibouti=DJ Africa/Douala=CM
Africa/El_Aaiun=EH Africa/Freetown=SL Africa/Gaborone=BW Africa/Harare=ZW
Africa/Johannesburg=ZA Africa/Juba=SS Africa/Kampala=UG Africa/Khartoum=SD
Africa/Kigali=RW Africa/Kinshasa=CD Africa/Lagos=NG Africa/Libreville=GA
Africa/Lome=TG Africa/Luanda=AO Africa/Lubumbashi=CD Africa/Lusaka=ZM
Africa/Malabo=GQ Africa/Maputo=MZ Africa/Maseru=LS Africa/Mbabane=SZ
Africa/Mogadishu=SO Africa/Monrovia=LR Africa/Nairobi=KE Africa/Ndjamena=TD
Africa/Niamey=NE Africa/Nouakchott=MR Africa/Ouagadougou=BF Africa/Porto-Novo=BJ
Africa/Sao_Tome=ST Africa/Tripoli=LY Africa/Tunis=TN Africa/Windhoek=NA
America/Adak=US America/Anchorage=US America/Antigua=AG
America/Argentina/Buenos_Aires=AR America/Argentina/Cordoba=AR
America/Argentina/Mendoza=AR America/Asuncion=PY America/Bahia=BR
America/Barbados=BB America/Belem=BR America/Belize=BZ America/Bogota=CO
America/Buenos_Aires=AR America/Cancun=MX America/Caracas=VE America/Chicago=US
America/Chihuahua=MX America/Costa_Rica=CR America/Cuiaba=BR America/Curacao=CW
America/Denver=US America/Detroit=US America/Dominica=DM America/Edmonton=CA
America/El_Salvador=SV America/Fortaleza=BR America/Grenada=GD
America/Guatemala=GT America/Guayaquil=EC America/Guyana=GY America/Halifax=CA
America/Havana=CU America/Indiana/Indianapolis=US America/Jamaica=JM
America/La_Paz=BO America/Lima=PE America/Los_Angeles=US America/Managua=NI
America/Manaus=BR America/Merida=MX America/Mexico_City=MX America/Monterrey=MX
America/Montevideo=UY America/Nassau=BS America/New_York=US America/Panama=PA
America/Paramaribo=SR America/Phoenix=US America/Port-au-Prince=HT
America/Port_of_Spain=TT America/Puerto_Rico=PR America/Recife=BR
America/Regina=CA America/Santiago=CL America/Santo_Domingo=DO
America/Sao_Paulo=BR America/St_Johns=CA America/St_Kitts=KN America/St_Lucia=LC
America/St_Vincent=VC America/Tegucigalpa=HN America/Tijuana=MX
America/Toronto=CA America/Vancouver=CA America/Winnipeg=CA
Asia/Aden=YE Asia/Almaty=KZ Asia/Amman=JO Asia/Ashgabat=TM Asia/Baghdad=IQ
Asia/Bahrain=BH Asia/Baku=AZ Asia/Bangkok=TH Asia/Beirut=LB Asia/Bishkek=KG
Asia/Brunei=BN Asia/Calcutta=IN Asia/Colombo=LK Asia/Damascus=SY Asia/Dhaka=BD
Asia/Dili=TL Asia/Dubai=AE Asia/Dushanbe=TJ Asia/Gaza=PS Asia/Hebron=PS
Asia/Ho_Chi_Minh=VN Asia/Hong_Kong=HK Asia/Jakarta=ID Asia/Jayapura=ID
Asia/Jerusalem=IL Asia/Kabul=AF Asia/Karachi=PK Asia/Kathmandu=NP
Asia/Kolkata=IN Asia/Kuala_Lumpur=MY Asia/Kuwait=KW Asia/Macau=MO
Asia/Makassar=ID Asia/Manila=PH Asia/Muscat=OM Asia/Nicosia=CY
Asia/Phnom_Penh=KH Asia/Pyongyang=KP Asia/Qatar=QA Asia/Riyadh=SA Asia/Saigon=VN
Asia/Seoul=KR Asia/Shanghai=CN Asia/Singapore=SG Asia/Taipei=TW
Asia/Tashkent=UZ Asia/Tbilisi=GE Asia/Tehran=IR Asia/Thimphu=BT Asia/Tokyo=JP
Asia/Ulaanbaatar=MN Asia/Urumqi=CN Asia/Vientiane=LA Asia/Yangon=MM
Asia/Yerevan=AM
Atlantic/Cape_Verde=CV Atlantic/Reykjavik=IS
Australia/Adelaide=AU Australia/Brisbane=AU Australia/Darwin=AU
Australia/Hobart=AU Australia/Melbourne=AU Australia/Perth=AU
Australia/Sydney=AU
Europe/Amsterdam=NL Europe/Andorra=AD Europe/Athens=GR Europe/Belgrade=RS
Europe/Berlin=DE Europe/Bratislava=SK Europe/Brussels=BE Europe/Bucharest=RO
Europe/Budapest=HU Europe/Chisinau=MD Europe/Copenhagen=DK Europe/Dublin=IE
Europe/Helsinki=FI Europe/Istanbul=TR Europe/Kaliningrad=RU Europe/Kiev=UA
Europe/Kyiv=UA Europe/Lisbon=PT Europe/Ljubljana=SI Europe/London=GB
Europe/Luxembourg=LU Europe/Madrid=ES Europe/Malta=MT Europe/Minsk=BY
Europe/Monaco=MC Europe/Moscow=RU Europe/Oslo=NO Europe/Paris=FR
Europe/Podgorica=ME Europe/Prague=CZ Europe/Riga=LV Europe/Rome=IT
Europe/San_Marino=SM Europe/Sarajevo=BA Europe/Skopje=MK Europe/Sofia=BG
Europe/Stockholm=SE Europe/Tallinn=EE Europe/Tirane=AL Europe/Vaduz=LI
Europe/Vatican=VA Europe/Vienna=AT Europe/Vilnius=LT Europe/Warsaw=PL
Europe/Zagreb=HR Europe/Zurich=CH
Indian/Antananarivo=MG Indian/Comoro=KM Indian/Mahe=SC Indian/Maldives=MV
Indian/Mauritius=MU
Pacific/Apia=WS Pacific/Auckland=NZ Pacific/Chuuk=FM Pacific/Efate=VU
Pacific/Fiji=FJ Pacific/Funafuti=TV Pacific/Guadalcanal=SB Pacific/Majuro=MH
Pacific/Nauru=NR Pacific/Noumea=NC Pacific/Palau=PW Pacific/Pohnpei=FM
Pacific/Port_Moresby=PG Pacific/Tahiti=PF Pacific/Tarawa=KI
Pacific/Tongatapu=TO
`

const ZONE_TO_COUNTRY = new Map<string, string>()
for (const entry of PACKED.trim().split(/\s+/)) {
  const [zone, code] = entry.split("=")
  if (zone && code) ZONE_TO_COUNTRY.set(zone.toLowerCase(), code)
}

/** Country for an IANA timezone name, or null if unmapped. */
export function countryFromTimeZone(timeZone: string | null | undefined): Country | null {
  if (!timeZone) return null
  const code = ZONE_TO_COUNTRY.get(timeZone.trim().toLowerCase())
  return code ? countryByCode(code) : null
}

/** Country from a BCP-47 tag's region subtag: "pt-BR" → Brazil. */
export function countryFromLanguageTag(tag: string | null | undefined): Country | null {
  if (!tag) return null
  const parts = tag.split(/[-_]/)
  for (const part of parts.slice(1)) {
    if (/^[A-Za-z]{2}$/.test(part)) {
      const country = countryByCode(part.toUpperCase())
      if (country) return country
    }
  }
  return null
}

/**
 * Best guess from the browser alone — no network, no permission prompt.
 *
 * Timezone first: it reflects where the machine is. The locale region is a
 * weaker signal (it often reflects where someone is *from*, not where they are)
 * so it only applies when the timezone is unmapped.
 */
export function countryFromBrowser(): Country | null {
  if (typeof Intl === "undefined") return null

  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    const fromZone = countryFromTimeZone(zone)
    if (fromZone) return fromZone
  } catch {
    // Intl unavailable or zone lookup threw — fall through to the locale.
  }

  if (typeof navigator === "undefined") return null
  for (const tag of navigator.languages ?? [navigator.language]) {
    const fromTag = countryFromLanguageTag(tag)
    if (fromTag) return fromTag
  }
  return null
}
