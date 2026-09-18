// Expense & Budget Visualizer - App Logic
'use strict';

// === StorageAdapter ===

const STORAGE_KEY_TRANSACTIONS = 'ebv_transactions';
const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Checks that a value is a valid Transaction object with all required fields.
 * @param {*} entry
 * @returns {boolean}
 */
function isValidTransactionEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (typeof entry.id !== 'string' || entry.id === '') return false;
  if (typeof entry.name !== 'string') return false;
  if (typeof entry.amount !== 'number') return false;
  if (!VALID_CATEGORIES.includes(entry.category)) return false;
  if (typeof entry.createdAt !== 'number') return false;
  return true;
}

/**
 * Loads stored transactions from localStorage.
 * Drops any entry that is structurally invalid or has an unrecognised category.
 * Never throws — returns [] on any failure.
 * @returns {Transaction[]}
 */
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidTransactionEntry);
  } catch (_e) {
    return [];
  }
}

/**
 * Serialises the transaction array and writes it to localStorage.
 * Never throws — returns a typed Result object.
 * @param {Transaction[]} transactions
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function saveTransactions(transactions) {
  try {
    const serialised = JSON.stringify(transactions);
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, serialised);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const STORAGE_KEY_SORT = 'ebv_sort';
const VALID_SORT_KEYS = ['default', 'amount-asc', 'amount-desc', 'category-az'];

/**
 * Loads the active sort preference from localStorage.
 * Returns "default" on any failure or unrecognised value.
 * @returns {SortKey}
 */
function loadSortPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SORT);
    if (raw !== null && VALID_SORT_KEYS.includes(raw)) {
      return raw;
    }
    return 'default';
  } catch (_e) {
    return 'default';
  }
}

/**
 * Saves the active sort preference to localStorage.
 * Never throws — returns a typed Result object.
 * @param {SortKey} key
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function saveSortPreference(key) {
  try {
    localStorage.setItem(STORAGE_KEY_SORT, key);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const STORAGE_KEY_LIMITS = 'ebv_limits';

/**
 * Checks that a parsed budget limits object has the correct shape.
 * Each value must be either a positive finite number or null.
 * @param {*} obj
 * @returns {boolean}
 */
function isValidBudgetLimitsObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  for (const cat of VALID_CATEGORIES) {
    if (!(cat in obj)) return false;
    const v = obj[cat];
    if (v !== null) {
      if (typeof v !== 'number' || !isFinite(v) || v <= 0) return false;
    }
  }
  return true;
}

/**
 * Loads stored budget limits from localStorage.
 * Returns `{ Food: null, Transport: null, Fun: null }` on any failure.
 * Never throws.
 * @returns {BudgetLimits}
 */
function loadBudgetLimits() {
  const defaultLimits = { Food: null, Transport: null, Fun: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LIMITS);
    if (raw === null) return defaultLimits;
    const parsed = JSON.parse(raw);
    if (!isValidBudgetLimitsObject(parsed)) return defaultLimits;
    return { Food: parsed.Food, Transport: parsed.Transport, Fun: parsed.Fun };
  } catch (_e) {
    return defaultLimits;
  }
}

/**
 * Serialises the budget limits object and writes it to localStorage.
 * Never throws — returns a typed Result object.
 * @param {BudgetLimits} limits
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function saveBudgetLimits(limits) {
  try {
    localStorage.setItem(STORAGE_KEY_LIMITS, JSON.stringify(limits));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const STORAGE_KEY_THEME = 'ebv_theme';
const VALID_THEMES = ['light', 'dark'];

/**
 * Loads the saved theme preference from localStorage.
 * Falls back to the system prefers-color-scheme, then to "light".
 * Never throws.
 * @returns {"light"|"dark"}
 */
function loadThemePreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THEME);
    if (raw !== null && VALID_THEMES.includes(raw)) return raw;
  } catch (_e) { /* fall through */ }
  // Fall back to system preference
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch (_e) {
    return 'light';
  }
}

/**
 * Saves the active theme preference to localStorage.
 * Never throws — returns a typed Result object.
 * @param {"light"|"dark"} theme
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function saveThemePreference(theme) {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ============================================================
// Validator
// ============================================================

/**
 * Returns true iff amountStr parses as a finite number in [0.01, 999999999.99]
 * with at most 2 decimal places.
 * Uses a string-based decimal check to avoid floating-point precision issues.
 * @param {string} amountStr
 * @returns {boolean}
 */
