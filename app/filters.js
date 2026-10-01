//
// For guidance on how to create filters see:
// https://prototype-kit.service.gov.uk/docs/filters
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFilter = govukPrototypeKit.views.addFilter

// Add your filters here

// Format an ISO date as a GOV.UK style date, for example "4 March 2026".
addFilter('govukDate', function (value) {
  if (!value) {
    return ''
  }

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

// Format an ISO date as a date and time, for example "4 March 2026 at 9:15am".
addFilter('govukDateTime', function (value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const time = date
    .toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    .replace(' ', '')

  return `${date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })} at ${time}`
})

// How many whole days until a date. Used for suppression countdowns.
addFilter('daysUntil', function (value) {
  if (!value) {
    return 0
  }

  const difference = new Date(value).getTime() - Date.now()
  return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)))
})
