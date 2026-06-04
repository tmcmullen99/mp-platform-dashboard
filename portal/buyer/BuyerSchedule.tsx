// src/portal/buyer/BuyerSchedule.tsx
// Buyer schedule — tours and open houses for interested properties. Shares the
// ScheduleView engine; calendar push via .ics. (Two-way editing and open-house
// prompts build on this same schedule_events foundation.)
import ScheduleView from '@/portal/shared/ScheduleView'

export default function BuyerSchedule() {
  return (
    <ScheduleView
      audience="buyer"
      title="Your tour schedule."
      intro="Every tour and open house for the homes you're interested in. Add any of them to your calendar with one tap — and when a property you're tracking lists an open house, it'll show up here."
    />
  )
}
