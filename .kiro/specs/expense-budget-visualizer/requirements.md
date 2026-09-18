# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses by adding transactions with a name, amount, and category. It displays a live total balance, a scrollable transaction list with delete capability, and a pie chart that visualizes spending distribution by category. All data is persisted in the browser's Local Storage — no backend server is required. The app is implemented with plain HTML, CSS, and Vanilla JavaScript and must run in any modern browser. Additional features include: sorting the transaction list by amount or category so users can quickly find and compare expenses; per-category budget limits with visual highlights and warnings when spending is exceeded; and a dark/light mode toggle that respects the user's system colour-scheme preference and persists the chosen theme across sessions.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an item name, a monetary amount, and a category.
- **Category**: One of three fixed spending classifications — Food, Transport, or Fun.
- **Transaction_List**: The scrollable on-screen list that displays all stored Transactions.
- **Input_Form**: The HTML form containing fields for item name, amount, and category, plus a submit button.
- **Balance_Display**: The UI element at the top of the page that shows the current total balance.
- **Chart**: The pie chart that visualizes the distribution of spending across Categories.
- **Local_Storage**: The browser's built-in `localStorage` API used to persist Transaction data client-side.
- **Validator**: The client-side logic responsible for checking that all Input_Form fields are filled before submission.
- **Sort_Control**: The UI element (e.g. a dropdown or button group) within the Transaction_List that lets the user choose the active sort order for displayed Transactions.
- **Budget_Limit**: A user-defined maximum total spending amount for a given Category; when a Category's cumulative Transaction amounts meet or exceed this value, the App surfaces visual warnings.
- **Theme_Toggle**: The button that switches the App's visual theme between light mode and dark mode.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category, so that I can record a new expense.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name accepting up to 100 characters, a numeric field for amount, and a dropdown selector for category (options: Food, Transport, Fun).
2. THE Input_Form SHALL contain a submit button that triggers transaction creation.
3. WHEN the submit button is activated, THE Validator SHALL check that the item name field is not empty, the amount field contains a numeric value between 0.01 and 999,999,999.99 with at most 2 decimal places, and a category is selected.
4. IF any Input_Form field fails validation, THEN THE App SHALL display an inline error message below the invalid field identifying the missing or invalid field and SHALL NOT create a Transaction.
5. WHEN all Input_Form fields pass validation, THE App SHALL create a new Transaction and add it to the Transaction_List.
6. WHEN a Transaction is successfully added, THE Input_Form SHALL reset the item name field to empty, the amount field to empty, and the category dropdown to its unselected default state.

---

### Requirement 2: Display the Transaction List

**User Story:** As a user, I want to see all my recorded expenses in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display every stored Transaction, showing the item name, the amount formatted as a decimal number with exactly 2 decimal places and a currency symbol (e.g. "$10.00"), and the category for each entry.
2. THE Transaction_List SHALL display Transactions in the order they were added, with the most recent Transaction at the top.
3. WHEN the App loads, THE Transaction_List SHALL display all Transactions previously saved in Local_Storage.
4. IF the number of displayed Transactions exceeds the vertical height of the Transaction_List container, THEN THE Transaction_List SHALL become vertically scrollable to allow access to all entries.
5. IF no Transactions are stored, THEN THE Transaction_List SHALL display a message indicating that no transactions have been recorded yet.

---

### Requirement 3: Delete a Transaction

**User Story:** As a user, I want to remove a transaction from the list, so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete button for each Transaction entry.
2. WHEN a delete button is clicked, THE App SHALL remove the corresponding Transaction from the Transaction_List and persist the updated list to Local_Storage.
3. IF persisting the deletion to Local_Storage fails, THEN THE App SHALL retain the Transaction in the Transaction_List and display an error message indicating the deletion could not be saved.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL recalculate and display the sum of all remaining Transaction amounts.
5. WHEN a Transaction is deleted, THE Chart SHALL recalculate and display the proportional spending distribution of all remaining Transactions by Category.

