// Live, interactive analytics dashboard for the 175 Huckleberry Drive campaign.
// Reads real aggregates from the public.huckleberry_public_analytics() RPC
// (safe rollups only — the raw sessions table stays locked). Renders count-up
// stats and an interactive US bubble map: hover or tap a metro to see its share.
//
// Used inline on the Luxury Listing service page as live proof of the marketing
// machine. Falls back to the last known real snapshot if the fetch fails so the
// section never renders empty.

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CountUp } from '@/components/public/motion'

const GOLD = '#b8965a'
const DASH_BG = '#0f1621'
const DASH_PANEL = '#161f2c'

type Metro = { name: string; views: number; pct: number; lat: number | null; lng: number | null }
type Analytics = {
  total_visits: number
  unique_visitors: number
  countries: number
  avg_minutes: number
  median_seconds: number
  metros: Metro[]
  devices: Record<string, number>
  daily: { day: string; visits: number }[]
}

// Real snapshot fallback (matches the live data at build time).
const FALLBACK: Analytics = {
  total_visits: 53,
  unique_visitors: 53,
  countries: 4,
  avg_minutes: 38,
  median_seconds: 15,
  metros: [
    { name: 'Bay Area', views: 23, pct: 43, lat: 37.26, lng: -121.99 },
    { name: 'Washington DC', views: 8, pct: 15, lat: 39.03, lng: -77.47 },
    { name: 'Dallas–Fort Worth', views: 7, pct: 13, lat: 32.78, lng: -96.81 },
    { name: 'Council Bluffs, Iowa', views: 3, pct: 6, lat: 41.26, lng: -95.86 },
    { name: 'Rexburg, Idaho', views: 2, pct: 4, lat: 43.83, lng: -111.79 },
    { name: 'New York Metro', views: 2, pct: 4, lat: 40.72, lng: -74.09 },
    { name: 'Boardman, Oregon', views: 2, pct: 4, lat: 45.84, lng: -119.7 },
    { name: 'Wilmington, Delaware', views: 1, pct: 2, lat: 39.74, lng: -75.58 },
  ],
  devices: { desktop: 43, mobile: 8, tablet: 1, unknown: 1 },
  daily: [
    { day: '2026-06-29', visits: 9 },
    { day: '2026-06-30', visits: 32 },
    { day: '2026-07-01', visits: 12 },
  ],
}

