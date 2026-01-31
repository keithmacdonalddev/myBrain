/**
 * TaskCheckbox and TaskItem Usage Examples
 *
 * This file demonstrates how to use the reusable TaskCheckbox and TaskItem components.
 */

import TaskCheckbox from './TaskCheckbox';
import TaskItem from './TaskItem';

/**
 * Example 1: Basic TaskCheckbox
 */
function TaskCheckboxExample() {
  const [checked, setChecked] = useState(false);

  return (
    <TaskCheckbox
      checked={checked}
      onChange={setChecked}
      priority="high"
    />
  );
}

/**
 * Example 2: TaskCheckbox with all priorities
 */
function TaskCheckboxPriorities() {
  const [states, setStates] = useState({
    urgent: false,
    high: false,
    medium: false,
    low: false,
    none: false
  });

  return (
    <div style={{ display: 'flex', gap: '12px' }}>
      <TaskCheckbox
        checked={states.urgent}
        onChange={(checked) => setStates({ ...states, urgent: checked })}
        priority="urgent"
      />
      <TaskCheckbox
        checked={states.high}
        onChange={(checked) => setStates({ ...states, high: checked })}
        priority="high"
      />
      <TaskCheckbox
        checked={states.medium}
        onChange={(checked) => setStates({ ...states, medium: checked })}
        priority="medium"
      />
      <TaskCheckbox
        checked={states.low}
        onChange={(checked) => setStates({ ...states, low: checked })}
        priority="low"
      />
      <TaskCheckbox
        checked={states.none}
        onChange={(checked) => setStates({ ...states, none: checked })}
        priority="none"
      />
    </div>
  );
}

/**
 * Example 3: Basic TaskItem
 */
function TaskItemExample() {
  const task = {
    _id: '123',
    title: 'Complete project documentation',
    status: 'todo',
    priority: 'high'
  };

  return (
    <TaskItem
      task={task}
      onComplete={(id, checked) => console.log('Complete:', id, checked)}
      onEdit={(id) => console.log('Edit:', id)}
      onDelete={(id) => console.log('Delete:', id)}
      onClick={(id) => console.log('Click:', id)}
      meta="Work Project - High Priority"
    />
  );
}

/**
 * Example 4: TaskItem with badges
 */
function TaskItemBadgesExample() {
  const overdueTask = {
    _id: '456',
    title: 'Review pull request',
    status: 'todo',
    priority: 'urgent'
  };

  const todayTask = {
    _id: '789',
    title: 'Team standup meeting',
    status: 'todo',
    priority: 'medium'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <TaskItem
        task={overdueTask}
        badge="overdue"
        meta="Personal - Urgent Priority"
        onComplete={(id, checked) => console.log('Complete:', id, checked)}
        onClick={(id) => console.log('Click:', id)}
      />
      <TaskItem
        task={todayTask}
        badge="today"
        meta="Work Project - Medium Priority"
        onComplete={(id, checked) => console.log('Complete:', id, checked)}
        onClick={(id) => console.log('Click:', id)}
      />
    </div>
  );
}

/**
 * Example 5: TaskItem without hover actions
 */
function TaskItemNoActionsExample() {
  const task = {
    _id: '999',
    title: 'Read-only task item',
    status: 'todo',
    priority: 'low'
  };

  return (
    <TaskItem
      task={task}
      showHoverActions={false}
      onClick={(id) => console.log('Click:', id)}
      meta="Personal - Low Priority"
    />
  );
}

/**
 * Example 6: Completed TaskItem
 */
function TaskItemCompletedExample() {
  const task = {
    _id: '111',
    title: 'Completed task with strikethrough',
    status: 'completed',
    priority: 'medium'
  };

  return (
    <TaskItem
      task={task}
      onComplete={(id, checked) => console.log('Complete:', id, checked)}
      onClick={(id) => console.log('Click:', id)}
      meta="Work Project - Medium Priority"
    />
  );
}

/**
 * Example 7: Full task list with TaskItems
 */
function TaskListExample() {
  const tasks = [
    {
      _id: '1',
      title: 'Overdue task',
      status: 'todo',
      priority: 'urgent',
      badge: 'overdue'
    },
    {
      _id: '2',
      title: 'Task due today',
      status: 'todo',
      priority: 'high',
      badge: 'today'
    },
    {
      _id: '3',
      title: 'Regular task',
      status: 'todo',
      priority: 'medium',
      badge: null
    },
    {
      _id: '4',
      title: 'Completed task',
      status: 'completed',
      priority: 'low',
      badge: null
    }
  ];

  const handleComplete = (id, checked) => {
    console.log(`Task ${id} ${checked ? 'completed' : 'uncompleted'}`);
  };

  const handleEdit = (id) => {
    console.log(`Edit task ${id}`);
  };

  const handleDelete = (id) => {
    console.log(`Delete task ${id}`);
  };

  const handleClick = (id) => {
    console.log(`Clicked task ${id}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {tasks.map((task) => (
        <TaskItem
          key={task._id}
          task={task}
          badge={task.badge}
          meta={`Project - ${task.priority} Priority`}
          onComplete={handleComplete}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClick={handleClick}
        />
      ))}
    </div>
  );
}

export {
  TaskCheckboxExample,
  TaskCheckboxPriorities,
  TaskItemExample,
  TaskItemBadgesExample,
  TaskItemNoActionsExample,
  TaskItemCompletedExample,
  TaskListExample
};
