//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const cleanse = require('./data/issues')

const OPEN_SUBSTATUSES = ['todo', 'in-progress']

function getWorkflow(req) {
  return req.session.data.workflow
}

function withNote(text, note) {
  return note ? `${text}. Note: ${note}` : text
}

function setFlash(req, message) {
  req.session.flash = message
}

// Home page. A count of what is waiting so a user knows where to start.
router.get('/', (req, res) => {
  const all = cleanse.listIssues(getWorkflow(req))
  const active = all.filter((issue) => issue.status === 'active')

  res.render('index', {
    substatuses: cleanse.substatuses,
    counts: {
      bySubstatus: cleanse.countsBySubstatus(active),
      assignedToMe: active.filter(
        (issue) =>
          issue.assignedTo === cleanse.currentUser.id &&
          OPEN_SUBSTATUSES.includes(issue.substatus)
      ).length,
      unassignedTodo: active.filter(
        (issue) => !issue.assignedTo && issue.substatus === 'todo'
      ).length,
      inactive: all.length - active.length
    }
  })
})

// The working queue. Filters come from the query string so a filtered list can
// be shared or bookmarked.
router.get('/issues', (req, res) => {
  const filters = cleanse.readFilters(req.query)
  const all = cleanse.listIssues(getWorkflow(req))
  const matching = cleanse.filterIssues(all, filters)
  const pagination = cleanse.paginate(matching, filters)
  const counts = cleanse.countsBySubstatus(all)

  // Remember the list a user came from, so "Back to issues" returns them to
  // the same filters and the same page.
  req.session.lastIssuesQuery = req.originalUrl

  const assignedItems = [
    { value: 'all', text: 'Anyone' },
    { value: 'me', text: `Me (${cleanse.currentUser.name})` },
    { value: 'unassigned', text: 'Unassigned' },
    ...cleanse.users
      .filter((user) => user.id !== cleanse.currentUser.id)
      .map((user) => ({ value: user.id, text: user.name }))
  ]

  const ruleItems = [
    { value: 'all', text: 'All rules' },
    ...cleanse.rules.map((rule) => ({
      value: rule.code,
      text: `${rule.number}. ${rule.code}`
    }))
  ]

  res.render('issues', {
    filters,
    pagination,
    totalIssues: all.length,
    paginationModel: cleanse.buildPaginationModel(pagination, filters),
    substatusItems: cleanse.substatuses.map((substatus) => ({
      value: substatus.id,
      text: `${substatus.name} (${counts[substatus.id]})`,
      checked: filters.substatus.includes(substatus.id)
    })),
    statusItems: cleanse.statuses.map((status) => ({
      value: status.id,
      text: status.name,
      checked: filters.status.includes(status.id)
    })),
    assignedItems: assignedItems.map((item) => ({
      ...item,
      selected: filters.assigned === item.value
    })),
    ruleItems: ruleItems.map((item) => ({
      ...item,
      selected: filters.rule === item.value
    }))
  })
})

router.get('/issues/:id', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  const flash = req.session.flash
  delete req.session.flash

  res.render('issue', {
    issue,
    flash,
    backLink: req.session.lastIssuesQuery || '/issues'
  })
})

// The one-click transitions. Anything that needs the user to tell us something
// has a page of its own.
router.post('/issues/:id/action', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  const action = req.body._action

  if (action === 'start') {
    const changes = { substatus: 'in-progress' }
    let entry = 'Started work'

    if (!issue.assignedTo) {
      changes.assignedTo = cleanse.currentUser.id
      entry = `Started work and assigned to ${cleanse.currentUser.name}`
    }

    cleanse.updateWorkflow(req.session, issue.id, changes, entry)
    setFlash(req, `${issue.id} moved to In progress`)
  } else if (action === 'assign-to-me') {
    cleanse.updateWorkflow(
      req.session,
      issue.id,
      { assignedTo: cleanse.currentUser.id },
      `Assigned to ${cleanse.currentUser.name}`
    )
    setFlash(req, `${issue.id} assigned to you`)
  } else if (action === 'unassign') {
    cleanse.updateWorkflow(
      req.session,
      issue.id,
      { assignedTo: null },
      'Unassigned'
    )
    setFlash(req, `${issue.id} is no longer assigned to anyone`)
  } else if (action === 'reopen') {
    const entry =
      issue.substatus === 'suppressed'
        ? 'Suppression removed, moved back to To do'
        : 'Reopened, moved back to To do'

    cleanse.updateWorkflow(
      req.session,
      issue.id,
      { substatus: 'todo', suppressionExpiresAt: null },
      entry
    )
    setFlash(req, `${issue.id} moved back to To do`)
  }

  res.redirect(`/issues/${issue.id}`)
})

router.get('/issues/:id/assign', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  res.render('issue-assign', { issue, assignItems: buildAssignItems(issue) })
})

