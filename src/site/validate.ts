import { PRIMITIVES } from './primitives'
import type { SiteTree, SiteNode } from './types'

export type ValidationResult = { errors: string[]; warnings: string[] }

function validateNode(node: SiteNode, path: string, errors: string[], warnings: string[]) {
  const def = PRIMITIVES[node.type]
  if (!def) {
    errors.push(`${path}: unknown block type "${node.type}"`)
    return
  }
  const props = node.props || {}
  for (const spec of def.props) {
    const v = props[spec.key]
    const empty = v === undefined || v === null || v === ''
    if (spec.required && empty) {
      errors.push(`${path} (${def.label}): "${spec.label}" is required`)
      continue
    }
    if (empty) continue
    switch (spec.type) {
      case 'number':
        if (typeof v !== 'number' && !(typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))))
          errors.push(`${path}: "${spec.label}" must be a number`)
        break
      case 'boolean':
        if (typeof v !== 'boolean') errors.push(`${path}: "${spec.label}" must be true/false`)
        break
      case 'enum':
        if (spec.options && (typeof v !== 'string' || !spec.options.includes(v)))
          errors.push(`${path}: "${spec.label}" must be one of ${spec.options.join(', ')}`)
        break
      case 'string[]':
        if (!Array.isArray(v)) errors.push(`${path}: "${spec.label}" must be a list`)
        else if (spec.options) {
          for (const item of v)
            if (!spec.options.includes(item as string)) errors.push(`${path}: "${spec.label}" has an invalid value "${item}"`)
        }
        break
      default:
        if (typeof v !== 'string') errors.push(`${path}: "${spec.label}" must be text`)
    }
  }
  // Soft guardrail: a lead form with no CRM token still saves, but warns.
  if (node.type === 'lead_form' && !props.token) {
    warnings.push(`${path}: this lead form isn't connected to your CRM yet`)
  }
  if (node.children) node.children.forEach((c, i) => validateNode(c, `${path} › ${i + 1}`, errors, warnings))
}

export function validateTree(tree: SiteTree): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const slugs = new Set<string>()

  for (const page of tree.pages || []) {
    if (slugs.has(page.slug)) errors.push(`Duplicate page address "${page.slug || '(home)'}"`)
    slugs.add(page.slug)
    ;(page.sections || []).forEach((n, i) => validateNode(n, `${page.title || page.slug || 'Home'} › section ${i + 1}`, errors, warnings))
  }

  for (const item of tree.nav || []) {
    const resolves = !!item.url || (item.slug !== undefined && slugs.has(item.slug))
    if (!resolves) errors.push(`Nav item "${item.label}" points to a page that doesn't exist`)
  }

  return { errors, warnings }
}

// A tree can be saved as a draft anytime; it can only be PUBLISHED when valid.
export function isPublishable(tree: SiteTree): boolean {
  return validateTree(tree).errors.length === 0
}
