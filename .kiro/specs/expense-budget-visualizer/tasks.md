# Implementation Plan: Expense & Budget Visualizer

## Overview

Build a fully client-side single-page application using plain HTML, CSS, and Vanilla JavaScript. The implementation is layered: scaffold → persistence → validation → state management → rendering → event wiring → styling. Each step integrates immediately with the previous so there is no orphaned code.

---

## Tasks

- [x] 1. Scaffold project structure and HTML shell
  - [x] 1.1 Create `index.html` with semantic HTML structure
    - Create the root HTML file with `<!DOCTYPE html>`, `<head>`, and `<body>` elements
    - Add `<link>` tag pointing to `css/styles.css`
    - Add Chart.js CDN `<script>` tag: `https://cdn.jsdelivr.net/npm/chart.js`
    - Add `<script src="js/app.js" defer></script>` tag
    - Add the Balance Display section: `<div id="balance-display">` above the form
    - Add the error banner element: `<div id="error-banner" style="display:none">` with a dismiss button
    - Add the Input Form: `<form id="transaction-form">` with text input for name (maxlength=100), number input for amount, `<select>` for category (options: Food, Transport, Fun with a blank default), and a submit button
    - Add inline error containers `<span class="field-error">` adjacent to each form field
    - Add the Transaction List container: `<ul id="transaction-list">`
    - Add a `<canvas id="spending-chart">` element for Chart.js
    - _Requirements: 1.1, 1.2, 2.1, 4.1, 5.1, 7.1, 7.3, 7.4, 7.5_

  - [x] 1.2 Create empty `css/styles.css` and `js/app.js` files
    - Create `css/styles.css` with a single comment placeholder
    - Create `js/app.js` with a single comment placeholder and a `'use strict';` directive
    - _Requirements: 7.2, 7.3_

- [x] 2. Implement StorageAdapter
  - [x] 2.1 Write the `StorageAdapter` function group in `js/app.js`
    - Implement `loadTransactions()`: wraps `localStorage.getItem("ebv_transactions")`, parses JSON, drops any entry missing required fields (`id`, `name`, `amount`, `category`, `createdAt`) or with an invalid `category` value, returns valid `Transaction[]` or `[]` on any exception
    - Implement `saveTransactions(transactions)`: serialises array and calls `localStorage.setItem("ebv_transactions", …)`, returns `{ ok: true }` on success or `{ ok: false, error: string }` on any thrown exception (including `SecurityError` and quota errors)
    - Neither function may throw — all exceptions must be caught and returned as typed results
    - _Requirements: 6.1, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_


- [x] 3. Implement Validator
  - [x] 3.1 Write the `Validator` function group in `js/app.js`
    - Implement `isValidAmount(amountStr)`: returns `true` iff the string parses as a finite number in `[0.01, 999999999.99]` with at most 2 decimal places
    - Implement `validateForm(name, amount, category)`:
      - `name`: non-empty after `trim()`, at most 100 characters; error message: `"Item name is required."` or `"Item name must be 100 characters or fewer."`
      - `amount`: passes `isValidAmount`; error message: `"Amount must be between 0.01 and 999,999,999.99 with at most 2 decimal places."`
      - `category`: must be one of `["Food", "Transport", "Fun"]`; error message: `"Please select a category."`
      - All three fields validated independently; all errors collected and returned together
      - Returns `{ valid: true }` when all pass, `{ valid: false, errors: ValidationErrors }` otherwise
    - _Requirements: 1.3, 1.4_