function isValidAmount(amountStr) {
  if (typeof amountStr !== 'string' || amountStr.trim() === '') return false;

  // Check for at most 2 decimal places using the string representation
  const dotIndex = amountStr.indexOf('.');
  if (dotIndex !== -1) {
    const decimalPart = amountStr.slice(dotIndex + 1);
    if (decimalPart.length > 2) return false;
  }

  const num = Number(amountStr);
  if (!isFinite(num)) return false;
  if (num < 0.01 || num > 999999999.99) return false;

  return true;
}

/**
 * Validates the three transaction form fields independently.
 * Collects all errors and returns them together.
 * @param {string} name
 * @param {string} amount
 * @param {string} category
 * @returns {{ valid: true } | { valid: false, errors: ValidationErrors }}
 */
function validateForm(name, amount, category) {
  /** @type {ValidationErrors} */
  const errors = {};

  // Validate name
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (trimmedName === '') {
    errors.name = 'Item name is required.';
  } else if (trimmedName.length > 100) {
    errors.name = 'Item name must be 100 characters or fewer.';
  }

  // Validate amount
  if (!isValidAmount(typeof amount === 'string' ? amount : String(amount))) {
    errors.amount = 'Amount must be between 0.01 and 999,999,999.99 with at most 2 decimal places.';
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    errors.category = 'Please select a category.';
  }

  if (Object.keys(errors).length === 0) {
    return { valid: true };
  }
  return { valid: false, errors };
}

/**
 * Returns true iff value is a non-empty string that parses as a finite positive
 * number in the range (0, 999999999.99] with at most 2 decimal places.
 * Uses a string-based decimal check (same approach as isValidAmount).
 * @param {string} value
 * @returns {boolean}
 */
function isValidBudgetLimit(value) {
  if (typeof value !== 'string' || value.trim() === '') return false;

  // At most 2 decimal places
  const dotIndex = value.indexOf('.');
  if (dotIndex !== -1) {
    const decimalPart = value.slice(dotIndex + 1);
    if (decimalPart.length > 2) return false;
  }

  const num = Number(value);
  if (!isFinite(num)) return false;
  // Must be strictly positive (> 0) and at most the max
  if (num <= 0 || num > 999999999.99) return false;

  return true;
}

// ============================================================
// TransactionManager
// ============================================================

/** @type {Transaction[]} */
let _transactions = [];

/** @type {SortKey} */
let _sortKey = 'default';

/** @type {BudgetLimits} */
let _budgetLimits = { Food: null, Transport: null, Fun: null };

/**
 * Initialises the in-memory transaction store from a loaded array.
 * Also restores the persisted sort preference and budget limits.
 * @param {Transaction[]} transactions
 */
function initState(transactions) {
  _transactions = Array.isArray(transactions) ? transactions : [];
  _sortKey = loadSortPreference();
  _budgetLimits = loadBudgetLimits();
}

/**
 * Returns the current active sort key.
 * @returns {SortKey}
 */
function getSortKey() {
  return _sortKey;
}

/**
 * Updates the active sort key and persists it to localStorage.
 * Rolls back and returns the error result if the save fails.
 * @param {SortKey} key
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function setSortKey(key) {
  const previous = _sortKey;
  _sortKey = key;
  const result = saveSortPreference(key);
  if (!result.ok) {
    _sortKey = previous;
  }
  return result;
}

/**
 * Returns a sorted shallow copy of _transactions based on the active _sortKey.
 * - "default"     → createdAt descending (newest first)
 * - "amount-asc"  → amount ascending
 * - "amount-desc" → amount descending
 * - "category-az" → category A–Z, then createdAt descending as tiebreaker
 * @returns {Transaction[]}
 */
