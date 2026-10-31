import { useState, useEffect, useCallback, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to manage persistent date-filter state across re-renders,
 * refreshes, and route changes.
 *
 * Priority order:
 * 1. URL Query Parameters (?period=...&month=...&year=...)
 * 2. User-scoped localStorage persistence (societyhub_filter_${userId}_${pageKey})
 * 3. Default preset (e.g. 'this-month')
 */
export const usePeriodFilter = (pageKey = 'finance', defaultPreset = 'this-month') => {
  const { user } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentNow = new Date();
  const currentYear = currentNow.getFullYear();
  const currentMonth = String(currentNow.getMonth() + 1).padStart(2, '0');
  const currentMonthKey = `${currentYear}-${currentMonth}`;

  const storageKey = `societyhub_filter_${user?._id || 'user'}_${pageKey}`;

  // Helper to resolve initial state
  const getInitialFilter = () => {
    // 1. URL query parameters
    const urlPeriod = searchParams.get('period');
    const urlMonth = searchParams.get('month');
    const urlYear = searchParams.get('year');
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');

    if (urlPeriod) {
      return {
        period: urlPeriod,
        month: urlMonth || (urlPeriod === 'month' ? currentMonthKey : ''),
        year: urlYear || String(currentYear),
        startDate: urlStartDate || '',
        endDate: urlEndDate || ''
      };
    }

    // 2. Safe per-user stored filter in localStorage
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.period) {
          return parsed;
        }
      }
    } catch (e) {
      // storage unavailable or malformed
    }

    // 3. Fallback default
    return {
      period: defaultPreset,
      month: defaultPreset === 'this-month' ? currentMonthKey : '',
      year: String(currentYear),
      startDate: '',
      endDate: ''
    };
  };

  const [filterState, setFilterState] = useState(getInitialFilter);

  const applyFilter = useCallback((newFilter) => {
    const updated = {
      period: newFilter.period || defaultPreset,
      month: newFilter.month || '',
      year: newFilter.year ? String(newFilter.year) : String(currentYear),
      startDate: newFilter.startDate || '',
      endDate: newFilter.endDate || ''
    };

    setFilterState(updated);

    // Save to user-scoped localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {}

    // Update URL query parameters
    setSearchParams((prevParams) => {
      const next = new URLSearchParams(prevParams);
      next.set('period', updated.period);
      if (updated.month) next.set('month', updated.month);
      else next.delete('month');
      if (updated.year) next.set('year', updated.year);
      else next.delete('year');
      if (updated.startDate) next.set('startDate', updated.startDate);
      else next.delete('startDate');
      if (updated.endDate) next.set('endDate', updated.endDate);
      else next.delete('endDate');
      return next;
    }, { replace: true });

    return updated;
  }, [setSearchParams, storageKey, currentYear, defaultPreset]);

  // Sync state if URL search parameters change externally (e.g. back/forward navigation)
  useEffect(() => {
    const urlPeriod = searchParams.get('period');
    if (urlPeriod) {
      setFilterState({
        period: urlPeriod,
        month: searchParams.get('month') || '',
        year: searchParams.get('year') || String(currentYear),
        startDate: searchParams.get('startDate') || '',
        endDate: searchParams.get('endDate') || ''
      });
    }
  }, [searchParams, currentYear]);

  return {
    filterState,
    applyFilter,
    setFilterState
  };
};

export default usePeriodFilter;
