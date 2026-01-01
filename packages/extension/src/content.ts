// Content script for ATOSS page
// Performs automation: clicking buttons, extracting data

import type { DailyTimeData, TimeEntry } from '@atoss/shared';

console.log('ATOSS CLI Helper content script loaded');

// Inject the script into iframe to access page context
function injectScriptIntoIframe(iframeDoc: Document) {
  // Check if already injected
  if (iframeDoc.querySelector('script[data-atoss-injected]')) {
    return;
  }

  const script = iframeDoc.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.setAttribute('data-atoss-injected', 'true');
  (iframeDoc.head || iframeDoc.documentElement).appendChild(script);
}

// Get the iframe document (ATOSS content is inside an iframe)
function getIframeDocument(): Document {
  const iframe = document.querySelector('iframe') as HTMLIFrameElement;
  if (!iframe || !iframe.contentDocument) {
    throw new Error('Could not find ATOSS iframe');
  }
  return iframe.contentDocument;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractData') {
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
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      return iframe && iframe.contentDocument !== null;
    }, 3000);

    const iframeDoc = getIframeDocument();

    // Inject our script into the iframe for page context access
    injectScriptIntoIframe(iframeDoc);

    // Wait for buttons to appear in iframe
    await waitForCondition(() => {
      const buttons = Array.from(iframeDoc.querySelectorAll('button.action-item'));
      return buttons.some(btn => btn.textContent?.includes('Edit time entry'));
    }, 3000);

    // Click "Edit time entry" button
    await clickButtonByText('Edit time entry', iframeDoc);

    // Wait for modal to appear
    await waitForElement('.modal-content', 3000, iframeDoc);

    // Wait for datepicker input
    await waitForElement('input[type="text"].datepicker', 3000, iframeDoc);

    // Set the date to the target date
    await setDatepickerValue(targetDate, iframeDoc);

    // Wait for data to load after date change
    console.log('Waiting for data to load after date change...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract time entry data from the modal
    const timeEntries = await extractTimeEntriesFromModal(iframeDoc);

    // Close the modal by clicking Cancel button
    try {
      const cancelButton = Array.from(iframeDoc.querySelectorAll('button.btn-secondary')).find(
        btn => btn.textContent?.includes('Cancel')
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
    const modalContent = doc.querySelector('.modal-content');

    if (!modalContent) {
      // This is a real error - modal should be open when this function is called
      console.error('Modal content not found - this indicates a bug in the automation');
      throw new Error('Modal content not found');
    }

    // Find the timeline div
    const timeline = modalContent.querySelector('div.timeline');

    if (!timeline) {
      // This is a real error - timeline should exist in the modal
      console.error('Timeline div not found in modal - this indicates a bug or page structure change');
      throw new Error('Timeline div not found in modal');
    }

    // Extract time points (start/end times)
    const timePointWrappers = Array.from(timeline.querySelectorAll('div.time-point-wrapper')) as HTMLElement[];
    const timeIntervalWrappers = Array.from(timeline.querySelectorAll('div.time-interval-wrapper')) as HTMLElement[];

    console.log(`Found ${timePointWrappers.length} time points and ${timeIntervalWrappers.length} intervals`);

    // If no time points, return empty array (valid for days with no entries)
    if (timePointWrappers.length === 0) {
      console.log('No time points found - returning empty entries');
      return [];
    }

    // Extract time values from time-point-wrapper divs
    const timePoints: string[] = [];
    timePointWrappers.forEach((wrapper, idx) => {
      const input = wrapper.querySelector('input[type="text"]') as HTMLInputElement;
      if (input && input.value) {
        timePoints.push(input.value.trim());
        console.log(`Time point ${idx}: ${input.value.trim()}`);
      }
    });

    // Extract interval types from time-interval-wrapper divs
    const intervalTypes: string[] = [];
    timeIntervalWrappers.forEach((wrapper, idx) => {
      const input = wrapper.querySelector('input.searcher') as HTMLInputElement;
      if (input && input.value) {
        intervalTypes.push(input.value.trim());
        console.log(`Interval ${idx}: ${input.value.trim()}`);
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

    // Return empty array if no entries found (this is a valid scenario)
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

// Click a button by finding it via text content
async function clickButtonByText(text: string, doc: Document = document): Promise<void> {
  const buttons = Array.from(doc.querySelectorAll('button.action-item'));
  for (const btn of buttons) {
    const label = btn.querySelector('.btn-text.item-label');
    if (label && label.textContent?.trim() === text) {
      // Get the window object from the document we're working with
      const win = doc.defaultView;
      const zk = win ? (win as any).zk : null;

      if (zk && zk.Widget) {
        const widget = zk.Widget.$(btn);
        if (widget && typeof widget.fire === 'function') {
          console.log('Clicking button using ZK widget API');
          widget.fire('onClick');
          return;
        }
      }

      // Fallback to DOM click (ZK buttons often work with regular clicks too)
      (btn as HTMLElement).click();
      return;
    }
  }
  throw new Error(`Button with text "${text}" not found`);
}

// Set type input value using ZK widget (via injected script)
async function setTypeInputValue(input: HTMLInputElement, typeValue: string, doc: Document = document): Promise<void> {
  // Add a unique identifier to the input
  const uniqueId = 'atoss-typeinput-' + Date.now() + '-' + Math.random();
  input.setAttribute('data-atoss-temp-id', uniqueId);

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Listen for completion or error
    const completeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.uniqueId === uniqueId) {
        doc.removeEventListener('atoss-set-type-complete', completeHandler);
        doc.removeEventListener('atoss-set-type-error', errorHandler);
        clearTimeout(timeoutId);
        input.removeAttribute('data-atoss-temp-id');
        resolve();
      }
    };

    const errorHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.uniqueId === uniqueId) {
        doc.removeEventListener('atoss-set-type-complete', completeHandler);
        doc.removeEventListener('atoss-set-type-error', errorHandler);
        clearTimeout(timeoutId);
        input.removeAttribute('data-atoss-temp-id');
        reject(new Error(detail.error));
      }
    };

    doc.addEventListener('atoss-set-type-complete', completeHandler);
    doc.addEventListener('atoss-set-type-error', errorHandler);

    // Dispatch request event
    doc.dispatchEvent(new CustomEvent('atoss-set-type', {
      detail: { uniqueId, value: typeValue }
    }));

    // Timeout
    timeoutId = setTimeout(() => {
      doc.removeEventListener('atoss-set-type-complete', completeHandler);
      doc.removeEventListener('atoss-set-type-error', errorHandler);
      input.removeAttribute('data-atoss-temp-id');
      reject(new Error('Timeout waiting for type to be set'));
    }, 5000);
  });
}

