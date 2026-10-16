/**
 * Razorpay Standard Checkout Utility
 * Loads the external checkout script asynchronously and orchestrates the checkout modal.
 */

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // If Razorpay is already attached to window
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    if (typeof document === 'undefined') {
      resolve(false);
      return;
    }

    // Check if script tag is already in DOM
    const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
    const existingScript = document.querySelector(`script[src="${SCRIPT_URL}"]`);

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      resolve(false);
    };

    document.body.appendChild(script);
  });
};

/**
 * Check if a Razorpay Key ID is valid format (Test or Live) and not a placeholder
 *
 * @param {string} key
 * @returns {boolean}
 */
export const isRazorpayKeyConfigured = (key) => {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (
    trimmed === '' ||
    trimmed === 'your_razorpay_test_key_id' ||
    trimmed === 'your_razorpay_key_id' ||
    trimmed === 'rzp_test_placeholder' ||
    trimmed === 'rzp_test_dummy'
  ) {
    return false;
  }
  return trimmed.startsWith('rzp_test_') || trimmed.startsWith('rzp_live_');
};

/**
 * Open Razorpay Standard Checkout modal
 *
 * @param {Object} params
 * @param {Object} params.order - The order created by the backend (order.id, order.amount, etc.)
 * @param {Object} params.bill - The MaintenanceBill document
 * @param {Object} params.user - Authenticated Resident user details
 * @param {string} params.keyId - Razorpay public test Key ID
 * @param {boolean} params.isMock - Whether backend order is a mock order
 * @param {Function} params.onSuccess - Callback invoked when user authorizes payment in modal
 * @param {Function} params.onDismiss - Callback invoked when user closes the modal without completing payment
 * @param {Function} params.onFailure - Callback invoked on payment failure event
 */
export const openRazorpayCheckout = ({
  order,
  bill,
  user,
  keyId,
  isMock,
  onSuccess,
  onDismiss,
  onFailure
}) => {
  if (typeof window === 'undefined' || !window.Razorpay) {
    throw new Error('Razorpay Checkout SDK is not loaded. Please verify your internet connection.');
  }

  const razorpayKey = (keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();

  // Guard against unconfigured or mock credentials to prevent Razorpay modal "Oops! Something went wrong" crash
  if (!isRazorpayKeyConfigured(razorpayKey) || isMock || (order?.id && order.id.startsWith('order_mock_'))) {
    const errorMsg = !isRazorpayKeyConfigured(razorpayKey)
      ? 'Razorpay Test Key ID is not configured (found placeholder or missing key). Please configure VITE_RAZORPAY_KEY_ID in client/.env and RAZORPAY_KEY_ID in server/.env with your valid Razorpay Test Key (starts with rzp_test_) to open Checkout.'
      : 'Razorpay is running in Mock Mode because RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are not configured on the server. Add your Razorpay Test Key pair to server/.env to launch the live Razorpay Checkout modal.';

    if (typeof onFailure === 'function') {
      onFailure({
        code: 'CREDENTIALS_NOT_CONFIGURED',
        description: errorMsg,
        reason: 'missing_razorpay_credentials'
      });
      return null;
    }
    throw new Error(errorMsg);
  }

  const options = {
    key: razorpayKey,
    amount: order.amount || Math.round(bill.amount * 100),
    currency: order.currency || 'INR',
    name: user?.societyName || 'SocietyHub',
    description: `Maintenance Bill - ${bill.month} (Flat ${bill.flatNumber || user?.flatNumber || 'N/A'})`,
    order_id: order.id,
    prefill: {
      name: user?.name || '',
      email: user?.email || '',
      contact: user?.mobile || user?.phone || ''
    },
    notes: {
      billId: bill._id,
      flatNumber: bill.flatNumber || user?.flatNumber || 'N/A',
      month: bill.month
    },
    theme: {
      color: '#0284c7'
    },
    modal: {
      ondismiss: () => {
        if (typeof onDismiss === 'function') {
          onDismiss();
        }
      }
    },
    handler: async (response) => {
      if (typeof onSuccess === 'function') {
        await onSuccess(response);
      }
    }
  };

  const rzp = new window.Razorpay(options);

  if (typeof onFailure === 'function') {
    rzp.on('payment.failed', (resp) => {
      onFailure(resp?.error || { description: 'Payment authorization failed' });
    });
  }

  rzp.open();
  return rzp;
};
