// Content script for ATOSS page (Vue.js UI)
// Performs automation: clicking buttons, extracting data

import type { DailyTimeData, TimeEntry } from '@atoss/shared';

console.log('ATOSS CLI Helper content script loaded');

// Get the iframe document (ATOSS content is inside an iframe)
function getIframeDocument(): Document {
  const iframe = document.querySelector('iframe#applicationIframe') as HTMLIFrameElement;
  if (!iframe || !iframe.contentDocument) {
    throw new Error('Could not find ATOSS iframe');
  }
  return iframe.contentDocument;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ ok: true });
    return;
  } else if (message.action === 'extractData') {
    extractTimeTrackingData(message.date)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (message.action === 'setData') {
    setTimeTrackingData(message.date, message.entries)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
});

// Extract time tracking data for a specific date
async function extractTimeTrackingData(targetDate: string): Promise<DailyTimeData> {
  try {
    // Wait for iframe to be available
    await waitForCondition(() => {
      const iframe = document.querySelector('iframe#applicationIframe') as HTMLIFrameElement;
      return iframe && iframe.contentDocument !== null;
    }, 3000);

    const iframeDoc = getIframeDocument();

    // Wait for "Edit time entry" link to appear
    await waitForCondition(() => {
      const links = Array.from(iframeDoc.querySelectorAll('div.frame-block-link'));
      return links.some(link => link.querySelector('.frame-block-link-text')?.textContent?.includes('Edit time entry'));
    }, 3000);

    // Click "Edit time entry"
    await clickEditTimeEntry(iframeDoc);

    // Wait for modal to appear
    await waitForElement('.modal-view.active', 3000, iframeDoc);

    // Wait for datepicker input
    await waitForElement('.date-picker input.input-real', 3000, iframeDoc);

    // Set the date to the target date
    await setDatepickerValue(targetDate, iframeDoc);

    // Wait for data to load after date change
    console.log('Waiting for data to load after date change...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract time entry data from the modal
    const timeEntries = await extractTimeEntriesFromModal(iframeDoc);

    // Close the modal by clicking Cancel button
    try {
      const cancelButton = Array.from(iframeDoc.querySelectorAll('.modal-view.active .modal-view-footer button.btn-secondary')).find(
        btn => btn.querySelector('.btn-text')?.textContent?.includes('Cancel')
      ) as HTMLElement;

      if (cancelButton) {
        console.log('Closing modal...');
        cancelButton.click();
      } else {
        console.warn('Cancel button not found, modal may remain open');
      }
    } catch (error) {
      console.warn('Error closing modal:', error);
    }

    return {
      date: targetDate,
      entries: timeEntries,
      rawData: `Extracted ${timeEntries.length} entries for date: ${targetDate}`
    };

  } catch (error) {
    console.error('Error extracting data:', error);
    throw error;
  }
}

// Extract time entries from the open modal
async function extractTimeEntriesFromModal(doc: Document): Promise<TimeEntry[]> {
  try {
    const modal = doc.querySelector('.modal-view.active');

    if (!modal) {
      console.error('Modal not found - this indicates a bug in the automation');
      throw new Error('Modal not found');
    }

    // Find the timeline div
    const timeline = modal.querySelector('.one-day-timebar .timeline');

    if (!timeline) {
      console.error('Timeline div not found in modal - this indicates a bug or page structure change');
      throw new Error('Timeline div not found in modal');
    }

    // Extract time points (start/end times)
    const timePointWrappers = Array.from(timeline.querySelectorAll('.time-point-wrapper')) as HTMLElement[];
    const timeIntervalWrappers = Array.from(timeline.querySelectorAll('.time-interval-wrapper')) as HTMLElement[];

    console.log(`Found ${timePointWrappers.length} time points and ${timeIntervalWrappers.length} intervals`);

    // If no time points, return empty array (valid for days with no entries)
    if (timePointWrappers.length === 0) {
      console.log('No time points found - returning empty entries');
      return [];
    }

    // Extract time values from time-point-wrapper divs
    const timePoints: string[] = [];
    timePointWrappers.forEach((wrapper, idx) => {
      const input = wrapper.querySelector('input.time-picker__input') as HTMLInputElement;
      if (input && input.value) {
        timePoints.push(input.value.trim());
        console.log(`Time point ${idx}: ${input.value.trim()}`);
      }
    });

    // Extract interval types from time-interval-wrapper divs
    const intervalTypes: string[] = [];
    timeIntervalWrappers.forEach((wrapper, idx) => {
      const label = wrapper.querySelector('.output-label') as HTMLElement;
      if (label && label.textContent) {
        intervalTypes.push(label.textContent.trim());
        console.log(`Interval ${idx}: ${label.textContent.trim()}`);
      }
    });

    // Build time entries: each interval connects two consecutive time points
    const entries: TimeEntry[] = [];
    for (let i = 0; i < intervalTypes.length; i++) {
      if (i < timePoints.length - 1) {
        const type = intervalTypes[i];

        // Skip break entries (they contain "break" or "absence" in the type)
        if (type.toLowerCase().includes('break') || type.toLowerCase().includes('absence')) {
          console.log(`Skipping break entry: ${timePoints[i]} - ${timePoints[i + 1]} (${type})`);
          continue;
        }

        const entry = {
          start: timePoints[i],
          end: timePoints[i + 1],
          type: type
        };
        console.log(`Entry ${i}: ${entry.start} - ${entry.end} (${entry.type})`);
        entries.push(entry);
      }
    }

    console.log(`Extracted ${entries.length} time entries`);
    return entries;

  } catch (error) {
    console.error('Error extracting fields:', error);
    throw error;
  }
}

// Helper: Wait for an element to appear in the DOM
function waitForElement(selector: string, timeout: number, doc: Document = document): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = doc.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = doc.querySelector(selector);
      if (element) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve(element);
      }
    });

    observer.observe(doc.body, {
      childList: true,
      subtree: true,
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout waiting for element: ${selector}`));
    }, timeout);
  });
}

// Helper: Wait for a condition to be true
function waitForCondition(
  condition: () => boolean,
  timeout: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (condition()) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      if (condition()) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('Timeout waiting for condition'));
      }
    }, 100);
  });
}

// Click "Edit time entry" link
async function clickEditTimeEntry(doc: Document): Promise<void> {
  const links = Array.from(doc.querySelectorAll('div.frame-block-link'));
  for (const link of links) {
    const textEl = link.querySelector('.frame-block-link-text');
    if (textEl && textEl.textContent?.trim() === 'Edit time entry') {
      (link as HTMLElement).click();
      return;
    }
  }
  throw new Error('Edit time entry link not found');
}

// Set datepicker value using native DOM events
async function setDatepickerValue(dateString: string, doc: Document): Promise<void> {
  const datepickerInput = doc.querySelector('.date-picker input.input-real') as HTMLInputElement;

  if (!datepickerInput) {
    throw new Error('Datepicker input not found');
  }

  console.log(`Setting datepicker to: ${dateString}`);

  simulateFocus(datepickerInput);
  datepickerInput.value = dateString;
  datepickerInput.dispatchEvent(new Event('input', { bubbles: true }));
  datepickerInput.dispatchEvent(new Event('change', { bubbles: true }));
  datepickerInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
  simulateBlur(datepickerInput);
}

// Set time tracking data for a specific date
async function setTimeTrackingData(targetDate: string, entries: TimeEntry[]): Promise<DailyTimeData> {
  try {
    // Wait for iframe to be available
    await waitForCondition(() => {
      const iframe = document.querySelector('iframe#applicationIframe') as HTMLIFrameElement;
      return iframe && iframe.contentDocument !== null;
    }, 3000);

    const iframeDoc = getIframeDocument();

    // Wait for "Edit time entry" link to appear
    await waitForCondition(() => {
      const links = Array.from(iframeDoc.querySelectorAll('div.frame-block-link'));
      return links.some(link => link.querySelector('.frame-block-link-text')?.textContent?.includes('Edit time entry'));
    }, 3000);

    // Click "Edit time entry"
    await clickEditTimeEntry(iframeDoc);

    // Wait for modal to appear
    await waitForElement('.modal-view.active', 3000, iframeDoc);

    // Wait for datepicker input
    await waitForElement('.date-picker input.input-real', 3000, iframeDoc);

    // Set the date to the target date
    await setDatepickerValue(targetDate, iframeDoc);

    // Wait for data to load after date change
    console.log('Waiting for data to load after date change...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify no entries exist
    const existingEntries = await extractTimeEntriesFromModal(iframeDoc);
    if (existingEntries.length > 0) {
      throw new Error(`Cannot set data: ${existingEntries.length} time entries already exist for ${targetDate}`);
    }

    console.log('No existing entries found, proceeding to add entries...');

    // Add all entries
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      console.log(`Adding entry ${i + 1}/${entries.length}`);

      // Click the Add button
      await clickAddButton(iframeDoc);

      // Wait for flyout to appear
      console.log('Waiting for flyout...');
      await waitForElement('.flyout', 5000, iframeDoc);
      console.log('Flyout appeared');

      // Fill in the entry
      await fillTimeEntry(entry, iframeDoc);

      // Click Confirm to submit
      await clickConfirmButton(iframeDoc);

      // Wait for flyout to close
      console.log('Waiting for flyout to close...');
      try {
        await waitForCondition(() => {
          const flyout = iframeDoc.querySelector('.flyout');
          return !flyout;
        }, 5000);
        console.log('Flyout closed');
      } catch {
        // Log diagnostic info about the flyout state
        const flyout = iframeDoc.querySelector('.flyout') as HTMLElement;
        if (flyout) {
          const errorMsg = flyout.querySelector('.error-message, .validation-error, .alert, .notification');
          console.error('Flyout still open. Error element:', errorMsg?.textContent);
          console.error('Flyout HTML snippet:', flyout.innerHTML.substring(0, 1000));
        }
        throw new Error('Timeout waiting for flyout to close after Confirm');
      }

      // Wait a bit before adding the next entry
      if (i < entries.length - 1) {
        console.log('Waiting before adding next entry...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`All ${entries.length} entries added successfully`);

    // Close the modal by clicking Confirm button
    try {
      const confirmButton = Array.from(iframeDoc.querySelectorAll('.modal-view.active .modal-view-footer button.btn-dialog')).find(
        btn => btn.querySelector('.btn-text')?.textContent?.includes('Confirm')
      ) as HTMLElement;

      if (confirmButton) {
        console.log('Closing main modal with Confirm...');
        confirmButton.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        console.warn('Confirm button not found in main modal');
      }
    } catch (error) {
      console.warn('Error closing modal:', error);
    }

    return {
      date: targetDate,
      entries: entries,
      rawData: `Set ${entries.length} entries for date: ${targetDate}`
    };

  } catch (error) {
    console.error('Error setting data:', error);
    throw error;
  }
}

// Click the Add button
async function clickAddButton(doc: Document): Promise<void> {
  const addButton = doc.querySelector('button[data-test="ws-table-features-band-add-entry-button"]') as HTMLElement;

  if (!addButton) {
    throw new Error('Add button not found');
  }

  console.log('Clicking Add button...');
  addButton.click();
}

// Simulate focus on an input (works even when tab is in background)
function simulateFocus(input: HTMLInputElement): void {
  input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('focus', { bubbles: false }));
  input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

// Simulate blur on an input (works even when tab is in background)
function simulateBlur(input: HTMLInputElement): void {
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
  input.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
}

// Set an input value using native DOM events (for Vue.js reactivity)
// Uses synthetic focus events that work in background tabs
function setInputValue(input: HTMLInputElement, value: string): void {
  simulateFocus(input);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// Fill in a single time entry in the flyout form
async function fillTimeEntry(entry: TimeEntry, doc: Document): Promise<void> {
  console.log(`Filling time entry: ${entry.start} - ${entry.end}, type: ${entry.type}`);

  // Find the flyout
  const flyout = doc.querySelector('.flyout') as HTMLElement;
  if (!flyout) {
    throw new Error('Flyout not found');
  }

  // Find time pickers by prefix text
  const timePickers = Array.from(flyout.querySelectorAll('.time-picker')) as HTMLElement[];
  const fromTimePicker = timePickers.find(picker =>
    picker.querySelector('.time-picker__prefix')?.textContent?.includes('From')
  );
  const toTimePicker = timePickers.find(picker =>
    picker.querySelector('.time-picker__prefix')?.textContent?.includes('To')
  );

  if (!fromTimePicker || !toTimePicker) {
    throw new Error('Time pickers not found in flyout');
  }

  const fromInput = fromTimePicker.querySelector('input.time-picker__input') as HTMLInputElement;
  const toInput = toTimePicker.querySelector('input.time-picker__input') as HTMLInputElement;

  if (!fromInput || !toInput) {
    throw new Error('Time input elements not found');
  }

  // Set "From" time
  console.log(`Setting From time: ${entry.start}`);
  setInputValue(fromInput, entry.start);
  // Press Enter to commit the time value, then blur
  fromInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  fromInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  simulateBlur(fromInput);
  console.log(`From input value after set: "${fromInput.value}"`);

  // Small delay between fields
  await new Promise(resolve => setTimeout(resolve, 500));

  // Set "To" time
  console.log(`Setting To time: ${entry.end}`);
  setInputValue(toInput, entry.end);
  // Press Enter to commit the time value, then blur
  toInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  toInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
  simulateBlur(toInput);
  console.log(`To input value after set: "${toInput.value}"`);

  // Small delay before setting type
  await new Promise(resolve => setTimeout(resolve, 500));

  // Set type field (use "Presence" if not provided)
  const typeValue = entry.type || 'Presence';
  console.log(`Setting type: ${typeValue}`);

  const typeInput = flyout.querySelector('.search-select input.input-real') as HTMLInputElement;
  if (!typeInput) {
    throw new Error('Type input not found');
  }

  // Set the value and trigger search via synthetic events
  setInputValue(typeInput, typeValue);

  // Wait for search results popup to appear (at document level, not inside flyout)
  console.log('Waiting for search results popup...');
  await waitForElement('.popup__content.open.popup__content--search-select', 5000, doc);

  // Small delay for results to populate
  await new Promise(resolve => setTimeout(resolve, 500));

  // Find matching item in the popup
  const popup = doc.querySelector('.popup__content.open.popup__content--search-select');
  if (!popup) {
    throw new Error('Search results popup not found');
  }

  const items = Array.from(popup.querySelectorAll('.table-search-select__content__item')) as HTMLElement[];
  console.log(`Found ${items.length} items in search results`);

  let selectedItem: HTMLElement | null = null;
  const lowerTypeValue = typeValue.toLowerCase();

  for (const item of items) {
    const valueEl = item.querySelector('.table-search-select__content__item__value');
    const itemText = valueEl?.textContent?.trim() || '';
    console.log(`  Checking item: "${itemText}"`);

    // Exact match first
    if (itemText.toLowerCase() === lowerTypeValue) {
      console.log(`  -> Exact match!`);
      selectedItem = item;
      break;
    }

    // Substring match as fallback
    if (!selectedItem && itemText.toLowerCase().includes(lowerTypeValue)) {
      console.log(`  -> Substring match!`);
      selectedItem = item;
    }
  }

  if (selectedItem) {
    console.log(`Clicking matching item for "${typeValue}": "${selectedItem.textContent?.trim()}"`);
    selectedItem.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    console.warn(`No matching item found for type "${typeValue}"`);
  }

  console.log('Time entry filled');
}

// Click the Confirm button in the flyout
async function clickConfirmButton(doc: Document): Promise<void> {
  const flyout = doc.querySelector('.flyout') as HTMLElement;
  if (!flyout) {
    throw new Error('Flyout not found');
  }

  const confirmButton = Array.from(flyout.querySelectorAll('.submits-band button.btn-dialog')).find(
    btn => btn.querySelector('.btn-text')?.textContent?.includes('Confirm')
  ) as HTMLButtonElement;

  if (!confirmButton) {
    throw new Error('Confirm button not found in flyout');
  }

  // Wait for button to become enabled
  console.log('Waiting for Confirm button to become enabled...');
  await waitForCondition(() => {
    return !confirmButton.disabled && !confirmButton.hasAttribute('disabled');
  }, 10000);

  console.log('Clicking Confirm button...');
  confirmButton.click();
}
