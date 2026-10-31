/**
 * Formats any error (string, Error instance, Axios response, structured API object, array)
 * into a safe, human-readable string suitable for direct rendering in JSX.
 *
 * CRITICAL: This function GUARANTEES that it will NEVER return an object, array, null, or undefined.
 * It prevents React Minified Error #31 ("Objects are not valid as a React child").
 *
 * @param {unknown} error - The error to format
 * @param {string} [fallback] - Default fallback message if no meaningful error text is found
 * @returns {string} - A clean, user-friendly error message string
 */
export const formatErrorMessage = (error, fallback = 'An unexpected error occurred. Please try again.') => {
  if (error === null || error === undefined) {
    return fallback;
  }

  // 1. Primitive string handling
  if (typeof error === 'string') {
    const trimmed = error.trim();
    if (!trimmed) {
      return fallback;
    }

    // Handle stringified JSON error objects (e.g. from cloud proxies or loggers)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return formatErrorMessage(parsed, fallback);
        }
      } catch {
        // Not valid JSON, continue with string handling
      }
    }

    // Handle HTML error pages (e.g. 502 Bad Gateway or 504 Gateway Timeout from edge proxies)
    if (
      trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<html') ||
      trimmed.includes('<body') ||
      trimmed.includes('502 Bad Gateway') ||
      trimmed.includes('504 Gateway Timeout')
    ) {
      if (trimmed.includes('502') || trimmed.includes('Bad Gateway')) {
        return 'Server is temporarily unavailable (502 Bad Gateway). Please try again shortly.';
      }
      if (trimmed.includes('504') || trimmed.includes('Gateway Timeout')) {
        return 'Server took too long to respond (504 Gateway Timeout). Please try again.';
      }
      return 'The server encountered an error and could not complete your request. Please try again later.';
    }

    return trimmed;
  }

  // 2. Array handling (e.g. multiple validation error messages)
  if (Array.isArray(error)) {
    const messages = error
      .map((item) => formatErrorMessage(item, ''))
      .filter((msg) => typeof msg === 'string' && msg.trim().length > 0);

    if (messages.length > 0) {
      return messages.join(', ');
    }
    return fallback;
  }

  // 3. Primitive non-object types (number, boolean, bigint)
  if (typeof error !== 'object') {
    return String(error);
  }

  // 4. Axios error or object containing an HTTP response
  if (error.response && typeof error.response === 'object') {
    const { status, data } = error.response;

    if (data !== undefined && data !== null) {
      // 4a. Response data is a string
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
          if (status === 502) return 'Bad Gateway (502). The backend server is temporarily unavailable.';
          if (status === 503) return 'Service Unavailable (503). Please try again shortly.';
          if (status === 504) return 'Gateway Timeout (504). The server took too long to respond.';
          if (status === 404) return 'The requested resource or endpoint was not found (404).';
          return `Server returned an error (${status || 'unknown'}). Please try again.`;
        }
        if (trimmed) return trimmed;
      }

      // 4b. Response data is an object
      if (typeof data === 'object') {
        // Express-validator style array: { errors: [ { msg: '...' } ] }
        if (Array.isArray(data.errors) && data.errors.length > 0) {
          const list = data.errors
            .map((item) => {
              if (typeof item === 'string') return item;
              if (item && typeof item === 'object') {
                return item.msg || item.message || item.error || '';
              }
              return '';
            })
            .filter((msg) => typeof msg === 'string' && msg.trim().length > 0);

          if (list.length > 0) {
            return list.join(', ');
          }
        }

        // Object containing { error: { code, message } } or { error: "..." }
        if (data.error !== undefined && data.error !== null) {
          const extracted = formatErrorMessage(data.error, '');
          if (extracted) return extracted;
        }

        // Object containing { message: "..." } or { message: { ... } }
        if (data.message !== undefined && data.message !== null) {
          const extracted = formatErrorMessage(data.message, '');
          if (extracted) return extracted;
        }

        // Object containing { msg: "..." }
        if (data.msg !== undefined && data.msg !== null) {
          const extracted = formatErrorMessage(data.msg, '');
          if (extracted) return extracted;
        }

        // Object containing { code: "..." } without a message
        if (data.code !== undefined && data.code !== null) {
          return `Error: ${data.code}`;
        }
      }
    }

    // HTTP status code fallbacks when no response body text is available
    if (status === 400) return 'Invalid request. Please check your submitted information.';
    if (status === 401) return 'Authentication required or session expired. Please log in again.';
    if (status === 403) return 'Access denied. You do not have permission to perform this action.';
    if (status === 404) return 'Requested service or resource could not be found (404).';
    if (status === 409) return 'Conflict. A record with this information already exists.';
    if (status === 422) return 'Validation failed. Please verify the entered data.';
    if (status === 429) return 'Too many requests. Please wait a few moments before trying again.';
    if (status >= 500) return 'Server encountered an internal error. Please try again later.';
  }

  // 5. Direct object with { error: ... }
  if (error.error !== undefined && error.error !== null) {
    const extracted = formatErrorMessage(error.error, '');
    if (extracted) return extracted;
  }

  // 6. Direct object with { message: ... } (e.g. { code: 'NOT_FOUND', message: 'The page could not be found' })
  if (error.message !== undefined && error.message !== null) {
    const extracted = formatErrorMessage(error.message, '');
    if (extracted) return extracted;
  }

  // 7. Direct object with { msg: ... }
  if (error.msg !== undefined && error.msg !== null) {
    const extracted = formatErrorMessage(error.msg, '');
    if (extracted) return extracted;
  }

  // 8. Direct object with { code: ... }
  if (error.code !== undefined && error.code !== null) {
    return `Error: ${error.code}`;
  }

  // 9. Standard Error instance fallback
  if (error instanceof Error && error.message) {
    return error.message;
  }

  // 10. Fallback: stringify object safely if it has custom properties
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== '{}') {
      return serialized;
    }
  } catch {
    // Ignore JSON serialization errors
  }

  return fallback;
};

export default formatErrorMessage;