// Accurate continental-US outline (d3 albersUsa, us-atlas 10m, simplified) in a
// 975×610 canvas. Bubbles are placed with the matching Albers conic projection
// below so they land on real geography.
const US_PATH =
  "M793.7,604.2 800.5,597.7 805.1,600.1 796.4,604.1 793.7,604.2Z M777.4,558.3 779.8,562.4 783.3,563.1 779.5,562.7 777.4,558.3Z M601.4,92.4 610.1,85.8 613.6,84.4 606.6,91.7 601.4,92.4Z M793.7,604.2 800.5,597.7 805.1,600.1 796.4,604.1 793.7,604.2Z M777.4,558.3 779.8,562.4 783.3,563.1 779.5,562.7 777.4,558.3Z M601.4,92.4 610.1,85.8 613.6,84.4 606.6,91.7 601.4,92.4Z M576.5,511.5 579.9,510.5 582.6,512.0 580.0,513.9 576.5,511.5Z M77.2,374.3 81.1,376.9 81.3,379.5 78.9,378.3 77.2,374.3Z M75.8,388.7 75.3,384.3 78.3,390.0 75.8,388.7Z M56.6,355.0 60.5,357.4 63.6,357.8 59.5,358.6 56.6,355.0Z M95.0,31.0 98.5,27.7 99.3,30.6 95.8,31.6 99.6,36.9 98.7,39.7 95.0,31.0Z M91.0,21.2 94.0,22.9 95.9,19.9 98.1,21.8 95.6,26.6 91.0,21.2Z M66.0,23.6 68.6,19.3 76.9,27.1 88.9,30.7 92.0,35.6 94.6,32.9 95.3,39.1 91.0,42.7 91.1,40.4 83.8,48.2 85.7,48.9 87.7,48.6 84.6,47.6 96.6,39.0 92.4,52.4 90.1,50.6 89.1,55.2 87.6,51.3 87.0,53.6 89.4,55.7 96.1,51.9 96.5,44.8 101.5,38.7 100.5,32.6 100.0,36.3 98.2,34.1 100.9,30.4 97.5,26.4 102.4,24.4 100.0,14.4 210.5,41.7 326.0,60.5 404.4,67.8 484.0,70.8 510.8,70.8 510.7,62.2 513.7,62.5 518.6,76.5 530.7,78.8 531.5,81.3 543.7,78.5 549.1,80.2 553.4,87.3 558.1,84.0 565.8,90.7 576.0,85.7 578.1,88.9 597.6,89.5 577.1,101.1 558.9,119.4 561.1,121.7 578.3,114.6 577.0,122.8 580.2,120.5 585.0,123.2 606.9,111.9 621.7,99.8 625.9,101.1 618.6,106.1 615.6,116.6 620.1,111.5 618.2,114.7 624.0,112.5 633.1,120.8 641.8,121.6 651.8,115.2 666.6,111.5 670.0,111.0 669.8,117.6 676.5,118.3 683.4,114.8 682.5,123.0 689.0,126.3 693.2,123.6 694.8,127.1 681.2,128.8 676.5,126.6 675.7,131.6 662.9,127.3 660.4,130.5 651.3,131.9 646.8,140.0 647.3,133.5 641.4,138.5 639.9,135.4 626.9,162.1 628.1,166.1 641.6,147.6 635.5,165.1 630.8,195.3 634.7,218.8 640.4,229.8 644.9,231.4 655.1,224.2 659.8,210.2 658.9,198.0 652.4,184.3 654.9,159.7 664.8,147.2 666.1,157.6 667.3,145.5 674.2,141.9 670.5,138.3 671.7,133.8 684.6,135.1 698.8,141.7 702.4,162.5 694.1,177.1 699.0,180.2 702.4,172.1 709.9,167.7 715.2,172.4 721.5,191.2 720.9,199.8 718.5,202.2 719.1,198.7 716.3,199.4 708.5,222.3 725.6,227.4 737.5,223.2 776.4,192.1 780.3,186.1 774.8,176.0 783.8,171.7 809.0,169.2 819.3,161.1 816.9,154.4 819.3,152.5 814.7,150.3 815.0,146.4 832.3,124.4 886.1,110.5 887.8,103.3 891.8,101.2 894.8,103.1 900.0,86.1 897.7,79.7 899.1,67.5 905.9,47.6 912.5,52.3 919.7,45.9 929.7,49.7 938.7,79.9 944.6,79.9 946.1,87.0 949.5,89.7 952.0,88.1 957.1,94.8 955.0,99.4 951.5,99.6 950.2,105.6 946.8,104.3 943.8,110.3 941.4,109.7 942.2,113.0 938.9,113.7 938.1,109.7 935.4,111.3 937.3,119.8 931.0,110.1 928.5,112.6 930.2,122.9 927.1,126.5 924.8,124.8 919.7,132.2 918.1,130.9 911.2,143.3 909.6,155.2 914.3,158.4 910.0,168.6 915.0,169.0 921.7,177.7 928.8,175.1 923.6,170.0 926.7,169.7 930.1,174.2 931.0,176.8 930.6,179.8 929.7,177.6 924.7,179.9 922.7,182.4 916.1,187.6 920.0,183.3 917.9,179.4 915.4,185.3 911.8,187.6 910.5,184.0 909.1,188.3 910.5,183.2 906.7,181.2 907.6,190.7 884.7,198.4 874.2,207.9 873.0,213.0 894.7,199.6 899.5,201.8 903.1,198.9 895.5,205.8 883.4,214.4 871.7,219.3 869.2,216.4 866.5,221.8 871.5,221.5 873.2,237.3 864.4,258.6 862.9,253.8 850.4,249.5 849.4,244.3 848.6,245.5 849.3,249.3 854.8,258.0 861.3,262.7 863.8,271.1 854.2,304.2 852.6,296.6 855.5,283.6 851.6,285.3 850.2,275.4 848.9,278.3 847.7,275.6 847.6,278.7 844.0,277.6 841.8,271.3 846.4,271.3 840.3,269.8 841.6,263.9 839.0,266.3 839.4,261.7 840.1,262.9 841.9,262.2 839.3,259.3 842.6,248.9 838.5,255.8 836.8,254.0 836.3,258.8 833.5,257.8 838.0,262.7 836.2,268.8 843.8,284.2 829.9,277.6 826.1,279.8 827.5,273.7 824.5,278.6 825.8,280.9 829.6,278.7 831.9,282.6 845.9,287.3 845.1,294.0 833.9,287.2 846.4,294.9 848.0,300.4 845.1,298.9 846.9,301.5 844.5,302.6 849.0,307.5 841.9,303.8 836.6,304.6 841.3,304.4 846.3,310.5 854.9,308.3 868.4,331.7 859.7,318.9 856.8,316.9 862.3,326.4 854.4,322.8 857.3,325.6 850.1,326.4 853.3,327.6 848.7,330.8 845.5,325.1 847.4,332.7 858.0,329.2 859.9,336.6 861.9,328.7 865.7,336.1 859.7,344.3 853.4,344.7 850.9,342.0 853.1,340.5 850.1,342.1 851.6,344.7 843.0,343.4 854.2,347.1 849.6,355.0 846.2,354.7 850.5,355.8 855.0,351.4 858.7,352.1 855.9,360.3 853.1,360.2 856.1,360.9 857.5,357.7 862.3,349.7 862.9,350.0 856.1,362.4 846.8,362.6 838.0,370.5 833.4,384.1 825.4,384.5 818.2,389.5 811.0,407.9 806.9,408.6 800.6,419.0 792.2,422.9 793.0,426.9 787.4,428.4 789.5,429.8 781.4,442.3 781.3,454.4 778.3,460.2 782.8,475.7 792.8,496.3 806.1,513.6 806.6,521.9 822.1,549.0 823.8,574.5 821.8,573.7 820.9,583.7 824.0,577.8 823.8,580.3 821.6,586.6 817.9,591.7 816.1,593.1 819.7,586.1 806.9,589.7 800.6,577.8 791.9,575.4 786.5,564.2 779.2,558.4 780.4,552.0 777.3,557.8 765.2,540.9 767.0,541.0 770.6,531.9 767.9,533.5 764.7,529.8 767.4,534.3 765.1,539.2 761.9,533.4 761.9,510.2 758.9,505.1 754.0,506.1 739.3,489.9 727.4,487.4 726.4,492.2 711.8,498.0 714.2,499.9 720.1,496.0 713.7,500.8 707.4,499.8 705.7,493.6 688.8,486.2 655.2,492.0 659.1,490.2 653.4,481.7 651.6,490.2 628.5,490.7 618.5,499.8 621.9,502.7 625.7,497.6 628.2,501.3 631.1,499.7 627.3,507.2 622.5,508.2 626.3,513.4 636.6,517.3 628.8,523.6 631.1,517.7 619.8,515.3 612.6,521.1 608.1,515.4 599.9,522.5 591.5,518.6 594.3,516.3 587.7,513.7 584.2,507.9 579.1,508.6 580.0,505.9 572.8,507.9 576.1,511.6 572.0,512.8 547.7,508.4 522.2,518.2 527.7,514.4 522.1,514.3 522.5,508.6 518.4,510.5 519.9,519.4 514.6,523.9 523.1,518.8 482.1,546.6 473.5,558.1 470.0,570.2 474.2,592.2 470.1,581.5 471.3,581.0 469.5,574.0 470.4,563.6 476.2,551.0 489.0,539.7 484.3,542.0 482.5,539.9 479.3,546.3 473.6,547.0 477.4,548.1 474.1,553.0 467.5,552.3 472.7,555.8 469.4,564.3 465.0,566.0 469.2,565.7 468.5,580.3 474.4,595.1 468.2,597.4 464.1,593.5 451.8,592.1 434.9,584.3 427.9,569.9 427.1,557.7 412.0,540.8 405.1,521.7 391.5,506.3 373.4,502.6 366.4,505.5 356.8,521.6 350.7,519.8 330.0,503.6 324.4,481.9 297.7,452.6 264.2,448.2 262.9,458.4 208.2,450.5 142.3,411.7 145.1,407.0 99.5,401.7 96.5,382.3 87.9,371.0 82.1,369.3 81.7,362.5 71.0,358.1 65.0,349.3 48.8,344.3 46.5,340.5 49.8,328.1 46.4,325.7 46.9,320.1 34.8,296.1 39.2,282.7 31.4,274.3 33.3,260.8 39.3,270.3 35.8,257.2 38.9,254.7 35.7,253.7 33.2,259.9 26.2,253.5 28.5,247.8 20.1,229.8 24.0,209.2 18.9,193.1 31.3,172.9 32.8,139.9 45.4,120.7 63.8,68.9 71.0,70.1 63.0,67.6 65.5,59.8 64.7,65.5 65.6,65.8 69.7,59.0 65.9,57.2 66.3,53.6 70.7,53.9 67.5,50.7 65.8,52.9 66.0,23.6Z M184.9,573.1 186.8,569.5 195.7,580.1 189.6,577.5 192.0,581.3 184.9,573.1Z M180.3,567.2 185.4,564.3 188.7,566.7 183.9,568.5 183.4,573.2 180.3,567.2Z M174.6,555.9 180.2,559.2 179.6,565.9 178.9,563.1 174.6,555.9Z M173.9,564.8 177.2,563.4 180.8,572.7 175.5,568.5 173.9,564.8Z M169.1,561.4 171.5,557.8 177.1,562.7 173.0,564.7 169.1,561.4Z M99.1,569.9 103.4,565.2 105.0,567.5 104.7,569.1 99.1,569.9Z M93.3,575.4 99.0,570.7 104.5,573.3 96.0,580.4 97.5,577.1 95.4,579.6 93.3,575.4Z M305.4,584.5 310.2,579.2 309.7,572.5 322.2,578.3 331.9,590.3 317.3,598.1 313.8,603.1 308.4,598.5 305.4,584.5Z M291.6,557.9 293.9,555.4 306.8,562.4 298.5,565.6 291.6,557.9Z M283.9,558.3 287.4,558.0 289.3,560.4 285.9,562.1 283.9,558.3Z M278.6,553.8 279.6,551.2 291.4,552.6 287.8,555.0 278.6,553.8Z M258.1,543.0 264.7,540.0 271.4,549.4 261.5,549.3 258.1,543.0Z M226.1,532.6 231.0,528.2 236.6,530.2 233.3,536.3 226.1,532.6Z M44.2,547.5 49.5,546.7 51.0,551.2 48.4,552.0 44.2,547.5Z M31.3,600.8 36.7,599.1 36.1,596.7 40.1,598.2 31.3,600.8Z M50.7,504.5 63.9,499.5 65.2,503.9 74.3,503.7 71.4,502.5 69.7,498.2 72.6,501.9 73.2,497.6 66.5,495.6 59.4,484.4 61.5,480.8 69.5,480.0 75.3,471.4 89.3,465.1 92.5,466.1 91.5,468.6 94.0,466.3 96.2,469.2 101.4,468.7 102.4,471.8 121.6,473.8 126.0,471.7 132.9,474.4 147.3,547.1 154.5,545.1 163.6,554.8 169.4,545.9 191.6,565.6 200.1,566.6 202.9,572.6 201.4,577.9 197.6,570.6 198.1,575.1 194.1,570.7 192.8,573.7 192.2,568.8 191.1,571.8 189.2,570.5 190.4,567.2 170.3,549.6 174.7,557.7 167.1,553.4 170.3,557.4 168.0,559.3 153.0,552.1 153.4,547.9 151.0,551.3 140.6,550.0 134.0,553.4 135.8,551.2 132.3,548.5 125.3,550.6 128.4,547.8 123.1,544.2 119.2,547.1 119.0,545.0 118.7,549.7 121.1,552.9 120.3,553.9 114.9,555.0 114.7,552.9 113.7,556.8 105.8,561.0 108.7,555.9 105.2,556.2 106.7,548.5 115.5,546.8 111.6,544.8 113.2,542.0 106.3,546.2 96.2,559.5 99.6,563.5 95.8,569.3 77.7,581.9 76.7,585.8 64.1,589.7 62.6,587.5 60.6,591.3 54.8,591.0 55.2,594.1 46.7,594.8 62.0,585.2 68.7,586.9 68.6,583.0 80.9,573.4 84.4,563.1 79.6,565.0 78.4,561.8 76.4,566.6 71.0,560.7 64.7,564.1 63.8,551.1 56.6,552.7 52.6,546.7 54.7,542.9 51.8,535.9 59.6,526.0 64.3,527.9 71.5,525.2 71.0,517.8 73.7,515.7 72.5,514.0 66.5,518.0 65.6,515.4 55.2,514.1 55.9,508.7 50.7,504.5Z M24.9,603.0 29.3,599.1 31.9,599.3 28.0,602.2 24.9,603.0Z M34.4,517.8 39.4,517.9 44.8,522.4 40.8,524.5 34.4,517.8Z M-6.2,601.2 0.0,599.9 0.7,600.9 -2.0,602.5 -6.2,601.2Z M927.7,186.8 931.5,184.3 933.0,186.0 930.7,187.6 927.7,186.8Z M918.3,188.3 921.3,184.4 924.2,185.1 924.6,186.7 918.3,188.3Z M871.3,344.1 863.6,348.4 870.9,343.2 868.6,332.1 871.3,344.1Z"

