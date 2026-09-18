# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a fully client-side single-page application built with plain HTML, CSS, and Vanilla JavaScript. It lets users record personal expenses as transactions (name + amount + category), see a live running total balance, review a scrollable history list with per-entry deletion, and understand their spending distribution through an interactive pie chart — all without a backend server.

Data is persisted exclusively in the browser's `localStorage` under the key `"ebv_transactions"`, so the app works offline and survives page refreshes. The charting library (Chart.js 4.x) is loaded from the jsDelivr CDN; the rest of the runtime has zero external dependencies.

### Goals

- Zero-install: open `index.html` directly in any modern browser.
- Immediate feedback: every UI interaction (add, delete) reflects in the DOM within 100 ms.
- Resilient storage: graceful degradation if `localStorage` is unavailable or corrupted.
- Cross-browser correctness: Chrome, Firefox, Edge, Safari (current stable releases).
- User-controlled sort order, per-category budget limits with visual warnings, and a dark/light theme toggle persisted across sessions.

---

## Architecture

The app is a layered, single-responsibility design with three conceptual layers that live in two files (`index.html` and `js/app.js`) plus one stylesheet (`css/styles.css`).

```
┌─────────────────────────────────────────────────────────┐
│                        UI Layer                         │
│  index.html  ──  DOM structure & CDN script tag        │
│  css/styles.css  ──  presentation                      │
└────────────────────────┬────────────────────────────────┘
                         │ reads / writes DOM
┌────────────────────────▼────────────────────────────────┐
│                    App Controller                        │
│  js/app.js                                              │
│  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────┐  │
│  │  Validator   │  │ TransactionManager│  │  UIRenderer      │  │
│  │  (pure fns)  │  │  (state manager)  │  │  (DOM ops only)  │  │
│  └──────────────┘  └────────┬──────────┘  └────────┬─────────┘  │
└──────────────────────────── │ ─────────────────────│────────────┘
                              │                       │
┌─────────────────────────────▼───────────────────────▼───────────┐
│                      Persistence Layer                            │
│  StorageAdapter  ──  wraps localStorage read/write               │
└──────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Single JS file (`js/app.js`) | Requirement 7.3 mandates exactly one JS file; module-like separation is achieved through clearly named function groups within the file. |
| Chart.js 4.x via CDN | Requirement 7.4 permits CDN-loaded charting libraries. Chart.js loaded from `https://cdn.jsdelivr.net/npm/chart.js` offers a mature pie chart API with no local installation. |
| `localStorage` key `"ebv_transactions"` | Single, namespaced key holding the full serialised `Transaction[]`. Avoids key collisions in shared browser storage. |
| Immutable transaction IDs | Each transaction gets a composite ID (`Date.now() + "-" + Math.random()`) at creation time. IDs are never reused, which makes deletions unambiguous. |
| Re-render on every state change | Simplifies correctness — after each mutation the full list, balance, and chart are re-derived from the single authoritative in-memory array, eliminating stale-view bugs. |
| No edit UI | Requirement 5.5 references editing (chart must update when a transaction is edited) but no requirement defines an edit interaction. The current scope omits an edit UI. Requirement 5.5 is satisfied architecturally: any future edit will call the same `saveTransactions → renderAll` pipeline. |
| Sort state in memory + localStorage | The active sort key (`"default"`, `"amount-asc"`, `"amount-desc"`, `"category-az"`) is stored in a module-level variable and persisted under `"ebv_sort"`. `renderTransactionList` sorts a copy of the array before rendering, so the canonical `_transactions` array is never mutated. |
| Budget limits in localStorage | Per-category limits are stored as `{ Food: number|null, Transport: number|null, Fun: number|null }` under `"ebv_limits"`. The `TransactionManager` exposes `getBudgetLimits()` and `setBudgetLimit(category, value)`. Highlights and warnings are derived on every `renderAll()` call. |
| CSS custom properties for theming | Light and dark themes are defined as two sets of CSS custom properties (`--bg-color`, `--text-color`, etc.) on `[data-theme="light"]` and `[data-theme="dark"]` selectors. Switching theme applies `document.documentElement.dataset.theme`. No JS colour values — all colours live in `css/styles.css`. |

