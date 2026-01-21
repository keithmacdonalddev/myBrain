import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Generic Dropdown component for select-like inputs
 * Can display icons, colors, and descriptions for options
 *
 * @param {Object} props
 * @param {*} props.value - Current selected value
 * @param {Function} props.onChange - Called with new value when selection changes
 * @param {Array} props.options - Array of option objects
 * @param {string} props.options[].value - Option value
 * @param {string} props.options[].label - Display label
 * @param {React.ComponentType} props.options[].icon - Optional icon component
 * @param {string} props.options[].color - Optional color class for icon
 * @param {string} props.options[].description - Optional description text
 * @param {string} props.placeholder - Placeholder when no value selected
 * @param {string} props.className - Additional CSS classes for trigger button
 * @param {string} props.menuClassName - Additional CSS classes for menu
 * @param {number} props.minWidth - Minimum width for menu (default: 160)
 * @param {boolean} props.showCheck - Show checkmark on selected item
 * @param {boolean} props.disabled - Disable the dropdown
 */
export default function Dropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  menuClassName = '',
  minWidth = 160,
  showCheck = false,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Find current option
  const currentOption = options.find(opt => opt.value === value);
  const Icon = currentOption?.icon;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg active:bg-bg/80 transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {Icon && <Icon className={`w-4 h-4 ${currentOption?.color || 'text-muted'}`} />}
        <span className={currentOption ? 'text-text' : 'text-muted'}>
          {currentOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Dropdown Menu */}
          <div
            className={`absolute top-full left-0 mt-1 bg-panel border border-border rounded-lg shadow-lg z-20 py-1 animate-scale-in ${menuClassName}`}
            style={{ minWidth: `${minWidth}px` }}
          >
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-bg active:bg-bg/80 text-sm text-left min-h-[44px] transition-colors ${
                    isSelected ? 'bg-bg' : ''
                  }`}
                >
                  {OptionIcon && (
                    <OptionIcon className={`w-4 h-4 ${option.color || 'text-muted'}`} />
                  )}
                  <span className="flex-1">{option.label}</span>
                  {showCheck && isSelected && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Dropdown with description shown below each option label
 */
export function DropdownWithDescription({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  className = '',
  minWidth = 200,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentOption = options.find(opt => opt.value === value);
  const Icon = currentOption?.icon;

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg active:bg-bg/80 transition-colors text-sm min-h-[44px] disabled:opacity-50 ${className}`}
      >
        {Icon && <Icon className={`w-4 h-4 ${currentOption?.color || 'text-muted'}`} />}
        <span className={currentOption ? 'text-text' : 'text-muted'}>
          {currentOption?.label || placeholder}
        </span>
        <ChevronDown className={`w-3 h-3 text-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 bg-panel border border-border rounded-lg shadow-lg z-20 py-1 animate-scale-in"
            style={{ minWidth: `${minWidth}px` }}
          >
            {options.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = value === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-3 hover:bg-bg active:bg-bg/80 text-sm text-left transition-colors ${
                    isSelected ? 'bg-bg' : ''
                  }`}
                >
                  {OptionIcon && (
                    <OptionIcon className={`w-4 h-4 mt-0.5 ${option.color || 'text-muted'}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-muted mt-0.5">{option.description}</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