// d3.geoAlbers lower-48 conic, scaled to the us-atlas albers-10m canvas
// (scale 1300, translate [487.5, 305]). Covers every US metro we plot.
function project(lng: number, lat: number): { x: number; y: number } | null {
  const rad = Math.PI / 180
  const phi0 = 29.5 * rad
  const phi1 = 45.5 * rad
  const lat0 = 37.5 * rad
  const lon0 = -96 * rad
  const n = 0.5 * (Math.sin(phi0) + Math.sin(phi1))
  const C = Math.cos(phi0) ** 2 + 2 * n * Math.sin(phi0)
  const rho0 = Math.sqrt(C - 2 * n * Math.sin(lat0)) / n
  const lam = lng * rad - lon0
  const phi = lat * rad
  const inner = C - 2 * n * Math.sin(phi)
  if (inner < 0) return null // outside the projectable range (e.g. non-US)
  const rho = Math.sqrt(inner) / n
  const theta = n * lam
  const x = 487.5 + 1300 * (rho * Math.sin(theta))
  const y = 305 - 1300 * (rho0 - rho * Math.cos(theta))
  // Clamp anything landing well outside the US canvas (foreign metros).
  if (x < -20 || x > 995 || y < -20 || y > 630) return null
  return { x, y }
}

export default function LiveHuckleberryDashboard() {
  const [data, setData] = useState<Analytics>(FALLBACK)
  const [live, setLive] = useState(false)
  const [active, setActive] = useState<number>(0) // index of focused metro
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    ;(async () => {
      const { data: rpc, error } = await supabase.rpc('huckleberry_public_analytics')
      if (!mounted.current) return
      if (!error && rpc) {
        setData(rpc as Analytics)
        setLive(true)
      }
    })()
    return () => {
      mounted.current = false
    }
  }, [])

  const metros = data.metros || []
  const maxViews = Math.max(1, ...metros.map((m) => m.views))
  const focused = metros[active] || metros[0]

  return (
    <div
      className="rounded-[22px] overflow-hidden"
      style={{ background: DASH_BG, border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 40px 110px -50px rgba(0,0,0,0.7)' }}
    >
      {/* header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center mp-serif text-sm font-bold"
            style={{ background: GOLD, color: '#1a1205' }}
          >
            P
          </div>
          <div>
            <div className="mp-mono text-[9px] tracking-[0.24em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              PRUGH REAL ESTATE
            </div>
            <div className="mp-serif text-white text-lg leading-tight">175 Huckleberry Drive</div>
          </div>
        </div>
        <div
          className="mp-mono text-[9px] tracking-[0.16em] px-2.5 py-1 rounded inline-flex items-center gap-1.5"
          style={{ background: 'rgba(184,150,90,0.15)', color: GOLD }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: live ? '#4ade80' : GOLD }}
          />
          {live ? 'LIVE DATA' : 'SNAPSHOT'} · CAMPAIGN TO DATE
        </div>
      </div>

      {/* stat row — live count-ups */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px px-6">
        {[
          { k: 'TOTAL VISITS', v: data.total_visits, s: `${data.unique_visitors} unique` },
          { k: 'AVG. TIME ON SITE', v: data.avg_minutes, suffix: 'm', s: `median ${data.median_seconds}s` },
          { k: 'BUYER METROS', v: metros.length, s: `${data.countries} countries` },
          { k: 'TOP MARKET', raw: `${focused?.pct ?? 0}%`, s: focused?.name ?? '—' },
        ].map((s) => (
          <div key={s.k} className="rounded-lg p-4" style={{ background: DASH_PANEL }}>
            <div className="mp-mono text-[8.5px] tracking-[0.16em]" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {s.k}
            </div>
            <div className="mp-serif text-2xl mt-1 text-white">
              {s.raw ? s.raw : <CountUp value={s.v as number} suffix={s.suffix || ''} />}
            </div>
            <div className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {s.s}
            </div>
          </div>
        ))}
      </div>

      {/* interactive map + metro list */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4 p-6">
        {/* MAP */}
        <div className="rounded-xl p-4" style={{ background: DASH_PANEL }}>
          <div className="flex items-center justify-between">
            <div className="text-white text-sm font-semibold">Where buyers are watching from</div>
            <div className="mp-mono text-[9px] tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              HOVER OR TAP A BUBBLE
            </div>
          </div>

          <svg viewBox="0 0 975 610" className="w-full mt-2" style={{ maxHeight: 340 }}>
            {/* accurate continental US silhouette */}
            <path
              d={US_PATH}
              fill="rgba(255,255,255,0.045)"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
            {/* connective lines from focused metro to others (subtle network feel) */}
            {focused?.lat != null &&
              focused?.lng != null &&
              metros.map((m, i) => {
                if (i === active || m.lat == null || m.lng == null) return null
                const a = project(focused.lng!, focused.lat!)
                const b = project(m.lng!, m.lat!)
                if (!a || !b) return null
                return (
                  <line
                    key={`l-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={GOLD}
                    strokeWidth="1"
                    opacity={0.14}
                  />
                )
              })}
            {/* bubbles */}
            {metros.map((m, i) => {
              if (m.lat == null || m.lng == null) return null
              const pt = project(m.lng, m.lat)
              if (!pt) return null
              const { x, y } = pt
              const r = 10 + (m.views / maxViews) * 34
              const isActive = i === active
              return (
                <g
                  key={m.name}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <circle cx={x} cy={y} r={r} fill={GOLD} opacity={isActive ? 0.5 : 0.28} />
                  <circle cx={x} cy={y} r={Math.max(4, r * 0.34)} fill={GOLD} opacity={0.95} />
                  {isActive && (
                    <circle cx={x} cy={y} r={r + 5} fill="none" stroke={GOLD} strokeWidth="1.5" opacity={0.8} />
                  )}
                </g>
              )
            })}
          </svg>

          {/* focused metro readout */}
          {focused && (
            <div className="mt-1 flex items-baseline justify-between px-1">
              <div className="text-white text-sm font-semibold">{focused.name}</div>
              <div className="mp-mono text-xs" style={{ color: GOLD }}>
                {focused.views} visits · {focused.pct}% of all traffic
              </div>
            </div>
          )}
        </div>

        {/* METRO LIST */}
        <div className="rounded-xl p-4" style={{ background: DASH_PANEL }}>
          <div className="text-white text-sm font-semibold">Top metros</div>
          <div className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
            By share of total site visits
          </div>
          <div className="flex flex-col gap-1.5">
            {metros.map((m, i) => (
              <button
                key={m.name}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors"
                style={{ background: i === active ? 'rgba(184,150,90,0.12)' : 'transparent' }}
              >
                <span className="mp-mono text-[10px] w-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {i + 1}
                </span>
                <span className="text-white text-[12.5px] flex-1 truncate">{m.name}</span>
                <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: GOLD }} />
                </div>
                <span className="mp-mono text-[11px] w-8 text-right" style={{ color: GOLD }}>
                  {m.pct}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