---

## Components and Interfaces

All logic lives in `js/app.js`, organised as distinct function groups. The sections below describe each group's responsibilities and public-facing interface.

### 1. StorageAdapter

Wraps `localStorage` so the rest of the app never calls `localStorage` directly.

```js
// Returns parsed Transaction[] or [] on any failure
function loadTransactions(): Transaction[]

// Serialises transactions and saves under key "ebv_transactions"
// Returns { ok: true } or { ok: false, error: string }
function saveTransactions(transactions: Transaction[]): Result

// Loads sort preference; returns one of "default"|"amount-asc"|"amount-desc"|"category-az" or "default" on failure
function loadSortPreference(): SortKey

// Saves sort preference; returns Result
function saveSortPreference(key: SortKey): Result

// Loads budget limits; returns BudgetLimits or { Food: null, Transport: null, Fun: null } on failure
function loadBudgetLimits(): BudgetLimits

// Saves budget limits; returns Result
function saveBudgetLimits(limits: BudgetLimits): Result

// Loads theme preference; returns "light"|"dark" or system preference on failure
function loadThemePreference(): Theme

// Saves theme preference; returns Result
function saveThemePreference(theme: Theme): Result
```

Behaviour:
- Catches `SecurityError` (private-browsing quota) and `JSON.parse` exceptions.
- Never throws — always returns a typed result object.
- On load, silently drops individual transaction objects that fail structural validation (wrong/missing fields); valid entries are still returned.

### 2. Validator

Pure functions with no DOM access or side effects.

```js
// Returns { valid: true } or { valid: false, errors: ValidationErrors }
function validateForm(name: string, amount: string, category: string): ValidationResult
```

```js
// Internal helper — exposed for property tests
function isValidAmount(amountStr: string): boolean
```

```js
// Returns true iff value is a positive finite number with at most 2 decimal places (same rules as transaction amount)
function isValidBudgetLimit(value: string): boolean
```

Validation rules (Requirement 1.3):
- `name`: non-empty after trimming; at most 100 characters.
- `amount`: must parse as a finite number, be in the range `[0.01, 999999999.99]`, and have at most 2 decimal places.
- `category`: must be exactly one of `["Food", "Transport", "Fun"]`.

All three fields are validated independently; errors are collected and returned together.

### 3. TransactionManager

Holds the canonical in-memory `Transaction[]` state and exposes mutating operations.

```js
function initState(transactions: Transaction[]): void
function getAll(): Transaction[]                           // returns a shallow copy
function addTransaction(name, amount, category): { tx: Transaction, saveResult: Result }
function deleteTransaction(id: string): { found: boolean, saveResult: Result }
function computeBalance(): number
function computeCategoryTotals(): CategoryTotals          // { Food: number, Transport: number, Fun: number }
function getSortKey(): SortKey
function setSortKey(key: SortKey): Result                 // saves to localStorage
function getBudgetLimits(): BudgetLimits
function setBudgetLimit(category: Category, value: number | null): Result  // saves to localStorage
function getExceededCategories(): Category[]              // returns categories where total >= limit
function getSortedTransactions(): Transaction[]           // applies current sort to getAll() copy
```

Mutation pattern (add or delete):
1. Apply change to in-memory array.
2. Call `StorageAdapter.saveTransactions`.
3. If save fails, roll back the in-memory change and return the error result.
4. Return result to the event handler, which decides whether to render or show an error.

### 4. UIRenderer

All DOM reads and writes are isolated here. No business logic.

```js
function renderTransactionList(transactions: Transaction[]): void
function renderBalance(total: number): void
function renderChart(categoryTotals: CategoryTotals): void
function renderValidationErrors(errors: ValidationErrors): void
function clearValidationErrors(): void
function resetForm(): void
function showError(message: string): void   // persistent alert banner
function hideError(): void
function renderBudgetWarnings(exceededCategories: Category[]): void
function renderBudgetLimitInputs(limits: BudgetLimits): void
function renderSortControl(currentKey: SortKey): void
function applyTheme(theme: Theme): void
```

`renderTransactionList` now calls `getSortedTransactions()` instead of sorting by `createdAt` directly. Each `<li>` receives a `data-exceeded="true"` attribute when its category is in `getExceededCategories()`, which CSS uses to apply highlight styling.