// Set time input value using ZK widget (via injected script)
async function setTimeInputValue(input: HTMLInputElement, minutes: number, doc: Document = document): Promise<void> {
  // Add a unique identifier to the input
  const uniqueId = 'atoss-timeinput-' + Date.now() + '-' + Math.random();
  input.setAttribute('data-atoss-temp-id', uniqueId);

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Listen for completion or error
    const completeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.uniqueId === uniqueId) {
        doc.removeEventListener('atoss-set-time-complete', completeHandler);
        doc.removeEventListener('atoss-set-time-error', errorHandler);
        clearTimeout(timeoutId);
        input.removeAttribute('data-atoss-temp-id');
        resolve();
      }
    };

    const errorHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.uniqueId === uniqueId) {
        doc.removeEventListener('atoss-set-time-complete', completeHandler);
        doc.removeEventListener('atoss-set-time-error', errorHandler);
        clearTimeout(timeoutId);
        input.removeAttribute('data-atoss-temp-id');
        reject(new Error(detail.error));
      }
    };

    doc.addEventListener('atoss-set-time-complete', completeHandler);
    doc.addEventListener('atoss-set-time-error', errorHandler);

    // Dispatch request event
    doc.dispatchEvent(new CustomEvent('atoss-set-time', {
      detail: { uniqueId, value: minutes }
    }));

    // Timeout
    timeoutId = setTimeout(() => {
      doc.removeEventListener('atoss-set-time-complete', completeHandler);
      doc.removeEventListener('atoss-set-time-error', errorHandler);
      input.removeAttribute('data-atoss-temp-id');
      reject(new Error('Timeout waiting for time to be set'));
    }, 5000);
  });
}

