import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskPanel } from '../../../../contexts/TaskPanelContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRIORITY_COLORS = {
  high: 'bg-danger/10 text-danger',
  medium: 'bg-primary/10 text-primary',
  low: 'bg-gray-500/10 text-muted',
};

export function ProjectTasksCalendar({ tasks = [] }) {
  const { openTask } = useTaskPanel();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    const tasksByDate = {};
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const dateKey = task.dueDate.split('T')[0];
      if (!tasksByDate[dateKey]) tasksByDate[dateKey] = [];
      tasksByDate[dateKey].push(task);
    });

    return { days, tasksByDate, month, year };
  }, [currentMonth, tasks]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="flex flex-col min-h-[550px] bg-panel border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-panel">
        <button onClick={prevMonth} className="p-1.5 hover:bg-bg rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4 text-muted" />
        </button>
        <h3 className="text-sm font-semibold text-text">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={nextMonth} className="p-1.5 hover:bg-bg rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px px-2 pt-2">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-muted py-1.5">{day}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px flex-1 p-2">
        {calendarData.days.map((date, i) => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayTasks = calendarData.tasksByDate[dateStr] || [];
          const isCurrentMonth = date.getMonth() === calendarData.month;
          const isToday = dateStr === todayStr;

          return (
            <div
              key={i}
              className={`min-h-[80px] p-1 border border-border/30 rounded ${
                isToday ? 'bg-primary/5 border-primary/30' : isCurrentMonth ? 'bg-bg' : 'bg-panel/30'
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : isCurrentMonth ? 'text-text' : 'text-muted/40'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(task => {
                  const colorClass = task.status === 'done'
                    ? 'bg-green-500/10 text-green-600 line-through'
                    : PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;

                  return (
                    <button
                      key={task._id}
                      onClick={() => openTask(task._id)}
                      className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate block transition-colors hover:opacity-80 ${colorClass}`}
                    >
                      {task.title}
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted pl-1">+{dayTasks.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProjectTasksCalendar;
