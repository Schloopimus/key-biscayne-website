import { useState } from 'react'
import { calendarEvents } from '../site-data'

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const leadingBlanks = 3
const days = Array.from({ length: 31 }, (_, index) => index + 1)
type EventDay = keyof typeof calendarEvents

export function EventCalendar() {
  const [selectedDay, setSelectedDay] = useState<EventDay>(21)
  const selectedEvent = calendarEvents[selectedDay]
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(
    new Date(2026, 6, selectedDay),
  )

  return (
    <div className="calendar-layout">
      <div className="calendar-card">
        <div className="calendar-card__header">
          <h3>July 2026</h3>
          <div className="calendar-legend" aria-label="Event categories">
            <span className="tone-blue">Worship</span>
            <span className="tone-green">Market</span>
            <span className="tone-sky">Youth</span>
          </div>
        </div>
        <div className="calendar-grid" role="grid" aria-label="July 2026 events">
          {weekdays.map((day) => (
            <span key={day} className="calendar-weekday" role="columnheader">
              {day}
            </span>
          ))}
          {Array.from({ length: leadingBlanks }, (_, index) => (
            <span key={`blank-${index}`} className="calendar-day calendar-day--empty" />
          ))}
          {days.map((day) => {
            const event = calendarEvents[day as EventDay]
            const selected = day === selectedDay
            return event ? (
              <button
                key={day}
                className={`calendar-day has-event tone-${event.tone}${selected ? ' is-selected' : ''}`}
                type="button"
                role="gridcell"
                aria-label={`${day} July, ${event.title}`}
                aria-pressed={selected}
                onClick={() => setSelectedDay(day as EventDay)}
              >
                {day}
                <span aria-hidden="true" />
              </button>
            ) : (
              <span key={day} className="calendar-day" role="gridcell">
                {day}
              </span>
            )
          })}
        </div>
      </div>

      <article className={`calendar-detail tone-${selectedEvent.tone}`} aria-live="polite">
        <div>
          <p className="eyebrow">{weekday}</p>
          <h3>July {selectedDay}</h3>
        </div>
        <div className="calendar-detail__event">
          <div className="calendar-detail__meta">
            <span>{selectedEvent.category}</span>
            <time>{selectedEvent.time}</time>
          </div>
          <h4>{selectedEvent.title}</h4>
          <p>{selectedEvent.description}</p>
        </div>
      </article>
    </div>
  )
}
