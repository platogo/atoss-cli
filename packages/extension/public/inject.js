// This script runs in the page context (not content script isolation)
// It can access window.zk and communicate with the content script via DOM events

console.log('ATOSS inject script loaded');

// Listen for set-date requests from content script
document.addEventListener('atoss-set-date', (e) => {
  const detail = e.detail;

  const input = document.querySelector(`[data-atoss-temp-id="${detail.uniqueId}"]`);
  if (!input) {
    console.error('Could not find input element');
    return;
  }

  if (!window.zk || !window.zk.Widget) {
    console.error('ZK not available');
    document.dispatchEvent(new CustomEvent('atoss-set-date-error', {
      detail: { uniqueId: detail.uniqueId, error: 'ZK not available' }
    }));
    return;
  }

  const widget = window.zk.Widget.$(input);
  if (!widget) {
    console.error('Widget not found');
    document.dispatchEvent(new CustomEvent('atoss-set-date-error', {
      detail: { uniqueId: detail.uniqueId, error: 'Widget not found' }
    }));
    return;
  }

  // Parse YYYY-MM-DD string to Date object
  // detail.value is in format "2025-12-01"
  const parts = detail.value.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JavaScript months are 0-indexed
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, month, day);

  widget.setValue(dateObj);

  if (typeof widget.fire === 'function') {
    widget.fire('onChange', { value: dateObj });
  }

  document.dispatchEvent(new CustomEvent('atoss-set-date-complete', {
    detail: { uniqueId: detail.uniqueId }
  }));
});
