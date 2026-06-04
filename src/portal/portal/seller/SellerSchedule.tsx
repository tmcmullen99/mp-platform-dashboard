// src/portal/seller/SellerSchedule.tsx
// Seller schedule — listing-side events (market day, open houses, private
// showings, offer day). Read-only for the client; the agent creates/edits.
// Per-showing notes posted by the agent surface here. Calendar push via .ics.
import ScheduleView from '@/portal/shared/ScheduleView'

export default function SellerSchedule() {
  return (
    <ScheduleView
      audience="seller"
      title="Your listing calendar."
      intro="Market day, open houses, private showings, and offer day — everything on the path to sold. Your agent manages the calendar; after each showing they'll post a note here so you know how it went."
    />
  )
}