function getSortedTransactions() {
  const copy = _transactions.slice();
  switch (_sortKey) {
    case 'amount-asc':
      return copy.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return copy.sort((a, b) => b.amount - a.amount);
    case 'category-az':
      return copy.sort((a, b) => {
        const catCompare = a.category.localeCompare(b.category);
        if (catCompare !== 0) return catCompare;
        return b.createdAt - a.createdAt;
      });
    case 'default':
    default:
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/**
 * Returns a shallow copy of the current transaction list.
 * @returns {Transaction[]}
 */
function getAll() {
  return _transactions.slice();
}

/**
 * Creates a new transaction, appends it to the in-memory list, and persists.
 * Rolls back and returns the error result if the save fails.
 * @param {string} name
 * @param {string} amount  - String from the form; parsed with parseFloat
 * @param {Category} category
 * @returns {{ tx: Transaction, saveResult: { ok: true } } | { tx: null, saveResult: { ok: false, error: string } }}
 */
function addTransaction(name, amount, category) {
  /** @type {Transaction} */
  const tx = {
    id: Date.now() + '-' + Math.random(),
    name: name.trim(),
    amount: parseFloat(amount),
    category: category,
    createdAt: Date.now(),
  };

  _transactions.push(tx);
  const saveResult = saveTransactions(_transactions);

  if (!saveResult.ok) {
    // Roll back the push
    _transactions.pop();
    return { tx: null, saveResult };
  }

  return { tx, saveResult };
}

/**
 * Deletes the transaction with the given ID from the in-memory list and persists.
 * Rolls back and returns the error result if the save fails.
 * If the ID is not found, returns a no-op success result.
 * @param {string} id
 * @returns {{ found: boolean, saveResult: { ok: true } | { ok: false, error: string } }}
 */
function deleteTransaction(id) {
  const index = _transactions.findIndex((tx) => tx.id === id);

  if (index === -1) {
    return { found: false, saveResult: { ok: true } };
  }

  // Remove entry and attempt to persist
  const [removed] = _transactions.splice(index, 1);
  const saveResult = saveTransactions(_transactions);

  if (!saveResult.ok) {
    // Roll back: re-insert at the original index
    _transactions.splice(index, 0, removed);
    return { found: true, saveResult };
  }

  return { found: true, saveResult };
}

/**
 * Returns the arithmetic sum of all transaction amounts.
 * @returns {number}
 */
function computeBalance() {
  return _transactions.reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Returns the total spending per category.
 * @returns {CategoryTotals}
 */
function computeCategoryTotals() {
  const totals = { Food: 0, Transport: 0, Fun: 0 };
  for (const tx of _transactions) {
    if (tx.category in totals) {
      totals[tx.category] += tx.amount;
    }
  }
  return totals;
}

/**
 * Returns a shallow copy of the current budget limits.
 * @returns {BudgetLimits}
 */
function getBudgetLimits() {
  return Object.assign({}, _budgetLimits);
}

/**
 * Sets the budget limit for a category and persists to localStorage.
 * Pass null to clear the limit for that category.
 * Rolls back and returns an error result if the save fails.
 * @param {Category} category
 * @param {number|null} value
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
function setBudgetLimit(category, value) {
  const previous = _budgetLimits[category];
  _budgetLimits[category] = value;
  const result = saveBudgetLimits(_budgetLimits);
  if (!result.ok) {
    _budgetLimits[category] = previous;
  }
  return result;
}

/**
 * Returns an array of Category strings where the category's total spending
 * meets or exceeds its budget limit (and a limit has been set).
 * @returns {Category[]}
 */
function getExceededCategories() {
  const totals = computeCategoryTotals();
  return VALID_CATEGORIES.filter(function (cat) {
    return _budgetLimits[cat] !== null && totals[cat] >= _budgetLimits[cat];
  });
}

// ============================================================
// UIRenderer
// ============================================================

/** @type {import('chart.js').Chart|null} */
let _chartInstance = null;

// Chart colour palettes — chosen for contrast in each theme
const CHART_COLOURS_LIGHT = {
  Food:      'rgba(239, 68,  68,  0.8)',
  Transport: 'rgba(59,  130, 246, 0.8)',
  Fun:       'rgba(245, 158, 11,  0.8)',
};
const CHART_COLOURS_DARK = {
  Food:      'rgba(252, 165, 165, 0.8)',
  Transport: 'rgba(147, 197, 253, 0.8)',
  Fun:       'rgba(252, 211, 77,  0.8)',
};

/**
 * Renders the current balance into the #balance-display element.
 * Formats the number as "$X.XX" (always 2 decimal places).
 * @param {number} total
 */
function renderBalance(total) {
  // Target the inner value span so the "Total Balance:" label is preserved
  const el = document.getElementById('balance-value') || document.getElementById('balance-display');
  if (el) {
    el.textContent = '$' + total.toFixed(2);
  }
}

/**
 * Renders a pie chart of category totals into the #spending-chart canvas.
 * - First call: creates the Chart.js instance.
 * - Subsequent calls: updates data in-place (no destroy/recreate).
 * - If all category totals are 0: destroys any existing instance and shows
 *   placeholder text inside the canvas container.
 * - If Chart.js CDN failed to load: shows a persistent error banner and returns.
 * @param {CategoryTotals} categoryTotals
 */
function renderChart(categoryTotals) {
  const canvas = document.getElementById('spending-chart');
  if (!canvas) return;

  // CDN failure guard
  if (typeof Chart === 'undefined') {
    showError('Chart unavailable — check your internet connection.');
    return;
  }

  // Build filtered dataset (only categories with total > 0)
  const grandTotal = categoryTotals.Food + categoryTotals.Transport + categoryTotals.Fun;

  const activeEntries = Object.entries(categoryTotals).filter(([, value]) => value > 0);

  // No data — destroy existing instance and show placeholder
  if (activeEntries.length === 0) {
    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }

    // Show placeholder text in the parent container
    const container = canvas.parentElement || canvas;
    let placeholder = container.querySelector('.chart-placeholder');
    if (!placeholder) {
      placeholder = document.createElement('p');
      placeholder.className = 'chart-placeholder';
      placeholder.textContent = 'No spending data to display yet.';
      container.appendChild(placeholder);
    }
    canvas.style.display = 'none';
    return;
  }

  // Hide placeholder if it exists and show the canvas
  const container = canvas.parentElement || canvas;
  const placeholder = container.querySelector('.chart-placeholder');
  if (placeholder) placeholder.remove();
  canvas.style.display = '';

  const labels = activeEntries.map(([category, value]) => {
    const pct = ((value / grandTotal) * 100).toFixed(1);
    return category + ' (' + pct + '%)';
  });

  const data = activeEntries.map(([, value]) => value);

  // Colour palette — pick based on active theme
  const currentTheme = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const COLOURS = currentTheme === 'dark' ? CHART_COLOURS_DARK : CHART_COLOURS_LIGHT;
  const backgroundColors = activeEntries.map(([category]) => COLOURS[category] || 'rgba(201, 203, 207, 0.8)');

  if (_chartInstance) {
    // Update in-place — no destroy/recreate
    _chartInstance.data.labels = labels;
    _chartInstance.data.datasets[0].data = data;
    _chartInstance.data.datasets[0].backgroundColor = backgroundColors;
    _chartInstance.update('none');
  } else {
    // First call — create the instance
    _chartInstance = new Chart(canvas, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return context.label;
              },
            },
          },
        },
      },
    });
  }
}