// Set datepicker value using ZK widget (via injected script)
async function setDatepickerValue(dateString: string, doc: Document = document): Promise<void> {
  const datepickerInput = doc.querySelector(
    'input[type="text"].datepicker'
  ) as HTMLInputElement;

  if (!datepickerInput) {
    throw new Error('Datepicker input not found');
  }

  // Add a unique identifier to the input
  const uniqueId = 'atoss-datepicker-' + Date.now();
  datepickerInput.setAttribute('data-atoss-temp-id', uniqueId);

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout>;

    // Listen for completion or error
    const completeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.uniqueId === uniqueId) {
        doc.removeEventListener('atoss-set-date-complete', completeHandler);
        doc.removeEventListener('atoss-set-date-error', errorHandler);
        clearTimeout(timeoutId);
        datepickerInput.removeAttribute('data-atoss-temp-id');
        resolve();
      }
    };

    const errorHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.uniqueId === uniqueId) {
        doc.removeEventListener('atoss-set-date-complete', completeHandler);
        doc.removeEventListener('atoss-set-date-error', errorHandler);
        clearTimeout(timeoutId);
        datepickerInput.removeAttribute('data-atoss-temp-id');
        reject(new Error(detail.error));
      }
    };

    doc.addEventListener('atoss-set-date-complete', completeHandler);
    doc.addEventListener('atoss-set-date-error', errorHandler);

    // Dispatch request event
    doc.dispatchEvent(new CustomEvent('atoss-set-date', {
      detail: { uniqueId, value: dateString }
    }));

    // Timeout
    timeoutId = setTimeout(() => {
      doc.removeEventListener('atoss-set-date-complete', completeHandler);
      doc.removeEventListener('atoss-set-date-error', errorHandler);
      datepickerInput.removeAttribute('data-atoss-temp-id');
      reject(new Error('Timeout waiting for date to be set'));
    }, 5000);
  });
}