`renderBudgetWarnings(exceededCategories: Category[]): void` — updates a `<div id="budget-warnings">` in the Balance_Display area with warning messages for each exceeded category.

`renderBudgetLimitInputs(limits: BudgetLimits): void` — populates the three budget limit input fields with their current stored values.

`renderSortControl(currentKey: SortKey): void` — sets the Sort_Control dropdown to the active sort key value.

`applyTheme(theme: Theme): void` — sets `document.documentElement.dataset.theme`, updates the Theme_Toggle button label/icon.

`renderChart` manages the Chart.js instance lifecycle:
- Creates the chart on first call after verifying that the `Chart` global is defined.
- On subsequent calls, updates `chart.data` and calls `chart.update("none")` to avoid destroying and recreating the canvas context.
- Only renders segments for categories with a total `> 0`.
- If `Chart` is `undefined` (CDN failed), calls `showError(...)` and returns without crashing.

`renderBalance` formats the number as `"$" + total.toFixed(2)`.

### 5. Event Handlers and Bootstrap

```js
function handleFormSubmit(event: SubmitEvent): void
function handleDeleteClick(event: MouseEvent): void   // event delegation on the list container
function handleSortChange(event: Event): void
function handleBudgetLimitChange(event: Event): void
function handleThemeToggle(): void
function init(): void   // registered on DOMContentLoaded
```

`handleSortChange(event)` — reads the selected value from the Sort_Control dropdown, calls `setSortKey`, then calls `renderAll()`.

`handleBudgetLimitChange(event)` — reads the category and value from the changed budget limit input, validates with `isValidBudgetLimit`, calls `setBudgetLimit` (or clears the limit if the input is empty), then calls `renderAll()`. If validation fails, an inline error is shown adjacent to the input field.

`handleThemeToggle()` — reads the current theme from `document.documentElement.dataset.theme`, toggles it to the other value, calls `applyTheme`, and saves the new preference via `saveThemePreference`.

`init` sequence:
1. Call `StorageAdapter.loadTransactions()`.
2. Call `TransactionManager.initState(loaded)`.
3. If load returned corrupted/partial data, call `showError(...)`.
4. Load sort preference, budget limits, and theme preference from `StorageAdapter`.
5. Apply theme immediately via `applyTheme`.
6. Call `renderAll()` — a private helper that fires `renderTransactionList`, `renderBalance`, `renderChart`, `renderBudgetWarnings`, and `renderSortControl` in sequence.

`renderAll()` is the single re-render entry point used after every mutation. It calls `renderTransactionList(getSortedTransactions())`, `renderBalance(computeBalance())`, `renderChart(computeCategoryTotals())`, `renderBudgetWarnings(getExceededCategories())`, and `renderSortControl(getSortKey())`.

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string}   id          - Composite unique ID: `Date.now() + "-" + Math.random()`
 * @property {string}   name        - Item name (1–100 chars, trimmed)
 * @property {number}   amount      - Positive monetary value, max 2 decimal places
 * @property {Category} category    - "Food" | "Transport" | "Fun"
 * @property {number}   createdAt   - Unix timestamp (ms) used for insertion-order sort
 */
```

### Category

```js
/** @typedef {"Food" | "Transport" | "Fun"} Category */
const CATEGORIES = ["Food", "Transport", "Fun"];
```

### CategoryTotals

```js
/**
 * @typedef {Object} CategoryTotals
 * @property {number} Food
 * @property {number} Transport
 * @property {number} Fun
 */
```

### SortKey

```js
/** @typedef {"default" | "amount-asc" | "amount-desc" | "category-az"} SortKey */
```

### BudgetLimits

```js
/**
 * @typedef {Object} BudgetLimits
 * @property {number|null} Food
 * @property {number|null} Transport
 * @property {number|null} Fun
 */
```

### Theme

```js
/** @typedef {"light" | "dark"} Theme */
```

### ValidationErrors

```js
/**
 * @typedef {Object} ValidationErrors
 * @property {string} [name]      - e.g. "Item name is required."
 * @property {string} [amount]    - e.g. "Amount must be between 0.01 and 999,999,999.99 with at most 2 decimal places."
 * @property {string} [category]  - e.g. "Please select a category."
 */
