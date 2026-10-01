//
// Fake data and domain logic for the Cleanse prototype.
//
// This file stands in for the .NET backend. In the real service an overnight
// process runs the rules and upserts issues, deciding whether each one is
// active or inactive. Users never control that - they only move an issue
// through its workflow (the substatus).
//
// Nothing in here is real. Phone numbers use the Ofcom ranges reserved for
// fiction (01632 960xxx and 07700 900xxx) and every email address uses the
// reserved .example domain.
//

const ISSUES_PER_PAGE = 20

// The rules the overnight process runs. Each one compares a field held in CTS
// against the same field held in SAM.
const rules = [
  {
    number: 1,
    code: 'EMAIL_MISMATCH',
    description: 'Email address differs between CTS and SAM'
  },
  {
    number: 2,
    code: 'PHONE_MISMATCH',
    description: 'Phone number differs between CTS and SAM'
  },
  {
    number: 3,
    code: 'CTS_EMAIL_MISSING',
    description: 'No email address held in CTS'
  },
  {
    number: 4,
    code: 'SAM_EMAIL_MISSING',
    description: 'No email address held in SAM'
  },
  {
    number: 5,
    code: 'CTS_PHONE_MISSING',
    description: 'No phone number held in CTS'
  },
  {
    number: 6,
    code: 'SAM_PHONE_MISSING',
    description: 'No phone number held in SAM'
  },
  {
    number: 7,
    code: 'EMAIL_INVALID_FORMAT',
    description: 'Email address held in CTS is not a valid format'
  },
  {
    number: 8,
    code: 'MULTIPLE_EMAILS',
    description: 'More than one email address held in CTS'
  }
]

const users = [
  { id: 'jo.taylor', name: 'Jo Taylor' },
  { id: 'alex.morgan', name: 'Alex Morgan' },
  { id: 'priya.shah', name: 'Priya Shah' },
  { id: 'tom.jenkins', name: 'Tom Jenkins' },
  { id: 'sarah.okafor', name: 'Sarah Okafor' }
]

// Who is signed in. A real service would get this from the CDP platform.
const currentUser = users[0]

// Status is owned by the backend. Substatus is owned by the user.
const statuses = [
  { id: 'active', name: 'Active', colour: 'teal' },
  { id: 'inactive', name: 'Inactive', colour: 'grey' }
]

const substatuses = [
  { id: 'todo', name: 'To do', colour: 'blue' },
  { id: 'in-progress', name: 'In progress', colour: 'purple' },
  { id: 'resolved', name: 'Resolved', colour: 'green' },
  { id: 'suppressed', name: 'Suppressed', colour: 'yellow' },
  { id: 'ignored', name: 'Ignored', colour: 'grey' }
]

// How an issue was put right. Captured when a user resolves it.
const resolutions = [
  { id: 'updated-cts', name: 'Updated CTS to match SAM' },
  { id: 'updated-sam', name: 'Updated SAM to match CTS' },
  {
    id: 'contacted-keeper',
    name: 'Contacted the keeper for the correct details'
  },
  {
    id: 'no-change-needed',
    name: 'No change needed - both records are correct'
  }
]

const ignoreReasons = [
  { id: 'not-a-real-difference', name: 'Not a real difference' },
  { id: 'holding-closed', name: 'Holding is no longer trading' },
  { id: 'duplicate', name: 'Duplicate of another issue' },
  { id: 'other', name: 'Other' }
]

// How long a user can suppress an issue for. Suppression is always temporary -
// to make an issue go away for good a user ignores it instead.
const suppressionPeriods = [
  { id: '7', name: '7 days' },
  { id: '30', name: '30 days' },
  { id: '90', name: '90 days' },
  { id: '180', name: '6 months' }
]

const farms = [
  'Brook Farm',
  'Hollow Tree Farm',
  'Marsh End',
  'High Ridge Farm',
  'Oakley Grange',
  'Pentre Mawr',
  'Glebe Farm',
  'Nether Barton',
  'Ty Coch',
  'Westcombe',
  'Lark Rise',
  'Stonewell',
  'Fieldhead',
  'Byre House',
  'Cold Harbour',
  'Dairy Leys',
  'Thorn Bank',
  'Quarry Hill',
  'Eastfield',
  'Mill Race'
]

const firstNames = [
  'Megan',
  'Owain',
  'Harriet',
  'Callum',
  'Nia',
  'Edward',
  'Ffion',
  'Gareth',
  'Imogen',
  'Rhys',
  'Bethan',
  'Duncan'
]

