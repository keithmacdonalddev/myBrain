import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TasksCalendarView({ tasks = [] }) {
  const { openTask } = useTaskPanel();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    const current = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Map tasks to dates
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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-v2-bg-secondary rounded-lg transition-colors" aria-label="Previous month">
          <ChevronLeft className="w-4 h-4 text-v2-text-tertiary" />
        </button>
        <h3 className="text-sm font-semibold text-v2-text-primary">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        <button onClick={nextMonth} className="p-2 hover:bg-v2-bg-secondary rounded-lg transition-colors" aria-label="Next month">
          <ChevronRight className="w-4 h-4 text-v2-text-tertiary" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {DAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-v2-text-tertiary py-2">{day}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px flex-1">
        {calendarData.days.map((date, i) => {
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayTasks = calendarData.tasksByDate[dateStr] || [];
          const isCurrentMonth = date.getMonth() === calendarData.month;
          const isToday = dateStr === todayStr;

          return (
            <div
              key={i}
              className={`min-h-[80px] p-1 border border-v2-border-default/30 rounded ${
                isToday ? 'bg-v2-blue/5 border-v2-blue/30' : isCurrentMonth ? 'bg-v2-bg-surface' : 'bg-v2-bg-secondary/30'
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${isToday ? 'text-v2-blue' : isCurrentMonth ? 'text-v2-text-primary' : 'text-v2-text-tertiary/40'}`}>
                {date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(task => (
                  <button
                    key={task._id}
                    onClick={() => openTask(task._id)}
                    className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate block transition-colors ${
                      task.status === 'done'
                        ? 'bg-v2-green/10 text-v2-green line-through'
                        : task.priority === 'high'
                          ? 'bg-v2-red/10 text-v2-red'
                          : 'bg-v2-blue/10 text-v2-blue'
                    } hover:opacity-80`}
                    aria-label={`View task: ${task.title}`}
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-v2-text-tertiary pl-1">+{dayTasks.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