```

### ValidationResult

```js
/**
 * @typedef {{ valid: true } | { valid: false, errors: ValidationErrors }} ValidationResult
 */
```

### Result (storage operations)

```js
/**
 * @typedef {{ ok: true } | { ok: false, error: string }} Result
 */
```

### localStorage Schema

Transactions are stored under the key `"ebv_transactions"` as a JSON-serialised `Transaction[]` array. Additional keys:

- `"ebv_sort"` — stores the active `SortKey` string.
- `"ebv_limits"` — stores a `BudgetLimits` object with per-category number-or-null values.
- `"ebv_theme"` — stores the active `Theme` string (`"light"` or `"dark"`).

```json
[
  {
    "id": "1718000000000-0.123456789",
    "name": "Lunch",
    "amount": 12.50,
    "category": "Food",
    "createdAt": 1718000000000
  }
]
```

All five fields (`id`, `name`, `amount`, `category`, `createdAt`) are required. A transaction object missing any of these fields or containing a non-`Category` value for `category` is treated as corrupted and silently dropped during deserialisation; the remaining valid entries are loaded.

---

## index.html Additions

The following structural elements are added to `index.html` to support the new features:

- `<button id="theme-toggle">` in the page header — triggers `handleThemeToggle()`.
- `<div id="sort-controls">` with a `<select id="sort-select">` containing options for each `SortKey`, placed above the transaction list — triggers `handleSortChange(event)`.
- `<div id="budget-limits">` section with three labeled `<input type="number">` fields (one per category: Food, Transport, Fun) and inline `<span>` error elements adjacent to each input — triggers `handleBudgetLimitChange(event)`.
- `<div id="budget-warnings">` inside or adjacent to the Balance_Display area — populated by `renderBudgetWarnings()`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Serialisation round-trip preserves all transaction fields

*For any* valid array of 0–500 `Transaction` objects, serialising the array to `localStorage` via `saveTransactions` and then deserialising it via `loadTransactions` SHALL produce a list where each transaction's `id`, `name`, `amount`, `category`, and `createdAt` are identical to the originals.

**Validates: Requirements 6.8, 6.1, 6.4**

---

### Property 2: Whitespace-only names are always rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines, or any combination), `validateForm` SHALL return `{ valid: false }` with a non-empty `errors.name` value, and the transaction list SHALL remain unchanged.

**Validates: Requirements 1.3, 1.4**

---

### Property 3: Amount validation accepts exactly the valid numeric range

*For any* string input to the amount field, `validateForm` SHALL accept it if and only if it represents a finite number in the range `[0.01, 999999999.99]` with at most 2 decimal places, and SHALL reject it otherwise with a non-empty `errors.amount` value.

**Validates: Requirements 1.3, 1.4**

---

### Property 4: Balance equals the arithmetic sum of all transaction amounts

*For any* transaction list containing at least one transaction with a positive amount, `computeBalance()` SHALL return a value numerically equal to the sum of every transaction's `amount` field, and the formatted Balance_Display string SHALL match the pattern `$X.XX` (exactly 2 decimal places).

**Validates: Requirements 4.2, 4.3, 4.4, 3.4**

---

### Property 5: Category totals partition the full balance

*For any* transaction list containing only positive amounts, the sum of `CategoryTotals.Food + CategoryTotals.Transport + CategoryTotals.Fun` SHALL equal `computeBalance()`, and the proportional size of each category's chart segment SHALL equal `categoryTotal / grandTotal`.

**Validates: Requirements 5.2, 3.5**

---

### Property 6: Delete then absent

*For any* transaction list and any transaction ID present in that list, after calling `deleteTransaction(id)`, the list returned by `getAll()` SHALL not contain any transaction with that `id`, and the updated list SHALL be persisted to `localStorage`.

**Validates: Requirements 3.2**

---

### Property 7: Add then present

*For any* transaction list and any valid `(name, amount, category)` triple, after calling `addTransaction(name, amount, category)`, the list returned by `getAll()` SHALL contain exactly one new transaction with matching `name`, `amount`, and `category` values, and the list length SHALL have increased by exactly one.

**Validates: Requirements 1.5, 2.2**

---

### Property 8: Empty list produces zero balance and empty chart state

*For any* state where the transaction list is empty, `computeBalance()` SHALL return `0`, the Balance_Display SHALL render `"$0.00"`, and `computeCategoryTotals()` SHALL return `{ Food: 0, Transport: 0, Fun: 0 }` (no chart segments rendered).

**Validates: Requirements 4.5, 5.7**

---

### Property 9: Transaction list renders all required fields for every entry

*For any* transaction list, `renderTransactionList` SHALL produce a DOM where each transaction's rendered entry contains the item name, the amount formatted as `$X.XX`, and the category label, plus a delete button.

**Validates: Requirements 2.1, 3.1**

---

### Property 10: Chart segment labels contain correct category name and percentage

*For any* transaction list with at least one category that has a positive total, the chart data labels produced by `renderChart` SHALL contain the category name and the corresponding percentage of total spending rounded to one decimal place (e.g., `"Food (42.3%)"`).

**Validates: Requirements 5.6, 5.1**

---

### Property 11: Sort order is stable across add/delete

*For any* transaction list and sort key, after calling `addTransaction` or `deleteTransaction` followed by `getSortedTransactions()`, the returned array SHALL be sorted according to the active sort key.

**Validates: Requirements 8.2, 8.4**

---

### Property 12: Budget limit threshold triggers highlight exactly at boundary

*For any* category and any budget limit L > 0, when the sum of that category's transaction amounts equals exactly L, `getExceededCategories()` SHALL include that category; when the sum is less than L, it SHALL not include it.

**Validates: Requirements 9.4, 9.5**

---

### Property 13: Theme preference round-trip

*For any* theme value in `["light", "dark"]`, `saveThemePreference(theme)` followed by `loadThemePreference()` SHALL return the same theme value.

**Validates: Requirement 10.4**

---

## Error Handling

| Scenario | Detection point | Response |
|---|---|---|
| Form field missing or invalid | `Validator.validateForm` returns `{ valid: false }` | Inline error message below each failing field; transaction not created (Req 1.4) |
| `localStorage` write failure (quota exceeded, private mode) | `StorageAdapter.saveTransactions` returns `{ ok: false }` | Persistent error banner shown; in-memory state rolled back to pre-operation state (Req 3.3, 6.6) |
| `localStorage` read failure on load | `loadTransactions` catches exception, returns `[]` | App initialises with empty state; error banner displayed explaining saved data could not be restored (Req 6.7) |
| Corrupted individual transaction in stored JSON | Structural field validation during `loadTransactions` deserialisation | Silently drop malformed entry; load remaining valid entries; overall load treated as partial degradation (Req 6.7) |
| Chart.js CDN load failure | `typeof Chart === "undefined"` checked inside `renderChart` | Error banner: "Chart unavailable — check your internet connection."; all non-chart features (Input_Form, Transaction_List, Balance_Display) continue working (Req 7.9) |
| Transaction ID not found on delete | `deleteTransaction` returns `{ found: false }` | No state change; no user-visible error (defensive no-op) |
| Budget limit input invalid | `isValidBudgetLimit` returns false | Inline error shown adjacent to the budget input field; limit not saved or applied |
| Budget limit localStorage write failure | `saveBudgetLimits` returns `{ ok: false }` | Error banner shown; in-memory limit rolled back |
| Sort preference localStorage write failure | `saveSortPreference` returns `{ ok: false }` | Error banner shown; sort still applied in-memory for current session |
| Theme preference localStorage write failure | `saveThemePreference` returns `{ ok: false }` | Theme applied visually for current session; error banner shown |

### Error Banner Design

A single `<div id="error-banner">` element sits directly below the page header. It is hidden by default (`display: none`) and shown via `showError(message: string)`. It contains the message text and a dismiss (×) button that calls `hideError()`. Only one error message is active at a time; a new `showError` call replaces the previous message. Validation inline errors are separate from this banner and live adjacent to their respective form fields.

---

## Testing Strategy

### Dual Testing Approach

Unit tests verify specific examples, integration points, and error conditions. Property-based tests verify universal correctness across a large randomised input space for the pure logic functions (`Validator`, `StorageAdapter`, `TransactionManager`). Together they provide comprehensive coverage without redundancy.

### Property-Based Tests

Use [fast-check](https://github.com/dubzzz/fast-check) as the property-based testing library, run via Vitest or Jest with a single-run flag (`--run` / `--testPathPattern`).

Each property test runs a minimum of **100 iterations**.

Each test is annotated with a comment in the format:
`// Feature: expense-budget-visualizer, Property N: <property title>`

