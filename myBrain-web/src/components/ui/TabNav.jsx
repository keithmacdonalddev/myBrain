/**
 * TabNav - Reusable tab navigation component
 *
 * Two variants:
 * - "underline": border-bottom indicator (tasks page style)
 * - "pill": rounded pill background (notes page style)
 *
 * @param {Array} tabs - Array of { id, label, icon?, count? }
 * @param {string} activeTab - Currently active tab id
 * @param {Function} onTabChange - Called with tab id when tab is clicked
 * @param {string} variant - "underline" (default) or "pill"
 */
export default function TabNav({ tabs, activeTab, onTabChange, variant = 'underline' }) {
  if (variant === 'pill') {
    return (
      <div className="flex items-center gap-1 p-1 bg-panel border border-border rounded-xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-muted hover:text-text hover:bg-bg'
              }`}
            >
              {Icon && <Icon className="w-4 h-4" />}
              {tab.label}
              {tab.count != null && tab.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-panel2 text-muted'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: underline variant
  return (
    <div className="flex border-b border-border">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-text hover:border-border'
            }`}
          >
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-primary/10 text-primary' : 'bg-panel2 text-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