---

### Requirement 4: Display the Total Balance

**User Story:** As a user, I want to see my total balance displayed prominently at the top of the page, so that I always know my current cumulative spending.

#### Acceptance Criteria

1. THE Balance_Display SHALL be visible at the top of the page above the Transaction_List at all times.
2. THE Balance_Display SHALL show the sum of all Transaction amounts in the Transaction_List, formatted as a currency value with exactly 2 decimal places and a currency symbol.
3. WHEN a Transaction is added, THE Balance_Display SHALL update automatically to include the new Transaction's amount in the displayed sum.
4. WHEN a Transaction is deleted, THE Balance_Display SHALL update automatically to exclude the deleted Transaction's amount from the displayed sum.
5. WHEN the Transaction_List is empty, THE Balance_Display SHALL show a value of zero formatted as a currency value with exactly 2 decimal places and a currency symbol.

---

### Requirement 5: Visualize Spending by Category (Pie Chart)

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand how my money is distributed.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart displaying one segment per Category that has at least one Transaction with an amount greater than zero.
2. THE Chart SHALL calculate each segment's size proportionally to the sum of positive Transaction amounts in that Category relative to the sum of all positive Transaction amounts.
3. WHEN a Transaction is added, THE Chart SHALL update automatically to reflect the new spending distribution.
4. WHEN a Transaction is deleted, THE Chart SHALL update automatically to reflect the revised spending distribution.
5. WHEN a Transaction amount or Category is edited, THE Chart SHALL update automatically to reflect the revised spending distribution.
6. THE Chart SHALL label each segment with the Category name and the corresponding percentage of total spending, rounded to one decimal place.
7. WHEN the Transaction_List is empty or contains no Transactions with an amount greater than zero, THE Chart SHALL display a placeholder message indicating that no spending data is available.

---

### Requirement 6: Persist Data in Local Storage

**User Story:** As a user, I want my transactions to be saved between browser sessions, so that I do not lose my data when I close or refresh the page.

#### Acceptance Criteria

1. WHEN a Transaction is created, THE App SHALL serialize the Transaction and save it to Local_Storage within 500 milliseconds of the creation event.
2. WHEN a Transaction is edited, THE App SHALL serialize the updated Transaction and overwrite its corresponding entry in Local_Storage within 500 milliseconds of the edit event.
3. WHEN a Transaction is deleted, THE App SHALL remove the corresponding entry from Local_Storage within 500 milliseconds of the deletion event.
4. WHEN the App loads, THE App SHALL deserialize all Transactions from Local_Storage and restore the Transaction_List, Balance_Display, and Chart to reflect the saved state within 1000 milliseconds.
5. IF Local_Storage is empty on load, THEN THE App SHALL initialize with an empty Transaction_List, a zero Balance_Display, and an empty Chart state.
6. IF serialization of a Transaction fails during a create or edit operation, THEN THE App SHALL display an error message indicating the data could not be saved and preserve the Transaction_List in its pre-operation state.
7. IF deserialization of Local_Storage data fails on load, THEN THE App SHALL initialize with an empty Transaction_List, a zero Balance_Display, and an empty Chart state, and display an error message indicating saved data could not be restored.
8. FOR ALL valid sets of Transactions containing between 0 and 500 entries, serializing to Local_Storage and then deserializing SHALL produce a Transaction_List where each Transaction's amount, description, and category are identical to the original.

---

### Requirement 7: Technical and Structural Constraints

**User Story:** As a developer, I want the codebase to follow defined structural and technology constraints, so that the project remains simple, maintainable, and dependency-free at runtime.

#### Acceptance Criteria