- [x] 4. Implement TransactionManager
  - [x] 4.1 Write the `TransactionManager` function group in `js/app.js`
    - Implement `initState(transactions)`: sets the internal `_transactions` array
    - Implement `getAll()`: returns a shallow copy of `_transactions`
    - Implement `addTransaction(name, amount, category)`:
      - Creates a `Transaction` with `id = Date.now() + "-" + Math.random()`, `createdAt = Date.now()`
      - Pushes to `_transactions`, calls `saveTransactions`
      - If save fails, rolls back the push and returns `{ tx: null, saveResult }`
      - Returns `{ tx: Transaction, saveResult: { ok: true } }` on success
    - Implement `deleteTransaction(id)`:
      - Finds the index; if not found returns `{ found: false, saveResult: { ok: true } }`
      - Removes entry, calls `saveTransactions`
      - If save fails, re-inserts the entry at its original index and returns `{ found: true, saveResult: { ok: false, … } }`
      - Returns `{ found: true, saveResult: { ok: true } }` on success
    - Implement `computeBalance()`: returns the sum of all `amount` values in `_transactions`
    - Implement `computeCategoryTotals()`: returns `{ Food: number, Transport: number, Fun: number }` summed from `_transactions`
    - _Requirements: 1.5, 2.2, 3.2, 3.3, 3.4, 4.2, 4.3, 4.4, 4.5, 5.2, 6.1, 6.3_


- [x] 5. Checkpoint — core logic complete
  - Ensure `StorageAdapter`, `Validator`, and `TransactionManager` are fully integrated and any property tests pass
  - Verify that `loadTransactions → initState → getAll/computeBalance/computeCategoryTotals` pipeline works end-to-end in the browser console before proceeding to rendering
  - Ask the user if there are any questions or changes before proceeding.

- [x] 6. Implement UIRenderer
  - [x] 6.1 Implement `renderBalance(total)` in `js/app.js`
    - Writes `"$" + total.toFixed(2)` into the `#balance-display` element's text content
    - _Requirements: 4.1, 4.2, 4.5_

  - [x] 6.2 Implement `renderTransactionList(transactions)` in `js/app.js`
    - Sorts a copy of `transactions` by `createdAt` descending (newest first)
    - Clears `#transaction-list`, then:
      - If empty: inserts a single `<li class="empty-message">` with "No transactions recorded yet."
      - Otherwise: for each transaction inserts a `<li>` containing the item name, amount as `"$" + amount.toFixed(2)`, category label, and a `<button class="delete-btn" data-id="[id]">Delete</button>`
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1_


  - [x] 6.4 Implement `renderChart(categoryTotals)` in `js/app.js`
    - On first call: check `typeof Chart === "undefined"` — if true, call `showError("Chart unavailable — check your internet connection.")` and return
    - Otherwise create a Chart.js pie chart instance on `#spending-chart` with `type: "pie"`
    - On subsequent calls: update `chart.data` in-place and call `chart.update("none")` (do not destroy/recreate)
    - Filter to only categories with total `> 0`; if none remain, destroy any existing chart instance and show placeholder text
    - Label each segment as `"CategoryName (X.X%)"` where percentage = `(categoryTotal / grandTotal * 100).toFixed(1)`
    - _Requirements: 5.1, 5.2, 5.6, 5.7, 7.4, 7.9_

  - [x] 6.6 Implement validation error rendering and form utilities in `js/app.js`
    - Implement `renderValidationErrors(errors)`: for each field key in `errors`, writes the message into the adjacent `.field-error` span and adds an `aria-invalid="true"` attribute to the field
    - Implement `clearValidationErrors()`: clears all `.field-error` spans and removes `aria-invalid` attributes
    - Implement `resetForm()`: calls `document.getElementById("transaction-form").reset()`
    - Implement `showError(message)`: sets text content of `#error-banner`, sets `display: block`, replaces any previous message
    - Implement `hideError()`: sets `#error-banner` to `display: none`
    - _Requirements: 1.4, 6.6, 6.7, 7.9_