/**
 * Renders the transaction list into #transaction-list.
 * Renders transactions in the order provided (sorting is handled by getSortedTransactions()).
 * If the list is empty, shows a placeholder message.
 * Each entry includes the item name, formatted amount, category, and a delete button.
 * @param {Transaction[]} transactions
 */
function renderTransactionList(transactions) {
  const listEl = document.getElementById('transaction-list');
  if (!listEl) return;

  // Clear existing content
  listEl.innerHTML = '';

  if (transactions.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-message';
    emptyItem.textContent = 'No transactions recorded yet.';
    listEl.appendChild(emptyItem);
    return;
  }

  // Compute exceeded categories once before the loop (avoids O(n) redundant calls)
  const exceeded = getExceededCategories();

  for (const tx of transactions) {
    const li = document.createElement('li');
    li.dataset.id = tx.id;

    // Mark list items belonging to exceeded-budget categories
    if (exceeded.includes(tx.category)) {
      li.dataset.exceeded = 'true';
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'tx-name';
    nameSpan.textContent = tx.name;

    const amountSpan = document.createElement('span');
    amountSpan.className = 'tx-amount';
    amountSpan.textContent = '$' + tx.amount.toFixed(2);

    const categorySpan = document.createElement('span');
    categorySpan.className = 'tx-category';
    categorySpan.textContent = tx.category;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.dataset.id = tx.id;
    deleteBtn.textContent = 'Delete';

    li.appendChild(nameSpan);
    li.appendChild(amountSpan);
    li.appendChild(categorySpan);
    li.appendChild(deleteBtn);

    listEl.appendChild(li);
  }
}

// Map from validation field key to the corresponding input element ID and error span ID
const FIELD_MAP = {
  name:     { inputId: 'name-input',     errorId: 'name-error' },
  amount:   { inputId: 'amount-input',   errorId: 'amount-error' },
  category: { inputId: 'category-input', errorId: 'category-error' },
};

/**
 * Writes validation error messages into the adjacent `.field-error` spans
 * and marks each failing field with aria-invalid="true".
 * @param {ValidationErrors} errors
 */
function renderValidationErrors(errors) {
  for (const [key, { inputId, errorId }] of Object.entries(FIELD_MAP)) {
    const inputEl = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    if (errors[key]) {
      if (errorEl) errorEl.textContent = errors[key];
      if (inputEl) inputEl.setAttribute('aria-invalid', 'true');
    }
  }
}

/**
 * Clears all inline validation error messages and removes aria-invalid attributes.
 */
function clearValidationErrors() {
  for (const { inputId, errorId } of Object.values(FIELD_MAP)) {
    const inputEl = document.getElementById(inputId);
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.textContent = '';
    if (inputEl) inputEl.removeAttribute('aria-invalid');
  }
}

/**
 * Resets the transaction form to its default empty state.
 */
function resetForm() {
  const form = document.getElementById('transaction-form');
  if (form) form.reset();
}

/**
 * Shows the persistent error banner with the given message.
 * Replaces any previously displayed message.
 * @param {string} message
 */
function showError(message) {
  const banner = document.getElementById('error-banner');
  const msgEl  = document.getElementById('error-message');
  if (msgEl)    msgEl.textContent = message;
  if (banner)   banner.style.display = 'block';
}

/**
 * Hides the persistent error banner.
 */
function hideError() {
  const banner = document.getElementById('error-banner');
  if (banner) banner.style.display = 'none';
}

/**
 * Applies the given theme to the document and updates the toggle button label.
 * Sets document.documentElement.dataset.theme and updates #theme-toggle text.
 * @param {"light"|"dark"} theme
 */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
  }
}

