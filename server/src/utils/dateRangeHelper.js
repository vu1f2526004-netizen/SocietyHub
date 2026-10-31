const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Normalizes any month string or index into human-readable billing format: "October 2026"
 */
function toBillingMonth(year, monthOneIndexed) {
  const monthName = MONTH_NAMES[monthOneIndexed - 1];
  return `${monthName} ${year}`;
}

/**
 * Format a Date object to "DD MMM YYYY" (e.g. "01 Oct 2026")
 */
function formatDisplayDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Resolves period filter query into exact date bounds and metadata.
 *
 * Supported query options:
 * - period: 'all' | 'this-month' | 'last-month' | 'month' | 'this-year' | 'last-year' | 'custom'
 * - month: '2026-10' | '10' | 'October 2026' | 'ALL'
 * - year: 2026
 * - startDate: '2026-10-01'
 * - endDate: '2026-10-31'
 *
 * @param {object} query - Express request query object
 * @returns {object} { isAllTime, startDate, endDate, periodLabel, billingMonth, monthKey, year }
 */
function resolveDateRange(query = {}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-indexed

  let period = (query.period || '').trim().toLowerCase();
  const rawMonth = (query.month || '').trim();
  const rawYear = query.year ? parseInt(query.year, 10) : null;
  const rawStartDate = (query.startDate || '').trim();
  const rawEndDate = (query.endDate || '').trim();

  // If month is explicit 'ALL', force all-time
  if (rawMonth.toUpperCase() === 'ALL' || period === 'all' || period === 'all-time') {
    return {
      isAllTime: true,
      startDate: null,
      endDate: null,
      periodLabel: 'All Time',
      billingMonth: null,
      monthKey: null,
      year: null
    };
  }

  // 1. Explicit Custom Date Range
  if (period === 'custom' || (rawStartDate && rawEndDate)) {
    const start = new Date(rawStartDate);
    const end = new Date(rawEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const err = new Error('Invalid date format for custom date range. Please provide valid YYYY-MM-DD dates.');
      err.statusCode = 400;
      throw err;
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (start.getTime() > end.getTime()) {
      const err = new Error('Invalid date range: start date must be before or equal to end date.');
      err.statusCode = 400;
      throw err;
    }

    return {
      isAllTime: false,
      startDate: start,
      endDate: end,
      periodLabel: `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`,
      billingMonth: null,
      monthKey: null,
      year: null
    };
  }

  // 2. This Month Preset
  if (period === 'this-month' || period === 'current-month') {
    const start = new Date(currentYear, currentMonthIdx, 1, 0, 0, 0, 0);
    const end = new Date(currentYear, currentMonthIdx + 1, 0, 23, 59, 59, 999);
    const mKey = `${currentYear}-${String(currentMonthIdx + 1).padStart(2, '0')}`;
    const bMonth = toBillingMonth(currentYear, currentMonthIdx + 1);

    return {
      isAllTime: false,
      startDate: start,
      endDate: end,
      periodLabel: `${bMonth} (This Month)`,
      billingMonth: bMonth,
      monthKey: mKey,
      year: currentYear
    };
  }

  // 3. Last Month Preset
  if (period === 'last-month' || period === 'previous-month') {
    const lastMonthIdx = currentMonthIdx - 1;
    const targetYear = lastMonthIdx < 0 ? currentYear - 1 : currentYear;
    const normalizedMonthIdx = (lastMonthIdx + 12) % 12;

    const start = new Date(targetYear, normalizedMonthIdx, 1, 0, 0, 0, 0);
    const end = new Date(targetYear, normalizedMonthIdx + 1, 0, 23, 59, 59, 999);
    const mKey = `${targetYear}-${String(normalizedMonthIdx + 1).padStart(2, '0')}`;
    const bMonth = toBillingMonth(targetYear, normalizedMonthIdx + 1);

    return {
      isAllTime: false,
      startDate: start,
      endDate: end,
      periodLabel: `${bMonth} (Last Month)`,
      billingMonth: bMonth,
      monthKey: mKey,
      year: targetYear
    };
  }

  // 4. This Year Preset
  if (period === 'this-year' || period === 'current-year') {
    const targetYear = rawYear && !isNaN(rawYear) ? rawYear : currentYear;
    const start = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    return {
      isAllTime: false,
      startDate: start,
      endDate: end,
      periodLabel: `Year ${targetYear}${targetYear === currentYear ? ' (This Year)' : ''}`,
      billingMonth: null,
      monthKey: null,
      year: targetYear
    };
  }

  // 5. Last Year Preset
  if (period === 'last-year' || period === 'previous-year') {
    const targetYear = rawYear && !isNaN(rawYear) ? rawYear : (currentYear - 1);
    const start = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    return {
      isAllTime: false,
      startDate: start,
      endDate: end,
      periodLabel: `Year ${targetYear}${targetYear === currentYear - 1 ? ' (Last Year)' : ''}`,
      billingMonth: null,
      monthKey: null,
      year: targetYear
    };
  }

  // 6. Selected Month & Year (e.g. month="2026-07" or rawMonth="July 2026" or month="7" & year="2026")
  if (rawMonth || period === 'month') {
    let targetYear = rawYear && !isNaN(rawYear) ? rawYear : currentYear;
    let targetMonthIdx = currentMonthIdx;

    if (rawMonth) {
      const trimmed = rawMonth.trim();
      // Handle "YYYY-MM" or "MM"
      const ymMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
      if (ymMatch) {
        targetYear = parseInt(ymMatch[1], 10);
        targetMonthIdx = parseInt(ymMatch[2], 10) - 1;
      } else if (/^\d{1,2}$/.test(trimmed)) {
        const m = parseInt(trimmed, 10);
        if (m >= 1 && m <= 12) {
          targetMonthIdx = m - 1;
        }
      } else {
        // Robust token scanning for things like "August 2026", "2026-2026-08", etc.
        const tokens = trimmed.split(/[\s-]+/).filter(Boolean);
        for (const token of tokens) {
          if (/^\d{4}$/.test(token)) {
            targetYear = parseInt(token, 10);
          } else if (/^\d{1,2}$/.test(token)) {
            const m = parseInt(token, 10);
            if (m >= 1 && m <= 12) {
              targetMonthIdx = m - 1;
            }
          } else {
            const foundIdx = MONTH_NAMES.findIndex(
              name => name.toLowerCase().startsWith(token.toLowerCase())
            );
            if (foundIdx !== -1) {
              targetMonthIdx = foundIdx;
            }
          }
        }
      }
    }

    if (targetMonthIdx < 0 || targetMonthIdx > 11 || isNaN(targetYear)) {
      const err = new Error('Invalid month or year parameter provided.');
      err.statusCode = 400;
      throw err;
    }

    const start = new Date(targetYear, targetMonthIdx, 1, 0, 0, 0, 0);
    const end = new Date(targetYear, targetMonthIdx + 1, 0, 23, 59, 59, 999);
    const mKey = `${targetYear}-${String(targetMonthIdx + 1).padStart(2, '0')}`;
    const bMonth = toBillingMonth(targetYear, targetMonthIdx + 1);

    return {
      isAllTime: false,
      startDate: start,
      endDate: end,
      periodLabel: bMonth,
      billingMonth: bMonth,
      monthKey: mKey,
      year: targetYear
    };
  }

  // 7. Selected Year only (e.g. period="year" or year=2026)
  if (rawYear && !isNaN(rawYear)) {
    const start = new Date(rawYear, 0, 1, 0, 0, 0, 0);
    const end = new Date(rawYear, 11, 31, 23, 59, 59, 999);

    return {
      isAllTime: false,
      startDate: start,
      endDate: end,
      periodLabel: `Year ${rawYear}`,
      billingMonth: null,
      monthKey: null,
      year: rawYear
    };
  }

  // Default fallback: All Time if no period or filter specified
  return {
    isAllTime: true,
    startDate: null,
    endDate: null,
    periodLabel: 'All Time',
    billingMonth: null,
    monthKey: null,
    year: null
  };
}

module.exports = {
  MONTH_NAMES,
  toBillingMonth,
  formatDisplayDate,
  resolveDateRange
};