- [x] 7. Implement event handlers and bootstrap
  - [x] 7.1 Implement `handleFormSubmit(event)` in `js/app.js`
    - Call `event.preventDefault()` and `clearValidationErrors()`
    - Read `name`, `amount`, `category` from the form fields
    - Call `validateForm(name, amount, category)`
    - If invalid: call `renderValidationErrors(errors)` and return
    - Call `addTransaction(name, amount, category)`
    - If `saveResult.ok` is false: call `showError(saveResult.error)` and return
    - Call `resetForm()` then `renderAll()`
    - _Requirements: 1.3, 1.4, 1.5, 1.6, 6.1, 6.6_

  - [x] 7.2 Implement `handleDeleteClick(event)` in `js/app.js` using event delegation
    - Attach a single click listener on `#transaction-list` (event delegation)
    - If `event.target` has class `delete-btn`, read `dataset.id`
    - Call `deleteTransaction(id)`
    - If `saveResult.ok` is false: call `showError(saveResult.error)` and return
    - Call `renderAll()`
    - _Requirements: 3.2, 3.3, 6.3_

  - [x] 7.3 Implement `renderAll()` and `init()` in `js/app.js`
    - Implement private `renderAll()`: calls `renderTransactionList(getAll())`, `renderBalance(computeBalance())`, `renderChart(computeCategoryTotals())` in sequence
    - Implement `init()`:
      1. Call `loadTransactions()`; if result array is shorter than the raw JSON entry count (partial load), call `showError("Some saved transactions could not be restored due to corrupted data.")`
      2. Call `initState(loaded)`
      3. Attach `handleFormSubmit` to `#transaction-form` submit event
      4. Attach dismiss handler on the `#error-banner` close button to call `hideError()`
      5. Call `handleDeleteClick` setup (attach delegation listener on `#transaction-list`)
      6. Call `renderAll()`
    - Register `init` on `document.addEventListener("DOMContentLoaded", init)`
    - _Requirements: 2.3, 6.4, 6.5, 6.7, 7.6, 7.7_

- [x] 8. Checkpoint — full JS pipeline wired
  - Open `index.html` directly in a browser; verify add, delete, balance update, and chart update all work end-to-end
  - Verify data persists after page reload
  - Ask the user if there are any questions or changes before proceeding.