| Property | Description | Generator inputs |
|---|---|---|
| Property 1 | Serialise → deserialise round-trip | Random `Transaction[]` of length 0–500 |
| Property 2 | Whitespace-only names rejected | Strings from `fc.string()` mapped to whitespace-only variants |
| Property 3 | Amount range validation | Numeric strings: in-range valid, below 0.01, above limit, >2 dp, non-numeric |
| Property 4 | Balance equals sum of amounts | Random `Transaction[]` with positive amounts |
| Property 5 | Category totals partition balance | Random `Transaction[]` with positive amounts across all three categories |
| Property 6 | Delete then absent | Random list + random target ID drawn from the list |
| Property 7 | Add then present | Random list + random valid `(name, amount, category)` triple |
| Property 8 | Empty list → zero balance and totals | Fixed empty input (no generator needed) |
| Property 9 | Render contains all required fields | Random `Transaction[]` — inspect DOM output |
| Property 10 | Chart labels contain name and percentage | Random transactions ensuring ≥1 category has positive total |
| Property 11 | Sort order stable across add/delete | Random `Transaction[]`, random `SortKey`, random add/delete operation |
| Property 12 | Budget limit threshold at boundary | Random category, random limit L > 0, transactions summing to exactly L and to L − ε |
| Property 13 | Theme preference round-trip | Both values in `["light", "dark"]` |