// Set time tracking data for a specific date
async function setTimeTrackingData(targetDate: string, entries: TimeEntry[]): Promise<DailyTimeData> {
  try {
    // Wait for iframe to be available
    await waitForCondition(() => {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      return iframe && iframe.contentDocument !== null;
    }, 3000);

    const iframeDoc = getIframeDocument();

    // Inject our script into the iframe for page context access
    injectScriptIntoIframe(iframeDoc);

    // Wait for buttons to appear in iframe
    await waitForCondition(() => {
      const buttons = Array.from(iframeDoc.querySelectorAll('button.action-item'));
      return buttons.some(btn => btn.textContent?.includes('Edit time entry'));
    }, 3000);

    // Click "Edit time entry" button
    await clickButtonByText('Edit time entry', iframeDoc);

    // Wait for modal to appear
    await waitForElement('.modal-content', 3000, iframeDoc);

    // Wait for datepicker input
    await waitForElement('input[type="text"].datepicker', 3000, iframeDoc);

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

      // Wait for message-flyout to appear
      console.log('Waiting for message flyout...');
      await waitForElement('.message-flyout.open', 5000, iframeDoc);
      console.log('Message flyout appeared');

      // Fill in the entry
      await fillTimeEntry(entry, iframeDoc);

      // Click Confirm to submit
      await clickConfirmButton(iframeDoc);

      // Wait for flyout to close
      console.log('Waiting for flyout to close...');
      await waitForCondition(() => {
        const flyout = iframeDoc.querySelector('.message-flyout.open');
        return !flyout;
      }, 5000);
      console.log('Flyout closed');

      // Wait a bit before adding the next entry
      if (i < entries.length - 1) {
        console.log('Waiting before adding next entry...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`All ${entries.length} entries added successfully`);

    // Close the modal by clicking Confirm button
    try {
      const confirmButton = Array.from(iframeDoc.querySelectorAll('button.btn-dialog')).find(
        btn => btn.textContent?.includes('Confirm')
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

// Click the Add button (btn-circular-cnt highlighted)
async function clickAddButton(doc: Document): Promise<void> {
  const addButton = doc.querySelector('.btn-circular-cnt.highlighted button.btn-circular') as HTMLElement;

  if (!addButton) {
    throw new Error('Add button not found');
  }

  console.log('Clicking Add button...');
  addButton.click();
}

// Convert time string (HH:MM or H:MM) to minutes
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

// Fill in a single time entry in the flyout form
async function fillTimeEntry(entry: TimeEntry, doc: Document): Promise<void> {
  console.log(`Filling time entry: ${entry.start} - ${entry.end}, type: ${entry.type}`);

  // Find the flyout
  const flyout = doc.querySelector('.message-flyout.open') as HTMLElement;
  if (!flyout) {
    throw new Error('Flyout not found');
  }

  // Convert times to minutes
  const fromMinutes = timeToMinutes(entry.start);
  const toMinutes = timeToMinutes(entry.end);

  // Find the "From" time input
  const timeInputs = Array.from(flyout.querySelectorAll('.time-input')) as HTMLElement[];
  const fromTimeInput = timeInputs.find(input =>
    input.querySelector('.input-prefix')?.textContent?.includes('From')
  );
  const toTimeInput = timeInputs.find(input =>
    input.querySelector('.input-prefix')?.textContent?.includes('To')
  );

  if (!fromTimeInput || !toTimeInput) {
    throw new Error('Time inputs not found in flyout');
  }

  const fromInput = fromTimeInput.querySelector('input[type="text"]') as HTMLInputElement;
  const toInput = toTimeInput.querySelector('input[type="text"]') as HTMLInputElement;

  if (!fromInput || !toInput) {
    throw new Error('Time input elements not found');
  }

  // Set "From" time using ZK widget
  console.log(`Setting From time: ${entry.start} (${fromMinutes} minutes)`);
  await setTimeInputValue(fromInput, fromMinutes, doc);

  // Set "To" time using ZK widget
  console.log(`Setting To time: ${entry.end} (${toMinutes} minutes)`);
  await setTimeInputValue(toInput, toMinutes, doc);

  // Set type field (use "Presence" if not provided)
  const typeValue = entry.type || 'Presence';
  console.log(`Setting type: ${typeValue}`);

  const typeInput = flyout.querySelector('input.searcher') as HTMLInputElement;
  if (!typeInput) {
    throw new Error('Type input not found');
  }

  // Focus the input
  typeInput.focus();

  // Type the value using ZK widget to trigger proper search/filtering
  console.log(`Typing type value via ZK widget: ${typeValue}`);
  await setTypeInputValue(typeInput, typeValue, doc);

  // Wait for search results/suggestions to update
  console.log('Waiting for search results to update...');
  await new Promise(resolve => setTimeout(resolve, 800));

  // Get widget base ID by removing '-real' suffix from input ID
  const inputId = typeInput.id.replace(/-real$/, '');
  console.log(`Widget base ID: ${inputId} (from input ID: ${typeInput.id})`);
  let selectedItem: HTMLElement | null = null;

  // First try searchresultspp (appears when typing)
  const searchResultsContainer = flyout.querySelector(`#${inputId}-searchresultspp`);
  console.log('searchResultsContainer:', searchResultsContainer);
  if (searchResultsContainer) {
    const style = window.getComputedStyle(searchResultsContainer);
    const isVisible = style.display !== 'none';
    console.log(`searchresultspp visible: ${isVisible}`);

    if (isVisible) {
      const items = Array.from(searchResultsContainer.querySelectorAll('.input-search-item')) as HTMLElement[];
      console.log(`Found ${items.length} items in searchresultspp`);
      items.forEach((item, idx) => {
        console.log(`  Item ${idx}: "${item.textContent?.trim()}"`);
      });

      // Find item that matches the type value
      // Look for exact match first, then substring match
      selectedItem = items.find(item => {
        const textContent = item.textContent || '';
        const firstRowCol = item.querySelector('.rowCol:first-child')?.textContent?.trim() || '';
        const lowerTypeValue = typeValue.toLowerCase();

        console.log(`  Checking item: firstRowCol="${firstRowCol}", fullText="${textContent.trim()}"`);

        // Exact match on first column (the code/name)
        if (firstRowCol.toLowerCase() === lowerTypeValue) {
          console.log(`  -> Exact match!`);
          return true;
        }

        // Substring match as fallback
        if (textContent.toLowerCase().includes(lowerTypeValue)) {
          console.log(`  -> Substring match!`);
          return true;
        }

        return false;
      }) || null;
    }
  }

  // If not found, try suggestionspp (default suggestions)
  if (!selectedItem) {
    const suggestionsContainer = flyout.querySelector(`#${inputId}-suggestionspp`);
    console.log('suggestionsContainer:', suggestionsContainer);
    if (suggestionsContainer) {
      const style = window.getComputedStyle(suggestionsContainer);
      const isVisible = style.display !== 'none';
      console.log(`suggestionspp visible: ${isVisible}`);

      if (isVisible) {
        const items = Array.from(suggestionsContainer.querySelectorAll('.input-search-item')) as HTMLElement[];
        console.log(`Found ${items.length} items in suggestionspp`);
        items.forEach((item, idx) => {
          console.log(`  Item ${idx}: "${item.textContent?.trim()}"`);
        });

        // Find item that matches the type value
        // Look for exact match first, then substring match
        selectedItem = items.find(item => {
          const textContent = item.textContent || '';
          const firstRowCol = item.querySelector('.rowCol:first-child')?.textContent?.trim() || '';
          const lowerTypeValue = typeValue.toLowerCase();

          console.log(`  Checking item: firstRowCol="${firstRowCol}", fullText="${textContent.trim()}"`);

          // Exact match on first column (the code/name)
          if (firstRowCol.toLowerCase() === lowerTypeValue) {
            console.log(`  -> Exact match!`);
            return true;
          }

          // Substring match as fallback
          if (textContent.toLowerCase().includes(lowerTypeValue)) {
            console.log(`  -> Substring match!`);
            return true;
          }

          return false;
        }) || null;
      }
    }
  }

  if (selectedItem) {
    console.log(`Found matching item for "${typeValue}": "${selectedItem.textContent?.trim()}", clicking...`);
    selectedItem.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    console.warn(`No matching item found for type "${typeValue}"`);
    console.warn('Visible containers:', {
      searchResults: searchResultsContainer ? window.getComputedStyle(searchResultsContainer).display : 'not found',
      suggestions: flyout.querySelector(`#${inputId}-suggestionspp`) ? window.getComputedStyle(flyout.querySelector(`#${inputId}-suggestionspp`) as HTMLElement).display : 'not found'
    });
  }

  console.log('Time entry filled');
}

// Click the Confirm button in the flyout
async function clickConfirmButton(doc: Document): Promise<void> {
  const flyout = doc.querySelector('.message-flyout.open') as HTMLElement;
  if (!flyout) {
    throw new Error('Flyout not found');
  }

  const confirmButton = Array.from(flyout.querySelectorAll('.button-panel button')).find(
    btn => btn.textContent?.includes('Confirm')
  ) as HTMLButtonElement;

  if (!confirmButton) {
    throw new Error('Confirm button not found');
  }

  // Wait for button to become enabled
  console.log('Waiting for Confirm button to become enabled...');
  await waitForCondition(() => {
    return !confirmButton.disabled && !confirmButton.hasAttribute('disabled');
  }, 10000);

  console.log('Clicking Confirm button...');
  confirmButton.click();
}
