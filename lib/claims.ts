/* Track-record claims, in one place (Tim, 28 Sep 2026).
 *
 *   Represented: $1.3B+          (replaces "Sold $115M", "$100M+ in transactions/volume")
 *   Projects Completed: 25+      (replaces "100s of clients" / "Clients Served 100s")
 *
 * The homepage and core pages are JSON rows (site_home_content, site_core_pages) edited in
 * the Site editor. Those rows still hold the old figures, so every page that renders one runs
 * it through claims() first. It is idempotent: once a row is edited to the new wording in the
 * Site editor, this does nothing to it. Hard-coded copy in the code uses the constants below.
 */
export const REPRESENTED = '$1.3B+'
export const PROJECTS = '25+'

type Stat = { label?: unknown; value?: unknown }

function fixStat(s: Stat): Stat {
  const label = String(s.label ?? ''), value = String(s.value ?? '')
  const money = /\$\s?\d[\d.,]*\s?[MB]\+?/i.test(value)
  if (money && /sold|transactions|sales volume|volume|closed/i.test(label)) return { ...s, label: 'Represented', value: REPRESENTED }
  if (/clients served|clients/i.test(label) || /^100s$/i.test(value.trim())) return { ...s, label: 'Projects Completed', value: PROJECTS }
  if (/^projects$/i.test(label.trim())) return { ...s, label: 'Projects Completed' }
  return s
}

function fixText(t: string): string {
  return t
    .replace(/over \$1[01][05]M\+? in (?:closed )?transactions/gi, `over ${REPRESENTED.replace('+', '')} in property represented`)
    .replace(/closing \$1[01][05]M\+? in residential transactions/gi, `representing ${REPRESENTED} in residential property`)
    .replace(/\$1[01][05]M\+? in (?:closed )?(?:transactions|volume|sales)/gi, `${REPRESENTED} represented`)
    .replace(/\$1[01][05]M\+? (?:sold|closed)/gi, `${REPRESENTED} represented`)
    .replace(/\bserved (?:100s|hundreds) of clients\b/gi, `completed ${PROJECTS} projects`)
    .replace(/\b(?:100s|hundreds) of clients\b/gi, `${PROJECTS} projects completed`)
}

export function claims<T>(node: T): T {
  if (typeof node === 'string') return fixText(node) as unknown as T
  if (Array.isArray(node)) {
    /* Two old stats can map to the same new one ("Homes Sold" and "Sales Volume"): keep the first. */
    const seen = new Set<string>()
    return node.map(n => claims(n)).filter(n => {
      if (!n || typeof n !== 'object' || !('label' in (n as object))) return true
      const k = String((n as Stat).label) + '|' + String((n as Stat).value)
      if (seen.has(k)) return false
      seen.add(k); return true
    }) as unknown as T
  }
  if (node && typeof node === 'object') {
    const o = node as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(o)) out[k] = claims(o[k])
    return ('label' in out && 'value' in out ? fixStat(out as Stat) : out) as unknown as T
  }
  return node
}
