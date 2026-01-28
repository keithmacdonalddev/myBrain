import { Clock, Flag } from 'lucide-react';
import { useTasks } from '../../tasks/hooks/useTasks';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';

export default function RemindersWidget() {
  const { openTask } = useTaskPanel();
  const { data, isLoading } = useTasks({ status: 'todo,in_progress', sortBy: 'dueDate', limit: 8 });

  const tasks = (data?.tasks || []).filter(t => t.dueDate);

  if (isLoading) {
    return (
      <div className="dash-widget">
        <div className="dash-widget-header">
          <div className="dash-widget-title">
            <span className="dash-widget-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
              <Clock className="w-4 h-4" />
            </span>
            <span>Upcoming</span>
          </div>
        </div>
        <div className="dash-widget-body">
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-panel2 rounded animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  const formatDue = (dateStr) => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const dueDateStr = dateStr.split('T')[0];

    if (dueDateStr < todayStr) return { text: 'Overdue', className: 'text-danger' };
    if (dueDateStr === todayStr) return { text: 'Today', className: 'text-warning' };

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
    if (dueDateStr === tomorrowStr) return { text: 'Tomorrow', className: 'text-primary' };

    return {
      text: new Date(dueDateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      className: 'text-muted'
    };
  };

  return (
    <div className="dash-widget">
      <div className="dash-widget-header">
        <div className="dash-widget-title">
          <span className="dash-widget-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            <Clock className="w-4 h-4" />
          </span>
          <span>Upcoming</span>
          {tasks.length > 0 && <span className="dash-widget-count">{tasks.length}</span>}
        </div>
      </div>
      <div className="dash-widget-body">
        {tasks.length === 0 ? (
          <div className="dash-widget-empty-sm">No upcoming deadlines.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {tasks.slice(0, 6).map(task => {
              const due = formatDue(task.dueDate);
              return (
                <button
                  key={task._id}
                  onClick={() => openTask(task._id)}
                  className="w-full flex items-center gap-2 px-1 py-2 hover:bg-bg transition-colors text-left"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  {task.priority === 'high' && <Flag className="w-3 h-3 text-danger flex-shrink-0" />}
                  <span className="text-sm text-text truncate flex-1">{task.title}</span>
                  <span className={`text-xs flex-shrink-0 ${due.className}`}>{due.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
