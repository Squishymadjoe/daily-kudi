import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Database,
  Search,
  Tags,
  Wifi,
  Wrench,
} from 'lucide-react'
import { HELP_ARTICLES, HELP_CATEGORIES, searchHelpContent } from '../utils/helpContent'

const categoryIcons = { BookOpen, Tags, Database, Wifi, Wrench }

export default function HelpCentre({ onBack }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const { articles, faqs } = useMemo(
    () => searchHelpContent(query, category),
    [query, category],
  )
  const visibleCategories = HELP_CATEGORIES.filter((item) => (
    articles.some((article) => article.category === item.id)
  ))

  return (
    <div className="settings-content information-page help-centre">
      <button type="button" className="information-back" onClick={onBack}>
        <ArrowLeft size={15} /> Back to Settings
      </button>
      <section className="help-welcome">
        <span className="help-welcome-icon"><BookOpen size={22} /></span>
        <p className="eyebrow">Daily Kudi guide</p>
        <h3>How can we help?</h3>
        <p>Find simple steps for recording money, understanding your reports, and keeping your records safe.</p>
      </section>

      <div className="help-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          aria-label="Search help topics and frequently asked questions"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search help topics"
          autoComplete="off"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear help search">
            Clear
          </button>
        )}
      </div>

      <nav className="help-category-nav" aria-label="Help categories">
        <button
          type="button"
          className={category === 'all' ? 'selected' : ''}
          aria-pressed={category === 'all'}
          onClick={() => setCategory('all')}
        >
          All topics
        </button>
        {HELP_CATEGORIES.map(({ id, label, icon }) => {
          const Icon = categoryIcons[icon]
          return (
            <button
              type="button"
              key={id}
              className={category === id ? 'selected' : ''}
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
            >
              <Icon size={14} aria-hidden="true" /> {label}
            </button>
          )
        })}
      </nav>

      <section className="help-articles" aria-label="Help articles">
        {visibleCategories.map(({ id, label }) => {
          const items = articles.filter((article) => article.category === id)
          return (
            <section className="help-topic-group" key={id}>
              <h3>{label}</h3>
              {items.map((article) => (
                <details className="help-article" key={article.id}>
                  <summary>
                    <span><strong>{article.title}</strong><small>{article.summary}</small></span>
                    <ChevronDown size={17} aria-hidden="true" />
                  </summary>
                  <ol>
                    {article.steps.map((step, index) => <li key={`${article.id}-${index}`}>{step}</li>)}
                  </ol>
                </details>
              ))}
            </section>
          )
        })}
        {!articles.length && <p className="help-no-results">No help articles match that search. Try another word or choose All topics.</p>}
      </section>

      <section className="help-faq-section" aria-label="Frequently asked questions">
        <div className="help-section-heading">
          <span className="help-section-icon"><Search size={16} /></span>
          <div><p className="eyebrow">Quick answers</p><h3>Frequently asked questions</h3></div>
        </div>
        {faqs.length ? faqs.map((faq) => (
          <details className="help-faq" key={faq.id}>
            <summary>{faq.question}<ChevronDown size={16} aria-hidden="true" /></summary>
            <p>{faq.answer}</p>
          </details>
        )) : (
          <p className="help-no-results">No questions match that search.</p>
        )}
      </section>

      <p className="help-local-note">Help is included in Daily Kudi and can be opened offline after the app has loaded and been cached.</p>
      <span className="sr-only">{HELP_ARTICLES.length} help articles available</span>
    </div>
  )
}
