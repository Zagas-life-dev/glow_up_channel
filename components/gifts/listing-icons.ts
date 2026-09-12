/**
 * One icon per listing type, shared by everything that renders a listing gift.
 *
 * Kept in its own module because the card, the popup and the detail page all
 * need the same mark — three private copies would drift, and a member should
 * recognise the same symbol on the popup and on the page it takes them to.
 */

import type { IconType } from "react-icons"
import {
  RiBookOpenLine,
  RiBriefcaseLine,
  RiCalendarEventLine,
  RiCompass3Line,
} from "react-icons/ri"
import type { GiftListingType } from "@/lib/gifts/types"

export const GIFT_LISTING_ICONS: Record<GiftListingType, IconType> = {
  opportunity: RiCompass3Line,
  event: RiCalendarEventLine,
  job: RiBriefcaseLine,
  resource: RiBookOpenLine,
}