const surnames = [
  'Ellison',
  'Pritchard',
  'Hargreaves',
  'Lowther',
  'Maddox',
  'Trelawney',
  'Ferris',
  'Blundell',
  'Kirkbride',
  'Vaughan',
  'Ashcroft',
  'Pennington'
]

// A seeded generator so the prototype shows the same issues every time it
// restarts. Research sessions are much easier when the data does not move.
function createRandom(seed) {
  let state = seed
  return function random() {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function pad(value, length) {
  return String(value).padStart(length, '0')
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z]/g, '')
}

function addDays(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function generateIssues() {
  const random = createRandom(20260401)
  const pick = (list) => list[Math.floor(random() * list.length)]
  const between = (min, max) => min + Math.floor(random() * (max - min + 1))

  const generated = []

  for (let index = 0; index < 124; index++) {
    const rule = pick(rules)
    const firstName = pick(firstNames)
    const surname = pick(surnames)
    const farm = pick(farms)

    const domain = `${slugify(farm)}.example`
    const primaryEmail = `${firstName[0].toLowerCase()}.${surname.toLowerCase()}@${domain}`
    const altEmail = `${slugify(surname)}.${slugify(firstName)}@mailbox.example`
    const landline = `01632 960${pad(between(0, 999), 3)}`
    const mobile = `07700 900${pad(between(0, 999), 3)}`

    let ctsEmails = [primaryEmail]
    let samEmails = [primaryEmail]
    let ctsPhone = landline
    let samPhone = landline

    // Build the contact details so they actually demonstrate the rule that
    // flagged them. Without this the comparison screen makes no sense.
    switch (rule.code) {
      case 'EMAIL_MISMATCH':
        samEmails = [altEmail]
        break
      case 'PHONE_MISMATCH':
        samPhone = mobile
        break
      case 'CTS_EMAIL_MISSING':
        ctsEmails = []
        break
      case 'SAM_EMAIL_MISSING':
        samEmails = []
        break
      case 'CTS_PHONE_MISSING':
        ctsPhone = ''
        break
      case 'SAM_PHONE_MISSING':
        samPhone = ''
        break
      case 'EMAIL_INVALID_FORMAT':
        ctsEmails = [primaryEmail.replace('@', ' at ')]
        break
      case 'MULTIPLE_EMAILS':
        ctsEmails = [primaryEmail, altEmail]
        break
    }

    const issue = {
      id: `CLN-${1000 + index}`,
      ruleNumber: rule.number,
      ruleCode: rule.code,
      errorDescription: rule.description,
      cph: `${pad(between(1, 99), 2)}/${pad(between(1, 999), 3)}/${pad(between(1, 9999), 4)}`,
      holding: farm,
      ctsEmails,
      samEmails,
      ctsPhone,
      samPhone,
      status: random() < 0.88 ? 'active' : 'inactive',
      substatus: 'todo',
      suppressionExpiresAt: null,
      assignedTo: null,
      firstDetectedAt: addDays(-between(1, 120)),
      lastCheckedAt: addDays(-1),
      history: []
    }

    // Seed a plausible spread of workflow state so filters have something to
    // bite on from the very first screen.
    const roll = random()
    if (roll > 0.93) {
      issue.substatus = 'resolved'
      issue.assignedTo = pick(users).id
    } else if (roll > 0.88) {
      issue.substatus = 'ignored'
      issue.assignedTo = pick(users).id
    } else if (roll > 0.82) {
      issue.substatus = 'suppressed'
      issue.suppressionExpiresAt = addDays(between(5, 90))
      issue.assignedTo = pick(users).id
    } else if (roll > 0.62) {
      issue.substatus = 'in-progress'
      issue.assignedTo = pick(users).id
    } else if (roll > 0.42) {
      issue.assignedTo = pick(users).id
    }

    issue.history.push({
      at: issue.firstDetectedAt,
      by: 'Cleanse',
      text: `Issue raised by rule ${issue.ruleNumber} (${issue.ruleCode})`
    })

    generated.push(issue)
  }

  // One issue whose suppression has already lapsed, so the automatic return to
  // "To do" can be demonstrated.
  const lapsed = generated[7]
  lapsed.substatus = 'suppressed'
  lapsed.suppressionExpiresAt = addDays(-3)
  lapsed.assignedTo = null

  return generated
}

const issues = generateIssues()

function getRule(code) {
  return rules.find((rule) => rule.code === code)
}

function getUser(id) {
  return users.find((user) => user.id === id)
}

function getUserName(id) {
  const user = getUser(id)
  return user ? user.name : 'Unassigned'
}

function getSubstatus(id) {
  return substatuses.find((substatus) => substatus.id === id)
}

function getStatus(id) {
  return statuses.find((status) => status.id === id)
}

// Merge the backend issue with whatever the user has done to it this session.
// Anything the user changes lives in session data, so /clear-data puts the
// prototype back to its starting state.
function applyWorkflow(issue, workflow) {
  const changes = (workflow || {})[issue.id] || {}

  const merged = {
    ...issue,
    ...changes,
    history: [...issue.history, ...(changes.history || [])]
  }

  // A suppression that has run out sends the issue back to the top of the
  // queue. The backend would do this; here we work it out on read.
  if (
    merged.substatus === 'suppressed' &&
    merged.suppressionExpiresAt &&
    new Date(merged.suppressionExpiresAt) <= new Date()
  ) {
    merged.substatus = 'todo'
    merged.suppressionLapsedAt = merged.suppressionExpiresAt
    merged.suppressionExpiresAt = null
  }

  merged.assignedToName = merged.assignedTo
    ? getUserName(merged.assignedTo)
    : null
  merged.isAssignedToCurrentUser = merged.assignedTo === currentUser.id
  merged.substatusDetail = getSubstatus(merged.substatus)
  merged.statusDetail = getStatus(merged.status)
  merged.comparison = compareSources(merged)
  merged.differenceCount = merged.comparison.filter(
    (row) => row.result !== 'match'
  ).length

  return merged
}

function listIssues(workflow) {
  return issues.map((issue) => applyWorkflow(issue, workflow))
}

function findIssue(id, workflow) {
  const issue = issues.find((candidate) => candidate.id === id)
  return issue ? applyWorkflow(issue, workflow) : undefined
}

// The heart of the service: put the two sources side by side and say how they
// differ.
function compareSources(issue) {
  return [
    buildComparisonRow('Email address', issue.ctsEmails, issue.samEmails),
    buildComparisonRow(
      'Phone number',
      issue.ctsPhone ? [issue.ctsPhone] : [],
      issue.samPhone ? [issue.samPhone] : []
    )
  ]
}

function buildComparisonRow(label, ctsValues, samValues) {
  const cts = ctsValues.filter(Boolean)
  const sam = samValues.filter(Boolean)

  let result = 'match'
  if (cts.length === 0 && sam.length === 0) {
    result = 'missing-both'
  } else if (cts.length === 0) {
    result = 'missing-cts'
  } else if (sam.length === 0) {
    result = 'missing-sam'
  } else if (cts.join('|').toLowerCase() !== sam.join('|').toLowerCase()) {
    result = 'different'
  }

  const labels = {
    match: { text: 'Match', colour: 'green' },
    different: { text: 'Different', colour: 'red' },
    'missing-cts': { text: 'Missing from CTS', colour: 'orange' },
    'missing-sam': { text: 'Missing from SAM', colour: 'orange' },
    'missing-both': { text: 'Missing from both', colour: 'orange' }
  }

  return {
    label,
    cts,
    sam,
    result,
    tag: labels[result]
  }
}

function toArray(value) {
  if (value === undefined || value === null || value === '') {
    return []
  }
  return Array.isArray(value) ? value : [value]
}

// Read filters from the query string. The first visit to the list gets a
// sensible working queue rather than all 124 issues at once.
function readFilters(query) {
  const hasFiltered = query.filtered === 'true'

  const filters = {
    status: hasFiltered ? toArray(query.status) : ['active'],
    substatus: hasFiltered ? toArray(query.substatus) : ['todo', 'in-progress'],
    rule: query.rule || 'all',
    assigned: query.assigned || 'all',
    search: (query.search || '').trim(),
    page: Math.max(1, parseInt(query.page, 10) || 1),
    isDefault: !hasFiltered
  }

  return filters
}

function filterIssues(list, filters) {
  return list.filter((issue) => {
    // An empty selection means "do not filter on this", which avoids the trap
    // of a user unticking everything and seeing nothing.
    if (filters.status.length > 0 && !filters.status.includes(issue.status)) {
      return false
    }

    if (
      filters.substatus.length > 0 &&
      !filters.substatus.includes(issue.substatus)
    ) {
      return false
    }

    if (filters.rule !== 'all' && issue.ruleCode !== filters.rule) {
      return false
    }

    if (filters.assigned === 'me' && issue.assignedTo !== currentUser.id) {
      return false
    }

    if (filters.assigned === 'unassigned' && issue.assignedTo) {
      return false
    }

    const namedUser = !['all', 'me', 'unassigned'].includes(filters.assigned)
    if (namedUser && issue.assignedTo !== filters.assigned) {
      return false
    }

    if (filters.search) {
      const search = filters.search.toLowerCase()
      const haystack = `${issue.cph} ${issue.id} ${issue.holding}`.toLowerCase()
      if (!haystack.includes(search)) {
        return false
      }
    }

    return true
  })
}

function countActiveFilters(filters) {
  let count = 0
  if (filters.status.length > 0) count += filters.status.length
  if (filters.substatus.length > 0) count += filters.substatus.length
  if (filters.rule !== 'all') count += 1
  if (filters.assigned !== 'all') count += 1
  if (filters.search) count += 1
  return count
}

// Build the query string for a given page, keeping the current filters.
function buildQuery(filters, page) {
  const parts = ['filtered=true']

  filters.status.forEach((value) =>
    parts.push(`status=${encodeURIComponent(value)}`)
  )
  filters.substatus.forEach((value) =>
    parts.push(`substatus=${encodeURIComponent(value)}`)
  )

  if (filters.rule !== 'all')
    parts.push(`rule=${encodeURIComponent(filters.rule)}`)
  if (filters.assigned !== 'all')
    parts.push(`assigned=${encodeURIComponent(filters.assigned)}`)
  if (filters.search) parts.push(`search=${encodeURIComponent(filters.search)}`)
  if (page > 1) parts.push(`page=${page}`)

  return `?${parts.join('&')}`
}

function paginate(list, filters) {
  const totalPages = Math.max(1, Math.ceil(list.length / ISSUES_PER_PAGE))
  const page = Math.min(filters.page, totalPages)
  const start = (page - 1) * ISSUES_PER_PAGE

  return {
    page,
    totalPages,
    total: list.length,
    from: list.length === 0 ? 0 : start + 1,
    to: Math.min(start + ISSUES_PER_PAGE, list.length),
    items: list.slice(start, start + ISSUES_PER_PAGE)
  }
}

// Turn the page numbers into the shape govukPagination expects, collapsing
// long runs of pages into ellipses.
function buildPaginationModel(pagination, filters) {
  if (pagination.totalPages < 2) {
    return null
  }

  const { page, totalPages } = pagination
  const numbers = new Set([1, totalPages, page, page - 1, page + 1])
  const visible = [...numbers]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b)

  const items = []
  let previousNumber = 0

  visible.forEach((number) => {
    if (previousNumber && number - previousNumber > 1) {
      items.push({ ellipsis: true })
    }
    items.push({
      number,
      href: buildQuery(filters, number),
      current: number === page
    })
    previousNumber = number
  })

  return {
    previous: page > 1 ? { href: buildQuery(filters, page - 1) } : null,
    next: page < totalPages ? { href: buildQuery(filters, page + 1) } : null,
    items
  }
}

