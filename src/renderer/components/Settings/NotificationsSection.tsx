import { Info } from 'lucide-react'
import type { Config, NotificationSettings } from '../../../shared/types'

interface Props {
  config: Config
  onChange: (updates: Partial<Config>) => void
}

interface FrequencyInputProps {
  value: number
  onChange: (val: number) => void
  min: number
  max: number
  step: number
}

function FrequencyInput({ value, onChange, min, max, step }: FrequencyInputProps) {
  return (
    <div className="settings-frequency">
      <div className="settings-frequency__input-group">
        <input
          type="number"
          className="settings-input settings-input--small"
          value={value}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            if (!isNaN(val) && val >= min && val <= max) {
              onChange(val)
            }
          }}
          min={min}
          max={max}
          step={step}
        />
        <span className="settings-frequency__unit">min</span>
      </div>
    </div>
  )
}

export default function NotificationsSection({ config, onChange }: Props) {
  const notifications = config.notifications

  const update = (updates: Partial<NotificationSettings>) => {
    onChange({ notifications: { ...notifications, ...updates } })
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">Notifications</h3>
      <p className="settings-section__desc">Control when and how often you get notified.</p>

      <div className="settings-info-card">
        <Info size={14} className="settings-info-card__icon" />
        <p className="settings-info-card__text">
          Notifications alert you when an assistant finishes working and needs your input.
          They are sent as native OS notifications when the window is not focused.
        </p>
      </div>

      <div className="settings-field">
        <div className="settings-toggle-row">
          <div className="settings-toggle-row__content">
            <label className="settings-label">Waiting (Unseen)</label>
            <p className="settings-hint">Notify when the assistant is waiting and you haven't viewed the response yet.</p>
          </div>
          {notifications.unseenEnabled && (
            <FrequencyInput
              value={notifications.unseenIntervalMinutes}
              onChange={(val) => update({ unseenIntervalMinutes: val })}
              min={0.5}
              max={10}
              step={0.5}
            />
          )}
          <button
            className={`settings-toggle ${notifications.unseenEnabled ? 'settings-toggle--on' : ''}`}
            onClick={() => update({ unseenEnabled: !notifications.unseenEnabled })}
          >
            <span className="settings-toggle__thumb" />
          </button>
        </div>
      </div>

      <div className="settings-field">
        <div className="settings-toggle-row">
          <div className="settings-toggle-row__content">
            <label className="settings-label">Waiting (Seen)</label>
            <p className="settings-hint">Remind you periodically after you've seen the response but haven't replied.</p>
          </div>
          {notifications.seenEnabled && (
            <FrequencyInput
              value={notifications.seenIntervalMinutes}
              onChange={(val) => update({ seenIntervalMinutes: val })}
              min={1}
              max={30}
              step={1}
            />
          )}
          <button
            className={`settings-toggle ${notifications.seenEnabled ? 'settings-toggle--on' : ''}`}
            onClick={() => update({ seenEnabled: !notifications.seenEnabled })}
          >
            <span className="settings-toggle__thumb" />
          </button>
        </div>
      </div>
    </div>
  )
}
