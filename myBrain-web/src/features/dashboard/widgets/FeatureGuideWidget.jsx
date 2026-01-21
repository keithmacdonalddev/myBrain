/**
 * =============================================================================
 * FEATUREGUIDEWIDGET.JSX - Feature Guide Widget
 * =============================================================================
 *
 * A compact widget showing quick info about myBrain features.
 * Helps new users discover and understand the app's capabilities.
 * Clicking a feature shows its description - doesn't navigate away.
 *
 * SIZE: narrow (3 columns)
 *
 * =============================================================================
 */

import { useState } from 'react';
import {
  HelpCircle,
  CheckSquare,
  StickyNote,
  FolderKanban,
  Calendar,
  Image,
  FileText,
  Inbox,
  MessageSquare,
  X
} from 'lucide-react';
import { WidgetHeader, WidgetBody } from '../components/DashboardGrid';

const FEATURES = [
  {
    id: 'tasks',
    icon: CheckSquare,
    label: 'Tasks',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    description: 'Create and manage your to-do items. Set due dates, priorities, and track completion. Tasks can be linked to projects and life areas.'
  },
  {
    id: 'notes',
    icon: StickyNote,
    label: 'Notes',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    description: 'Capture thoughts, ideas, and information. Notes support rich text formatting and can be organized with tags and life areas.'
  },
  {
    id: 'projects',
    icon: FolderKanban,
    label: 'Projects',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    description: 'Group related tasks together into projects. Track progress, set deadlines, and break down big goals into manageable pieces.'
  },
  {
    id: 'calendar',
    icon: Calendar,
    label: 'Calendar',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    description: 'Schedule events and appointments. View your day, week, or month at a glance. Events can be linked to tasks and notes.'
  },
  {
    id: 'images',
    icon: Image,
    label: 'Images',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    description: 'Store and organize your images. Upload photos, screenshots, and visual references. Tag and search your image library.'
  },
  {
    id: 'files',
    icon: FileText,
    label: 'Files',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    description: 'Upload and manage documents. Keep important files organized in folders. Attach files to notes, tasks, and projects.'
  },
  {
    id: 'inbox',
    icon: Inbox,
    label: 'Inbox',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    description: 'Quick capture for unprocessed items. Dump thoughts here first, then organize them later into notes, tasks, or projects.'
  },
  {
    id: 'messages',
    icon: MessageSquare,
    label: 'Messages',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    description: 'Communicate with your connections. Send direct messages, share items, and collaborate with others.'
  },
];

export default function FeatureGuideWidget() {
  const [selectedFeature, setSelectedFeature] = useState(null);

  const handleFeatureClick = (feature) => {
    if (selectedFeature?.id === feature.id) {
      setSelectedFeature(null);
    } else {
      setSelectedFeature(feature);
    }
  };

  return (
    <>
      <WidgetHeader
        icon={<HelpCircle className="w-4 h-4 text-slate-500" />}
        iconBg="bg-slate-500/10"
        title="Building Blocks"
        subtitle="Tap to learn"
      />

      <WidgetBody>
        {/* Selected feature info */}
        {selectedFeature && (
          <div className="feature-guide-info">
            <div className="feature-guide-info-header">
              <div className={`feature-guide-info-icon ${selectedFeature.bgColor}`}>
                <selectedFeature.icon className={`w-4 h-4 ${selectedFeature.color}`} />
              </div>
              <span className="feature-guide-info-title">{selectedFeature.label}</span>
              <button
                onClick={() => setSelectedFeature(null)}
                className="feature-guide-info-close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="feature-guide-info-desc">{selectedFeature.description}</p>
          </div>
        )}

        {/* Feature grid */}
        <div className="feature-guide-grid">
          {FEATURES.map(feature => {
            const Icon = feature.icon;
            const isSelected = selectedFeature?.id === feature.id;
            return (
              <button
                key={feature.id}
                onClick={() => handleFeatureClick(feature)}
                className={`feature-guide-item ${isSelected ? 'selected' : ''}`}
              >
                <Icon className={`w-4 h-4 ${feature.color}`} />
                <span className="feature-guide-label">{feature.label}</span>
              </button>
            );
          })}
        </div>
      </WidgetBody>
    </>
  );
}

FeatureGuideWidget.defaultSize = 'narrow';
