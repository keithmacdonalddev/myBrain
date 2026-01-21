/**
 * =============================================================================
 * STATSWIDGET.JSX - Completion Statistics Widget
 * =============================================================================
 *
 * Shows task and project completion statistics.
 * Provides a quick overview of productivity metrics.
 *
 * SIZE: wide (6 columns)
 *
 * =============================================================================
 */

import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Target
} from 'lucide-react';
import {
  WidgetHeader,
  WidgetBody,
  WidgetLoading
} from '../components/DashboardGrid';

/**
 * StatsWidget
 * -----------
 * @param {Object} stats - Statistics object from dashboard API
 * @param {boolean} isLoading - Loading state
 */
export default function StatsWidget({ stats, isLoading = false }) {
  if (isLoading) {
    return (
      <>
        <WidgetHeader
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          iconBg="bg-green-500/10"
          title="Your Progress"
        />
        <WidgetBody>
          <WidgetLoading />
        </WidgetBody>
      </>
    );
  }

  const taskStats = stats?.tasks || {};
  const projectStats = stats?.projects || {};

  const statItems = [
    {
      label: 'Completed Today',
      value: taskStats.completedToday || 0,
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      label: 'This Week',
      value: taskStats.completedThisWeek || 0,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      label: 'Active Tasks',
      value: taskStats.totalActive || 0,
      icon: CheckCircle2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      label: 'Overdue',
      value: taskStats.overdue || 0,
      icon: AlertTriangle,
      color: taskStats.overdue > 0 ? 'text-red-500' : 'text-muted',
      bgColor: taskStats.overdue > 0 ? 'bg-red-500/10' : 'bg-gray-500/10'
    },
    {
      label: 'Active Projects',
      value: projectStats.active || 0,
      icon: FolderKanban,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      label: 'Completed This Month',
      value: projectStats.completedThisMonth || 0,
      icon: TrendingUp,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10'
    }
  ];

  return (
    <>
      <WidgetHeader
        icon={<TrendingUp className="w-4 h-4 text-green-500" />}
        iconBg="bg-green-500/10"
        title="Your Progress"
        subtitle="Tasks & Projects"
      />

      <WidgetBody>
        <div className="stats-grid">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="stat-item">
                <div className={`w-7 h-7 ${item.bgColor} rounded-lg flex items-center justify-center mx-auto mb-1.5`}>
                  <Icon className={`w-4 h-4 ${item.color}`} />
                </div>
                <div className={`stat-value ${item.color}`}>
                  {item.value}
                </div>
                <div className="stat-label">{item.label}</div>
              </div>
            );
          })}
        </div>
      </WidgetBody>
    </>
  );
}

StatsWidget.defaultSize = 'wide';