- [x] 9. Implement Sort Transactions
  - [x] 9.1 Extend StorageAdapter with sort preference persistence in `js/app.js`
    - Implement `loadSortPreference()`: reads `localStorage.getItem("ebv_sort")`, validates value is one of `["default","amount-asc","amount-desc","category-az"]`, returns it or `"default"` on any failure
    - Implement `saveSortPreference(key)`: writes string to `localStorage.setItem("ebv_sort", key)`, returns `{ ok: true }` or `{ ok: false, error: string }`
    - _Requirements: 8.5_

  - [x] 9.2 Extend TransactionManager with sort state in `js/app.js`
    - Add module-level `_sortKey` variable, defaulting to `"default"`
    - Implement `getSortKey()`: returns current `_sortKey`
    - Implement `setSortKey(key)`: updates `_sortKey`, calls `saveSortPreference(key)`, returns Result; rolls back if save fails
    - Implement `getSortedTransactions()`: returns a sorted shallow copy of `_transactions` based on `_sortKey`:
      - `"default"` → sort by `createdAt` descending
      - `"amount-asc"` → sort by `amount` ascending
      - `"amount-desc"` → sort by `amount` descending
      - `"category-az"` → sort by `category` alphabetically A–Z, then `createdAt` descending as tiebreaker
    - On `initState`, load sort preference from `StorageAdapter` and set `_sortKey`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 9.3 Add Sort_Control to `index.html` and wire up event handler
    - Add `<div id="sort-controls">` with `<label>` and `<select id="sort-select">` containing options: Default (value `"default"`), Amount: Low→High (value `"amount-asc"`), Amount: High→Low (value `"amount-desc"`), Category A–Z (value `"category-az"`)
    - Implement `renderSortControl(currentKey)` in UIRenderer: sets `sort-select` value to `currentKey`
    - Implement `handleSortChange(event)`: reads `event.target.value`, calls `setSortKey`, then `renderAll()`; if setSortKey returns `{ ok: false }`, calls `showError`
    - Attach `handleSortChange` to `#sort-select` change event in `init()`
    - Update `renderAll()` to call `renderTransactionList(getSortedTransactions())` and `renderSortControl(getSortKey())`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 10. Implement Budget Limit Highlights
  - [x] 10.1 Extend StorageAdapter with budget limits persistence in `js/app.js`
    - Implement `loadBudgetLimits()`: reads `localStorage.getItem("ebv_limits")`, parses JSON, validates structure is `{ Food, Transport, Fun }` with each value being a positive number or null, returns parsed object or `{ Food: null, Transport: null, Fun: null }` on any failure
    - Implement `saveBudgetLimits(limits)`: serialises and writes to `localStorage.setItem("ebv_limits", …)`, returns Result
    - _Requirements: 9.3, 9.7_

  - [x] 10.2 Extend Validator with budget limit validation in `js/app.js`
    - Implement `isValidBudgetLimit(value)`: returns `true` iff value is a non-empty string that parses as a finite positive number in `(0, 999999999.99]` with at most 2 decimal places
    - _Requirements: 9.1_

  - [x] 10.3 Extend TransactionManager with budget limit state in `js/app.js`
    - Add module-level `_budgetLimits` variable: `{ Food: null, Transport: null, Fun: null }`
    - Implement `getBudgetLimits()`: returns a copy of `_budgetLimits`
    - Implement `setBudgetLimit(category, value)`: updates `_budgetLimits[category]` (null to clear), calls `saveBudgetLimits`, returns Result; rolls back if save fails
    - Implement `getExceededCategories()`: returns an array of Category strings where `computeCategoryTotals()[cat] >= _budgetLimits[cat]` and `_budgetLimits[cat] !== null`
    - On `initState`, load budget limits from `StorageAdapter` and set `_budgetLimits`
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 10.4 Add budget limit UI to `index.html` and wire up rendering and events
    - Add `<div id="budget-limits">` section with three `<label>` + `<input type="number" class="budget-input" data-category="[Food|Transport|Fun]">` pairs and adjacent `<span class="budget-error">` for inline errors
    - Add `<div id="budget-warnings">` inside or adjacent to the `#balance-display` area
    - Implement `renderBudgetLimitInputs(limits)` in UIRenderer: sets each `#budget-input` value to the stored limit or empty string if null
    - Implement `renderBudgetWarnings(exceededCategories)` in UIRenderer: clears `#budget-warnings`, then for each exceeded category inserts a `<span>` with a warning message (e.g. "⚠️ Food limit exceeded")
    - Update `renderTransactionList` to add `data-exceeded="true"` attribute to each `<li>` whose category is in `getExceededCategories()`
    - Implement `handleBudgetLimitChange(event)`: reads `data-category` and input value; if value is empty calls `setBudgetLimit(category, null)`; if non-empty validates with `isValidBudgetLimit` — on invalid shows inline error, on valid calls `setBudgetLimit(category, parseFloat(value))` and clears inline error; calls `renderAll()` on any successful change
    - Attach `handleBudgetLimitChange` to each `.budget-input` change event in `init()`
    - Update `renderAll()` to call `renderBudgetWarnings(getExceededCategories())`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 11. Implement Dark/Light Mode Toggle
  - [x] 11.1 Extend StorageAdapter with theme persistence in `js/app.js`
    - Implement `loadThemePreference()`: reads `localStorage.getItem("ebv_theme")`, returns `"light"` or `"dark"` if valid; otherwise reads `window.matchMedia("(prefers-color-scheme: dark)").matches` to return `"dark"` or `"light"` as system default
    - Implement `saveThemePreference(theme)`: writes to `localStorage.setItem("ebv_theme", theme)`, returns Result
    - _Requirements: 10.3, 10.4_

  - [x] 11.2 Implement theme CSS in `css/styles.css`
    - Define all colour values as CSS custom properties on `[data-theme="light"]` and `[data-theme="dark"]` attribute selectors on `:root` or `html`:
      - `--bg-color`, `--surface-color`, `--text-color`, `--text-muted`, `--border-color`, `--accent-color`, `--warning-color`, `--error-color`
    - Replace all hardcoded colour values in existing CSS rules with their corresponding custom property references
    - Ensure chart colours (dataset `backgroundColor` array) provide sufficient contrast in both themes — define light and dark chart colour palettes as JS constants in `app.js` and pass the correct palette to `renderChart` based on current theme
    - _Requirements: 10.1, 10.2, 10.6_

  - [x] 11.3 Add Theme_Toggle button to `index.html` and wire up handler
    - Add `<button id="theme-toggle" aria-label="Toggle theme">☀️ Light</button>` in the page `<header>`
    - Implement `applyTheme(theme)` in UIRenderer: sets `document.documentElement.dataset.theme = theme`, updates `#theme-toggle` button text to `"🌙 Dark"` when dark and `"☀️ Light"` when light
    - Implement `handleThemeToggle()`: reads current theme from `document.documentElement.dataset.theme`, toggles to opposite, calls `applyTheme`, then `saveThemePreference`; if save fails calls `showError`
    - In `init()`: call `loadThemePreference()`, then `applyTheme(loadedTheme)` before `renderAll()`
    - Attach `handleThemeToggle` to `#theme-toggle` click event in `init()`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12. Implement CSS styling
  - [x] 12.1 Write base layout and typography in `css/styles.css`
    - Apply `box-sizing: border-box` globally; set a readable base font (`sans-serif`, ~16 px) and a max-width centred page layout
    - Style the page header / title area
    - _Requirements: 7.8_

  - [x] 12.2 Style the Balance Display and error banner
    - Balance Display: prominent font size, currency value visually distinct (bold or coloured), always visible at top
    - Error banner: distinct background (e.g. light red), full-width below header, hidden by default, dismiss button aligned right
    - _Requirements: 4.1, 6.6, 6.7, 7.9_

  - [x] 12.3 Style the Input Form and validation errors
    - Lay out label + input pairs vertically; full-width inputs on mobile
    - `.field-error` spans styled in red, small font, displayed as block below each field
    - Submit button styled distinctly (contrasting background)
    - _Requirements: 1.1, 1.4_

  - [x] 12.4 Style the Transaction List
    - Fixed-height scrollable container (`overflow-y: auto`) with a visible border or shadow
    - Each `<li>` displays name, amount, and category in a single row (flexbox); delete button right-aligned
    - Empty state message centred and muted
    - _Requirements: 2.4, 3.1_

  - [x] 12.5 Style the pie chart canvas and placeholder
    - Chart canvas constrained to a reasonable max-width (e.g. 400 px), centred
    - Placeholder text centred and muted when no data is available
    - _Requirements: 5.7_

  - [x] 12.6 Add responsive layout adjustments
    - At narrow viewports (≤ 600 px): stack form fields, list, and chart vertically; ensure no horizontal overflow
    - _Requirements: 7.8_