/**
 * Sets the Sort_Control dropdown to the currently active sort key.
 * @param {SortKey} currentKey
 */
function renderSortControl(currentKey) {
  const selectEl = document.getElementById('sort-select');
  if (selectEl) {
    selectEl.value = currentKey;
  }
}

/**
 * Populates the budget limit input fields with their current stored values.
 * Sets the input value to the stored limit (as a string) or "" if null.
 * @param {BudgetLimits} limits
 */
function renderBudgetLimitInputs(limits) {
  for (const cat of VALID_CATEGORIES) {
    const input = document.querySelector('.budget-input[data-category="' + cat + '"]');
    if (input) {
      input.value = limits[cat] !== null ? String(limits[cat]) : '';
    }
  }
}

/**
 * Clears and re-renders the budget warnings area for exceeded categories.
 * @param {Category[]} exceededCategories
 */
function renderBudgetWarnings(exceededCategories) {
  const warningsEl = document.getElementById('budget-warnings');
  if (!warningsEl) return;
  warningsEl.innerHTML = '';
  for (const cat of exceededCategories) {
    const span = document.createElement('span');
    span.className = 'budget-warning';
    span.textContent = '⚠️ ' + cat + ' limit exceeded';
    warningsEl.appendChild(span);
  }
}

// ============================================================
// Event Handlers
// ============================================================

/**
 * Handles the transaction form submit event.
 * Validates input, creates a new transaction, resets the form, and re-renders.
 * Requirements: 1.3, 1.4, 1.5, 1.6, 6.1, 6.6
 * @param {SubmitEvent} event
 */
function handleFormSubmit(event) {
  event.preventDefault();
  clearValidationErrors();

  const name     = document.getElementById('name-input').value;
  const amount   = document.getElementById('amount-input').value;
  const category = document.getElementById('category-input').value;

  const validationResult = validateForm(name, amount, category);
  if (!validationResult.valid) {
    renderValidationErrors(validationResult.errors);
    return;
  }

  const { tx, saveResult } = addTransaction(name, amount, category);

  if (!saveResult.ok) {
    showError(saveResult.error);
    return;
  }

  resetForm();
  renderAll();
}

/**
 * Sets up event delegation on #transaction-list for delete button clicks.
 * A single listener covers all current and future delete buttons.
 * Requirements: 3.2, 3.3, 6.3
 * @param {MouseEvent} event
 */
