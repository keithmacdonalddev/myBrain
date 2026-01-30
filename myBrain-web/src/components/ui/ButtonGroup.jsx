/**
 * ButtonGroup - Segmented toggle for view switching (List/Board/Calendar etc.)
 *
 * @param {Array} options - Array of { value, label, icon? }
 * @param {string} value - Currently selected value
 * @param {Function} onChange - Called with new value when selection changes
 * @param {boolean} iconOnly - Show only icons on all screen sizes (default: false)
 */
export default function ButtonGroup({ options, value, onChange, iconOnly = false }) {
  return (
    <div className="flex p-1 bg-panel border border-border rounded-xl shadow-theme-card">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
              isActive
                ? 'bg-primary text-white'
                : 'text-muted hover:text-text hover:bg-bg'
            }`}
            title={opt.label}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {!iconOnly && <span className="hidden sm:inline">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