router.post('/issues/:id/assign', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  const choice = req.body._assignTo

  if (!choice) {
    return res.render('issue-assign', {
      issue,
      assignItems: buildAssignItems(issue),
      error: 'Select who should work on this issue'
    })
  }

  if (choice === 'unassigned') {
    cleanse.updateWorkflow(
      req.session,
      issue.id,
      { assignedTo: null },
      'Unassigned'
    )
    setFlash(req, `${issue.id} is no longer assigned to anyone`)
  } else {
    const name = cleanse.getUserName(choice)
    cleanse.updateWorkflow(
      req.session,
      issue.id,
      { assignedTo: choice },
      `Assigned to ${name}`
    )
    setFlash(req, `${issue.id} assigned to ${name}`)
  }

  res.redirect(`/issues/${issue.id}`)
})

function buildAssignItems(issue) {
  const others = cleanse.users.filter(
    (user) => user.id !== cleanse.currentUser.id
  )

  return [
    {
      value: cleanse.currentUser.id,
      text: `${cleanse.currentUser.name} (you)`,
      checked: issue.assignedTo === cleanse.currentUser.id
    },
    ...others.map((user) => ({
      value: user.id,
      text: user.name,
      checked: issue.assignedTo === user.id
    })),
    { divider: 'or' },
    { value: 'unassigned', text: 'No one', checked: !issue.assignedTo }
  ]
}

router.get('/issues/:id/suppress', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  res.render('issue-suppress', { issue, periodItems: buildPeriodItems() })
})

router.post('/issues/:id/suppress', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  const period = req.body._suppressFor
  const note = (req.body._note || '').trim()

  if (!period) {
    return res.render('issue-suppress', {
      issue,
      periodItems: buildPeriodItems(),
      note,
      error: 'Select how long to suppress this issue for'
    })
  }

  const days = parseInt(period, 10)
  const expiresAt = cleanse.addDays(days)
  const label = cleanse.suppressionPeriods.find(
    (item) => item.id === period
  ).name

  cleanse.updateWorkflow(
    req.session,
    issue.id,
    { substatus: 'suppressed', suppressionExpiresAt: expiresAt },
    withNote(`Suppressed for ${label}`, note)
  )

  setFlash(req, `${issue.id} suppressed for ${label}`)
  res.redirect(`/issues/${issue.id}`)
})

function buildPeriodItems() {
  return cleanse.suppressionPeriods.map((period) => ({
    value: period.id,
    text: period.name
  }))
}

router.get('/issues/:id/resolve', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  res.render('issue-resolve', {
    issue,
    resolutionItems: buildResolutionItems()
  })
})

router.post('/issues/:id/resolve', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  const resolution = req.body._resolution
  const note = (req.body._note || '').trim()

  if (!resolution) {
    return res.render('issue-resolve', {
      issue,
      resolutionItems: buildResolutionItems(),
      note,
      error: 'Select how you resolved this issue'
    })
  }

  const label = cleanse.resolutions.find((item) => item.id === resolution).name
  const changes = { substatus: 'resolved', suppressionExpiresAt: null }

  // Whoever did the work owns it.
  if (!issue.assignedTo) {
    changes.assignedTo = cleanse.currentUser.id
  }

  cleanse.updateWorkflow(
    req.session,
    issue.id,
    changes,
    withNote(`Resolved: ${label}`, note)
  )

  setFlash(req, `${issue.id} marked as resolved`)
  res.redirect(`/issues/${issue.id}`)
})

function buildResolutionItems() {
  return cleanse.resolutions.map((resolution) => ({
    value: resolution.id,
    text: resolution.name
  }))
}

router.get('/issues/:id/ignore', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  res.render('issue-ignore', { issue, reasonItems: buildReasonItems() })
})

router.post('/issues/:id/ignore', (req, res, next) => {
  const issue = cleanse.findIssue(req.params.id, getWorkflow(req))

  if (!issue) {
    return next()
  }

  const reason = req.body._ignoreReason
  const note = (req.body._note || '').trim()

  if (!reason) {
    return res.render('issue-ignore', {
      issue,
      reasonItems: buildReasonItems(),
      note,
      error: 'Select why you are ignoring this issue'
    })
  }

  const label = cleanse.ignoreReasons.find((item) => item.id === reason).name

  cleanse.updateWorkflow(
    req.session,
    issue.id,
    { substatus: 'ignored', suppressionExpiresAt: null },
    withNote(`Ignored: ${label}`, note)
  )

  setFlash(req, `${issue.id} ignored`)
  res.redirect(`/issues/${issue.id}`)
})

function buildReasonItems() {
  return cleanse.ignoreReasons.map((reason) => ({
    value: reason.id,
    text: reason.name
  }))
}