- [x] 13. Final checkpoint — full app review
  - Open `index.html` in Chrome, Firefox, Edge, and Safari; confirm all UI components render correctly and no console errors appear
  - Verify the 100 ms interaction responsiveness requirement by manually testing add/delete flows
  - Ensure all property tests (if implemented) pass with `vitest --run` or `jest --testPathPattern`
  - Ask the user if there are any final questions or changes.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP. The app is fully functional without the property-based tests.
- Property tests require `fast-check` and a test runner (`vitest` or `jest`). Install with `npm install --save-dev vitest fast-check` if you choose to implement them.
- Each task references specific requirements from `requirements.md` for traceability and design decisions from `design.md`.
- The `renderAll()` re-render-on-every-mutation pattern (Tasks 7.3, 7.1, 7.2) guarantees consistency between the list, balance, and chart at all times.
- No backend server, build tool, or framework is needed — the app runs by opening `index.html` directly.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["6.1", "6.2", "6.4", "6.6"] },
    { "id": 5, "tasks": ["7.1", "7.2"] },
    { "id": 6, "tasks": ["7.3"] },
    { "id": 7, "tasks": ["9.1", "10.1", "11.1"] },
    { "id": 8, "tasks": ["9.2", "10.2", "10.3", "11.2"] },
    { "id": 9, "tasks": ["9.3", "10.4", "11.3"] },
    { "id": 10, "tasks": ["12.1"] },
    { "id": 11, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6"] }
  ]
}
```
