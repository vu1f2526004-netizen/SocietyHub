import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Check, ChevronDown, AlertCircle } from 'lucide-react';
import RefreshButton from '../shared/RefreshButton';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
];

const PERIOD_PRESETS = [
  { value: 'this-month', label: 'This Month' },
  { value: 'last-month', label: 'Last Month' },
  { value: 'month', label: 'Select Month & Year' },
  { value: 'this-year', label: 'This Year' },
  { value: 'last-year', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom Date Range' }
];

const parseMonthValue = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts[1]) {
      const m = parseInt(parts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) {
        return String(m).padStart(2, '0');
      }
    }
  }
  const num = parseInt(str, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return String(num).padStart(2, '0');
  }
  return '';
};

const parseYearValue = (val, monthVal) => {
  if (val && !isNaN(parseInt(val, 10))) {
    return String(parseInt(val, 10)).trim();
  }
  if (monthVal && String(monthVal).includes('-')) {
    const y = parseInt(String(monthVal).split('-')[0], 10);
    if (!isNaN(y) && y > 1900 && y < 2200) {
      return String(y);
    }
  }
  return '';
};

const PeriodFilterBar = ({
  initialPeriod = 'this-month',
  initialMonth = '',
  initialYear = '',
  initialStartDate = '',
  initialEndDate = '',
  filterState = null,
  periodLabel = '',
  onApply,
  onApplyFilter,
  onRefresh,
  loading = false,
  refreshing = false,
  availableYears = [],
  showRefresh = true
}) => {
  const currentNow = new Date();
  const currentYearStr = String(currentNow.getFullYear());
  const currentMonthStr = String(currentNow.getMonth() + 1).padStart(2, '0');

  const effPeriod = filterState?.period || initialPeriod || 'this-month';
  const effMonth = filterState?.month || initialMonth || '';
  const effYear = filterState?.year || initialYear || '';
  const effStartDate = filterState?.startDate || initialStartDate || '';
  const effEndDate = filterState?.endDate || initialEndDate || '';
  const effApply = onApply || onApplyFilter;

  const [preset, setPreset] = useState(effPeriod);
  const [selectedMonth, setSelectedMonth] = useState(() => parseMonthValue(effMonth) || currentMonthStr);
  const [selectedYear, setSelectedYear] = useState(() => parseYearValue(effYear, effMonth) || currentYearStr);
  const [startDate, setStartDate] = useState(effStartDate);
  const [endDate, setEndDate] = useState(effEndDate);
  const [validationError, setValidationError] = useState('');

  // Generate sensible year options (current year - 5 to current year + 2, merged with availableYears)
  const baseYear = parseInt(currentYearStr, 10);
  const defaultYearList = [baseYear + 1, baseYear, baseYear - 1, baseYear - 2, baseYear - 3];
  const mergedYears = Array.from(new Set([...defaultYearList, ...(availableYears || []).map(y => parseInt(y, 10))]))
    .filter(y => !isNaN(y))
    .sort((a, b) => b - a);

  // Synchronize when initial props change
  useEffect(() => {
    if (effPeriod) setPreset(effPeriod);
    const parsedM = parseMonthValue(effMonth);
    if (parsedM) setSelectedMonth(parsedM);
    const parsedY = parseYearValue(effYear, effMonth);
    if (parsedY) setSelectedYear(parsedY);
    if (effStartDate) setStartDate(effStartDate);
    if (effEndDate) setEndDate(effEndDate);
  }, [effPeriod, effMonth, effYear, effStartDate, effEndDate]);

  const handlePresetChange = (newPreset) => {
    setPreset(newPreset);
    setValidationError('');

    // If changing to a self-contained preset, automatically trigger effApply
    if (['this-month', 'last-month', 'this-year', 'last-year', 'all'].includes(newPreset)) {
      effApply?.({
        period: newPreset,
        month: `${selectedYear}-${selectedMonth}`,
        year: selectedYear,
        startDate: '',
        endDate: ''
      });
    }
  };

  const handleApplyClick = (e) => {
    e?.preventDefault();
    setValidationError('');

    if (preset === 'custom') {
      if (!startDate || !endDate) {
        setValidationError('Please select both start and end dates.');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setValidationError('Start date must be before or equal to end date.');
        return;
      }
      effApply?.({
        period: 'custom',
        startDate,
        endDate
      });
      return;
    }

    if (preset === 'month') {
      effApply?.({
        period: 'month',
        month: `${selectedYear}-${selectedMonth}`,
        year: selectedYear
      });
      return;
    }

    effApply?.({
      period: preset,
      year: selectedYear,
      month: `${selectedYear}-${selectedMonth}`
    });
  };

  // Determine if user has unapplied pending changes
  const activeMonth = parseMonthValue(effMonth) || currentMonthStr;
  const activeYear = parseYearValue(effYear, effMonth) || currentYearStr;
  const isMonthPending = preset === 'month' && (selectedMonth !== activeMonth || selectedYear !== activeYear);
  const isCustomPending = preset === 'custom' && (startDate !== effStartDate || endDate !== effEndDate);
  const hasPendingChanges = isMonthPending || isCustomPending;

  return (
    <div
      style={{
        backgroundColor: 'var(--sh-white)',
        border: '1px solid var(--sh-slate-200)',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: 'var(--sh-shadow-xs)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sh-slate-600)', fontSize: '0.875rem', fontWeight: '600' }}>
            <Filter size={16} color="#0284c7" />
            <span>Reporting Period:</span>
          </div>

          <div style={{ position: 'relative' }}>
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                padding: '8px 32px 8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--sh-slate-300)',
                backgroundColor: 'var(--sh-slate-100)',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'var(--sh-slate-900)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              color="var(--sh-slate-400)"
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
          </div>

          {/* Month & Year Controls */}
          {preset === 'month' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: isMonthPending ? '1px solid #0284c7' : '1px solid var(--sh-slate-300)',
                  backgroundColor: 'var(--sh-white)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  color: 'var(--sh-slate-900)'
                }}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: isMonthPending ? '1px solid #0284c7' : '1px solid var(--sh-slate-300)',
                  backgroundColor: 'var(--sh-white)',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  color: 'var(--sh-slate-900)'
                }}
              >
                {mergedYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleApplyClick}
                disabled={loading || refreshing}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isMonthPending ? '#0284c7' : '#0369a1',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: loading || refreshing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isMonthPending ? '0 0 0 2px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Check size={14} />
                <span>Apply</span>
              </button>

              {isMonthPending && (
                <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertCircle size={12} />
                  Pending apply
                </span>
              )}
            </div>
          )}

          {/* Custom Date Range Controls */}
          {preset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: isCustomPending ? '1px solid #0284c7' : '1px solid var(--sh-slate-300)',
                  backgroundColor: 'var(--sh-white)',
                  fontSize: '0.85rem',
                  color: 'var(--sh-slate-900)'
                }}
              />
              <span style={{ color: 'var(--sh-slate-500)', fontSize: '0.8rem' }}>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: isCustomPending ? '1px solid #0284c7' : '1px solid var(--sh-slate-300)',
                  backgroundColor: 'var(--sh-white)',
                  fontSize: '0.85rem',
                  color: 'var(--sh-slate-900)'
                }}
              />
              <button
                type="button"
                onClick={handleApplyClick}
                disabled={loading || refreshing}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isCustomPending ? '#0284c7' : '#0369a1',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: loading || refreshing ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: isCustomPending ? '0 0 0 2px rgba(2, 132, 199, 0.3)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Check size={14} />
                <span>Apply</span>
              </button>

              {isCustomPending && (
                <span style={{ fontSize: '0.75rem', color: '#0284c7', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <AlertCircle size={12} />
                  Pending apply
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right side: Active Applied Period Label & Standardized Refresh Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {periodLabel && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--sh-badge-info-bg)',
                border: '1px solid var(--sh-badge-info-border)',
                borderRadius: '8px',
                color: 'var(--sh-badge-info-text)',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}
            >
              <Calendar size={14} color="var(--sh-badge-info-text)" />
              <span>Viewing: {periodLabel}</span>
            </div>
          )}

          {showRefresh && (
            <RefreshButton
              onClick={onRefresh}
              refreshing={refreshing}
              loading={loading}
              title="Refresh records for the selected period"
            />
          )}
        </div>
      </div>

      {validationError && (
        <div style={{ color: '#dc2626', fontSize: '0.8rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={14} />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
};

export default PeriodFilterBar;
