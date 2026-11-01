import assert from 'node:assert/strict'
import test from 'node:test'
import { HELP_ARTICLES, HELP_FAQS, searchHelpContent } from '../src/utils/helpContent.js'

test('help centre includes practical guides for core app features', () => {
  const { articles } = searchHelpContent()
  const titles = articles.map(({ title }) => title)

  assert.ok(titles.includes('Add an expense'))
  assert.ok(titles.includes('Add income'))
  assert.ok(titles.includes('Use Analytics'))
  assert.ok(titles.includes('Create an income or expense category'))
  assert.ok(titles.includes('Export a JSON backup'))
  assert.ok(titles.includes('Use Daily Kudi offline'))
})

test('help categories narrow articles and search matches article steps', () => {
  const categories = searchHelpContent('', 'categories')
  assert.ok(categories.articles.length > 0)
  assert.ok(categories.articles.every(({ category }) => category === 'categories'))

  const expenseSearch = searchHelpContent('₦2,000')
  assert.ok(expenseSearch.articles.some(({ id }) => id === 'add-expense'))
  assert.ok(expenseSearch.articles.every(({ category }) => category !== 'categories'))
})

test('help search filters frequently asked questions and empty results safely', () => {
  const bankSearch = searchHelpContent('bank')
  assert.ok(bankSearch.faqs.some(({ id }) => id === 'bank'))
  assert.ok(bankSearch.faqs.some(({ id }) => id === 'balance'))
  assert.ok(bankSearch.articles.some(({ id }) => id === 'troubleshoot-balance'))

  const noMatches = searchHelpContent('no such help topic')
  assert.deepEqual(noMatches.articles, [])
  assert.deepEqual(noMatches.faqs, [])
})

test('guidance covers archived categories, backup replacement, offline limits, and troubleshooting', () => {
  const archivedCategory = HELP_ARTICLES.find(({ id }) => id === 'delete-categories')
  const restore = HELP_ARTICLES.find(({ id }) => id === 'restore-backup')
  const offline = HELP_ARTICLES.find(({ id }) => id === 'offline-use')
  const faqIds = HELP_FAQS.map(({ id }) => id)

  assert.match(archivedCategory.steps.join(' '), /archived/i)
  assert.match(archivedCategory.steps.join(' '), /historical category label/i)
  assert.match(restore.steps.join(' '), /replaces current transactions and categories/i)
  assert.match(offline.steps.join(' '), /does not automatically sync/i)
  assert.ok(faqIds.includes('recover'))
  assert.ok(HELP_ARTICLES.some(({ id }) => id === 'troubleshoot-offline'))
  assert.ok(HELP_ARTICLES.some(({ id }) => id === 'troubleshoot-update'))
})