function countsBySubstatus(list) {
  const counts = {}
  substatuses.forEach((substatus) => {
    counts[substatus.id] = 0
  })
  list.forEach((issue) => {
    counts[issue.substatus] = (counts[issue.substatus] || 0) + 1
  })
  return counts
}

// Record a change the user has made. Everything is written to session data so
// the backend fixture is never mutated.
//
// The kit builds session data with Object.assign({}, defaults, session), so on
// a session's very first request data.workflow is the same object as the one
// in session-data-defaults. Rebuilding it here rather than mutating in place
// stops one user's changes leaking into everybody else's starting state.
function updateWorkflow(session, id, changes, historyText) {
  const workflow = { ...(session.data.workflow || {}) }
  const existing = workflow[id] || {}
  const history = [...(existing.history || [])]

  if (historyText) {
    history.push({
      at: new Date().toISOString(),
      by: currentUser.name,
      text: historyText
    })
  }

  workflow[id] = { ...existing, ...changes, history }
  session.data.workflow = workflow
}

module.exports = {
  ISSUES_PER_PAGE,
  rules,
  users,
  currentUser,
  statuses,
  substatuses,
  resolutions,
  ignoreReasons,
  suppressionPeriods,
  addDays,
  getRule,
  getUser,
  getUserName,
  getSubstatus,
  listIssues,
  findIssue,
  readFilters,
  filterIssues,
  countActiveFilters,
  buildQuery,
  paginate,
  buildPaginationModel,
  countsBySubstatus,
  updateWorkflow
}