function handleDeleteClick(event) {
  if (!event.target.classList.contains('delete-btn')) return;

  const id = event.target.dataset.id;
  if (!id) return;

  const { saveResult } = deleteTransaction(id);

  if (!saveResult.ok) {
    showError(saveResult.error);
    return;
  }

  renderAll();
}

/**
 * Handles sort order changes from the #sort-select dropdown.
 * Updates the active sort key, persists it, and re-renders the list.
 * Requirements: 8.1, 8.2, 8.4, 8.5
 * @param {Event} event
 */
function handleSortChange(event) {
  const key = event.target.value;
  const result = setSortKey(key);
  if (!result.ok) {
    showError(result.error);
  }
  renderAll();
}

/**
 * Toggles the UI theme between "light" and "dark", persists the choice,
 * and re-renders so the chart picks up the new colour palette.
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
function handleThemeToggle() {
  const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  const newTheme = current === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  const result = saveThemePreference(newTheme);
  if (!result.ok) {
    showError(result.error);
  }
  renderAll();
}

/**
 * Handles budget limit input changes.
 * - If value is empty, clears the limit for that category.
 * - If value is non-empty, validates and saves the new limit.
 * Shows inline errors for invalid input; calls renderAll() on any successful change.
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 * @param {Event} event
 */
function handleBudgetLimitChange(event) {
  const input = event.target;
  const category = input.dataset.category;
  const value = input.value;

  // Find the adjacent .budget-error span within the same parent element
  const errorSpan = input.parentElement
    ? input.parentElement.querySelector('.budget-error')
    : null;

  if (value === '') {
    // Clear the limit
    const result = setBudgetLimit(category, null);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    if (errorSpan) errorSpan.textContent = '';
    renderAll();
  } else {
    // Validate then save
    if (!isValidBudgetLimit(value)) {
      if (errorSpan) {
        errorSpan.textContent = 'Please enter a valid positive amount (max 2 decimal places).';
      }
      return;
    }
    if (errorSpan) errorSpan.textContent = '';
    const result = setBudgetLimit(category, parseFloat(value));
    if (!result.ok) {
      showError(result.error);
      return;
    }
    renderAll();
  }
}

// ============================================================
// renderAll — private re-render helper
// ============================================================

/**
 * Re-renders all UI components from the current in-memory state.
 * Called after every state mutation (add, delete, sort change, budget limit change).
 */
function renderAll() {
  renderTransactionList(getSortedTransactions());
  renderBalance(computeBalance());
  renderChart(computeCategoryTotals());
  renderSortControl(getSortKey());
  renderBudgetWarnings(getExceededCategories());
  renderBudgetLimitInputs(getBudgetLimits());
}

// ============================================================
// Bootstrap
// ============================================================

/**
 * Initialises the app on DOMContentLoaded:
 *  1. Loads and validates stored transactions (detects partial/corrupted data).
 *  2. Seeds the in-memory state.
 *  3. Wires up all event listeners.
 *  4. Performs the initial full render.
 * Requirements: 2.3, 6.4, 6.5, 6.7, 7.6, 7.7
 */
function init() {
  // --- 1. Load transactions and detect partial load ---
  const STORAGE_KEY = 'ebv_transactions';
  let loaded = [];
  let rawLength = 0;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rawLength = parsed.length;
      }
    }
  } catch (_e) {
    // JSON.parse failed — loadTransactions() will have returned []
  }

  loaded = loadTransactions();

  if (rawLength > loaded.length) {
    showError('Some saved transactions could not be restored due to corrupted data.');
  }

  // --- 2. Seed in-memory state ---
  initState(loaded);

  // --- 3. Wire event listeners ---

  // Form submit
  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Error banner dismiss button
  const dismissBtn = document.getElementById('error-dismiss');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', hideError);
  }

  // Transaction list — event delegation for delete buttons
  const listEl = document.getElementById('transaction-list');
  if (listEl) {
    listEl.addEventListener('click', handleDeleteClick);
  }

  // Sort control
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', handleSortChange);
  }

  // Budget limit inputs — one change listener per input via forEach
  const budgetInputs = document.querySelectorAll('.budget-input');
  budgetInputs.forEach(function (input) {
    input.addEventListener('change', handleBudgetLimitChange);
  });

  // Theme toggle
  const themeToggleBtn = document.getElementById('theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', handleThemeToggle);
  }

  // Apply persisted theme before rendering
  const savedTheme = loadThemePreference();
  applyTheme(savedTheme);

  // --- 4. Initial render ---
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