### Unit Tests

Representative examples to cover:

- Valid form submission creates a transaction with the correct `name`, `amount`, `category`, and `id`.
- Each invalid input type (empty name, non-numeric amount, out-of-range amount, amount with >2 dp, unselected category) triggers the correct inline error and prevents transaction creation.
- Form resets after a successful submission (all fields cleared, category back to default).
- Deleting a transaction removes it from the list and updates balance and chart.
- `localStorage` write failure on add: error banner shown, transaction not added to list.
- `localStorage` write failure on delete: error banner shown, transaction retained in list.
- App init with valid stored data: list, balance, and chart reflect stored transactions.
- App init with corrupted `localStorage` JSON: empty state rendered, error banner shown.
- App init with empty `localStorage`: empty list, `$0.00` balance, chart placeholder shown.
- CDN failure (`Chart` undefined): error banner shown, form and list still functional.
- Transaction list shows "no transactions" placeholder when empty.
- Most-recently-added transaction renders at the top of the list (default sort).
- Changing sort to `"amount-desc"` renders the highest-amount transaction first.
- Setting a budget limit of `$50` for Food and adding `$50` in Food transactions causes the Food entries to receive `data-exceeded="true"` and `renderBudgetWarnings` to include Food.
- Setting a budget limit to an invalid value (e.g. `"-5"`) shows an inline error and does not update the stored limit.
- Toggling the theme button switches `document.documentElement.dataset.theme` between `"light"` and `"dark"` and updates the button label.
- Reloading the page restores the previously saved sort key, budget limits, and theme.

### Cross-Browser Testing

Manual smoke-test checklist executed in Chrome, Firefox, Edge, and Safari (current stable):

- Page loads and all UI components are fully rendered within 2 seconds.
- Add, delete, balance update, and chart update all complete within 100 ms of user interaction.
- Chart renders correctly with the correct segments, labels, and percentages.
- `localStorage` persists transactions across page reload.
- CDN failure simulation (DevTools → block `cdn.jsdelivr.net`) shows error banner and preserves all non-chart features.
- Transaction list scrolls when entries overflow the container height.
- Sort dropdown persists across page reload and correctly orders the transaction list.
- Budget limit inputs persist across page reload; exceeded categories are highlighted and budget warnings are displayed.
- Theme toggle persists across page reload; correct theme is applied on initial load.
