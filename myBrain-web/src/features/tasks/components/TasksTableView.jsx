import { useState } from 'react';
import { ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { useTaskPanel } from '../../../contexts/TaskPanelContext';

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

export default function TasksTableView({ tasks = [], onSort }) {
  const { openTask } = useTaskPanel();
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (field) => {
    const newDir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDir(newDir);
    onSort?.(field, newDir);
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3" />
      : <ChevronDown className="w-3 h-3" />;
  };

  const priorityColor = (p) => {
    if (p === 'high') return 'text-v2-red';
    if (p === 'low') return 'text-v2-text-tertiary';
    return 'text-v2-orange';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-v2-border-default">
            {[
              { key: 'title', label: 'Title' },
              { key: 'status', label: 'Status' },
              { key: 'priority', label: 'Priority' },
              { key: 'dueDate', label: 'Due Date' },
              { key: 'project', label: 'Project' },
              { key: 'tags', label: 'Tags' },
            ].map(col => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="text-left px-4 py-3 text-xs font-semibold text-v2-text-tertiary uppercase tracking-wider cursor-pointer hover:text-v2-text-primary transition-colors"
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  <SortIcon field={col.key} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr
              key={task._id}
              onClick={() => openTask(task._id)}
              className="border-b border-v2-border-default/50 hover:bg-v2-bg-secondary cursor-pointer transition-colors"
            >
              <td className="px-4 py-3">
                <span className={`font-medium ${task.status === 'done' ? 'text-v2-text-tertiary line-through' : 'text-v2-text-primary'}`}>
                  {task.title}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2 py-1 rounded-full bg-v2-bg-tertiary text-v2-text-tertiary">
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`flex items-center gap-1 text-xs ${priorityColor(task.priority)}`}>
                  <Flag className="w-3 h-3" />
                  {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : '-'}
                </span>
              </td>
              <td className="px-4 py-3 text-xs text-v2-text-tertiary">
                {task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : '-'}
              </td>
              <td className="px-4 py-3 text-xs text-v2-text-tertiary">
                {task.projectId?.title || '-'}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {task.tags?.slice(0, 2).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 text-xs bg-v2-blue/10 text-v2-blue rounded">
                      {tag}
                    </span>
                  ))}
                  {task.tags?.length > 2 && (
                    <span className="text-xs text-v2-text-tertiary">+{task.tags.length - 2}</span>
                  )}
                  {(!task.tags || task.tags.length === 0) && (
                    <span className="text-xs text-v2-text-tertiary">-</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tasks.length === 0 && (
        <div className="text-center py-12 text-sm text-v2-text-tertiary">No tasks to display</div>
      )}
    </div>
  );
}
