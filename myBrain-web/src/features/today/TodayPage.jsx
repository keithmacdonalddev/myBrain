import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Inbox,
  ArrowRight,
  Flag
} from 'lucide-react';
import { useTodayView, useUpdateTaskStatus } from '../tasks/hooks/useTasks';
import { useInboxCount } from '../notes/hooks/useNotes';
import { TaskPanelProvider, useTaskPanel } from '../../contexts/TaskPanelContext';
import TaskSlidePanel from '../../components/tasks/TaskSlidePanel';
import Skeleton from '../../components/ui/Skeleton';

const PRIORITY_COLORS = {
  low: 'text-gray-400',
  medium: 'text-yellow-500',
  high: 'text-red-500',
};

function TodayTaskRow({ task, isOverdue }) {
  const { openTask } = useTaskPanel();
  const updateStatus = useUpdateTaskStatus();

  const handleStatusClick = (e) => {
    e.stopPropagation();
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateStatus.mutate({ id: task._id, status: newStatus });
  };

  const isCompleted = task.status === 'done';

  return (
    <div
      onClick={() => openTask(task._id)}
      className="group flex items-center gap-3 px-4 py-2.5 hover:bg-bg/50 cursor-pointer transition-colors rounded-lg"
    >
      <button
        onClick={handleStatusClick}
        className={`flex-shrink-0 ${
          isCompleted ? 'text-green-500' : isOverdue ? 'text-red-500 hover:text-red-400' : 'text-muted hover:text-primary'
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 fill-current" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <span className={`flex-1 text-sm ${isCompleted ? 'text-muted line-through' : 'text-text'}`}>
        {task.title}
      </span>

      {task.priority !== 'medium' && (
        <Flag className={`w-3.5 h-3.5 ${PRIORITY_COLORS[task.priority]}`} />
      )}
    </div>
  );
}

function TodayContent() {
  const { data: todayData, isLoading: todayLoading } = useTodayView();
  const { data: inboxCount, isLoading: inboxLoading } = useInboxCount();

  const today = new Date();
  const dateString = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const overdueCount = todayData?.overdue?.length || 0;
  const dueTodayCount = todayData?.dueToday?.length || 0;
  const inboxTotal = inboxCount || todayData?.inboxCount || 0;

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Today</h1>
            <p className="text-sm text-muted">{dateString}</p>
          </div>
        </div>

        {todayLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-48" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue Section */}
            {overdueCount > 0 && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider">
                    Overdue ({overdueCount})
                  </h2>
                </div>

                <div className="space-y-1">
                  {todayData.overdue.map((task) => (
                    <TodayTaskRow key={task._id} task={task} isOverdue />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today Section */}
            <div className="bg-panel border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                  Due Today ({dueTodayCount})
                </h2>
              </div>

              {dueTodayCount === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  No tasks due today. Nice work!
                </p>
              ) : (
                <div className="space-y-1">
                  {todayData.dueToday.map((task) => (
                    <TodayTaskRow key={task._id} task={task} />
                  ))}
                </div>
              )}
            </div>

            {/* Inbox Preview Section */}
            <div className="bg-panel border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Inbox className="w-4 h-4 text-muted" />
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                    Inbox
                  </h2>
                  {inboxTotal > 0 && (
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded">
                      {inboxTotal}
                    </span>
                  )}
                </div>
              </div>

              {inboxTotal === 0 ? (
                <p className="text-sm text-muted py-4 text-center">
                  Inbox zero! You're all caught up.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    You have {inboxTotal} unprocessed note{inboxTotal !== 1 ? 's' : ''} waiting for review.
                  </p>
                  <Link
                    to="/app/inbox"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    View Inbox
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            {(overdueCount === 0 && dueTodayCount === 0 && inboxTotal === 0) && (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/10 rounded-full mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-text mb-1">All Clear!</h3>
                <p className="text-sm text-muted">
                  Nothing urgent today. Time to work on what matters.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TodayPage() {
  return (
    <TaskPanelProvider>
      <TodayContent />
      <TaskSlidePanel />
    </TaskPanelProvider>
  );
}

export default TodayPage;
