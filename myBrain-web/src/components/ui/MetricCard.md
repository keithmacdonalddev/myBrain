# MetricCard Component

A reusable component for displaying dashboard metrics with optional icons and color coding.

## Usage

```jsx
import MetricCard from './components/ui/MetricCard';
import { AlertCircle } from 'lucide-react';

// Basic metric with emoji icon
<MetricCard
  icon="⚠️"
  value={5}
  label="Overdue"
  type="danger"
/>

// With Lucide icon
<MetricCard
  icon={<AlertCircle size={24} />}
  value={12}
  label="Inbox"
/>

// With percentage
<MetricCard
  icon="✓"
  value="85%"
  label="Completed"
  type="success"
/>

// Clickable metric
<MetricCard
  value={8}
  label="Events Today"
  onClick={() => navigate('/calendar')}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `icon` | `React.ReactNode` | - | Optional icon (Lucide component or emoji) |
| `value` | `string \| number` | **required** | The metric value to display |
| `label` | `string` | **required** | Descriptive label below the value |
| `type` | `'default' \| 'danger' \| 'success' \| 'warning'` | `'default'` | Color variant |
| `onClick` | `Function` | - | Optional click handler (makes card interactive) |

## Type Colors

- **default**: Neutral (text primary color)
- **danger**: Red/amber for critical items (overdue, errors)
- **success**: Green for positive metrics (completed, achievements)
- **warning**: Orange for attention needed (pending, warnings)

## Design Notes

- Large value (32px) for quick scanning at a glance
- Generous padding (16px) for calm, spacious design
- Subtle hover lift effect when clickable
- Uses V2 CSS variables for theme consistency
- Fully accessible with keyboard support
- Responsive sizing on mobile devices

## Examples

### Dashboard Focus Section
```jsx
<div className="v2-metrics-row">
  <MetricCard icon="⚠️" value={3} label="Overdue" type="danger" />
  <MetricCard icon="📅" value={5} label="Events" />
  <MetricCard icon="📥" value={8} label="Inbox" />
  <MetricCard icon="✓" value="75%" label="Completed" type="success" />
</div>
```

### Interactive Stats
```jsx
<MetricCard
  icon={<TrendingUp size={24} />}
  value="142"
  label="Tasks Completed"
  type="success"
  onClick={() => setShowCompletedTasks(true)}
/>
```