1. THE App SHALL be implemented using only HTML, CSS, and Vanilla JavaScript — no JavaScript frameworks or build tools are required.
2. THE App SHALL contain exactly one CSS file located inside a `css/` directory.
3. THE App SHALL contain exactly one JavaScript file located inside a `js/` directory.
4. WHERE a charting library is used, THE App SHALL load it from a CDN via a `<script>` tag and SHALL NOT require a local installation.
5. THE App SHALL function as a standalone web page opened directly in a browser without requiring a backend server.
6. THE App SHALL load and render completely within 2 seconds on a standard broadband connection of at least 25 Mbps download speed, measured from the time the HTML file is opened until all visible UI components are fully rendered and interactive.
7. WHEN a user interacts with the Input_Form, Transaction_List, Balance_Display, or Chart, THE App SHALL reflect the change in the UI within 100 milliseconds, measured from the end of the triggering user action to the completion of the DOM update.
8. THE App SHALL render correctly in the current stable releases of Chrome, Firefox, Edge, and Safari, where "renders correctly" means all UI components are fully visible, functional, and free of layout breakage or JavaScript errors in the browser console.
9. IF the CDN resource for the charting library fails to load, THEN THE App SHALL display an error message indicating that the chart is unavailable and SHALL continue to function for all non-chart features, including the Input_Form, Transaction_List, and Balance_Display.

---

### Requirement 8: Sort Transactions

**User Story:** As a user, I want to sort my transaction list by amount or category, so that I can quickly find and compare my expenses.

#### Acceptance Criteria

1. THE Transaction_List SHALL include a Sort_Control that allows the user to choose a sort order from: Default (insertion order, newest first), Amount Ascending, Amount Descending, Category A–Z.
2. WHEN the user selects a sort order, THE Transaction_List SHALL re-render immediately to reflect the chosen order without adding or removing any Transactions.
3. THE Sort_Control SHALL default to the Default (newest first) sort order when the App loads.
4. WHEN Transactions are added or deleted, THE Transaction_List SHALL maintain the currently selected sort order.
5. THE selected sort order SHALL be persisted to Local_Storage under the key "ebv_sort" so that it is restored when the App is reloaded.

---

### Requirement 9: Highlight Expenses Exceeding Budget Limits

**User Story:** As a user, I want to set a spending limit per category and see a visual warning when I exceed it, so that I can stay within my budget.

#### Acceptance Criteria

1. THE App SHALL provide a Budget_Limit input for each Category (Food, Transport, Fun), accepting a positive numeric value with at most 2 decimal places representing the maximum total spending allowed for that Category.
2. THE Budget_Limit inputs SHALL default to empty (no limit set) when the App first loads.
3. WHEN the user enters a valid Budget_Limit for a Category, THE App SHALL save the limit to Local_Storage under the key "ebv_limits" and apply it immediately.
4. IF a Category's total spending meets or exceeds its Budget_Limit, THEN THE Transaction_List SHALL visually highlight all Transactions belonging to that Category (e.g. with a warning colour or icon).
5. IF a Category's total spending meets or exceeds its Budget_Limit, THEN THE Balance_Display area SHALL display a warning indicator identifying which Category has exceeded its limit.
6. WHEN a Budget_Limit is cleared (field emptied) for a Category, THE App SHALL remove the limit for that Category and clear any associated highlights or warnings immediately.
7. Budget_Limit values SHALL be persisted to Local_Storage and restored when the App loads.

---

### Requirement 10: Dark/Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light visual themes, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL display a Theme_Toggle button that switches the UI between light mode and dark mode.
2. WHEN the Theme_Toggle is activated, THE App SHALL apply the selected theme to all visible UI components — including the Input_Form, Transaction_List, Balance_Display, Chart, and error banner — within 100 milliseconds.
3. THE App SHALL default to the user's system colour-scheme preference (using the `prefers-color-scheme` media query) on first load when no saved preference exists.
4. WHEN the user activates the Theme_Toggle, THE selected theme SHALL be saved to Local_Storage under the key "ebv_theme" and restored on the next page load.
5. THE Theme_Toggle button SHALL display a visible label or icon indicating the current mode (e.g. "🌙 Dark" or "☀️ Light") and update it when the theme changes.
6. THE Chart SHALL remain readable (sufficient colour contrast for segments and labels) in both light and dark modes.
