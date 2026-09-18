# CodingCamp-14Sept26-farid
# 💰 Expense & Budget Visualizer

A lightweight, browser-based expense tracker that helps you **record, organize, visualize, and monitor your spending** — without needing a backend or database.

Built with **HTML, CSS, and Vanilla JavaScript**, the application stores your data directly in the browser using **Local Storage**, making it simple to run and easy to explore.

---

## ✨ Features

### 🧾 Track Expenses

Add expenses with:

* Item name
* Amount
* Category

  * 🍔 Food
  * 🚗 Transport
  * 🎮 Fun

The app validates your input before adding a transaction and automatically clears the form after a successful submission.

### 📋 Transaction List

View your recorded expenses in a scrollable list.

Each transaction displays:

* Item name
* Amount
* Category
* Delete action

Your newest transactions appear first by default.

### 💵 Total Spending

A prominent balance display automatically calculates your **total cumulative spending**.

It updates instantly whenever you:

* Add a transaction
* Delete a transaction

### 📊 Spending Visualization

Understand where your money goes with a **pie chart** showing spending distribution across categories.

The chart automatically updates whenever your transaction data changes.

### 🔃 Sort Your Transactions

Quickly organize your expense list using:

* **Default** — newest transactions first
* **Amount: Low → High**
* **Amount: High → Low**
* **Category: A → Z**

Your selected sorting preference is remembered between sessions.

### 🎯 Category Budgets

Set a spending limit for each category.

When spending **meets or exceeds** a category's budget:

* Transactions in that category are visually highlighted
* A warning indicator identifies the affected category

Budget limits are saved automatically and restored when you return to the app.

### 🌙 Dark & ☀️ Light Mode

Switch between light and dark themes for a more comfortable viewing experience.

On your first visit, the app follows your system colour-scheme preference. Once you choose a theme, your preference is saved for future sessions.

### 💾 Persistent Browser Storage

Your transactions, sorting preference, budget limits, and theme preference are stored using the browser's `localStorage`.

No account.
No backend.
No database.

---

## 🛠️ Tech Stack

| Technology                   | Purpose                             |
| ---------------------------- | ----------------------------------- |
| **HTML5**                    | Application structure               |
| **CSS3**                     | Styling and responsive UI           |
| **Vanilla JavaScript**       | Application logic and interactivity |
| **Browser Local Storage**    | Persistent client-side data         |
| **Charting Library via CDN** | Spending visualization              |

No JavaScript framework or build tool is required.

---

## 📁 Project Structure

```text
expense-budget-visualizer/
│
├── index.html
│
├── css/
│   └── ...              # Application styles
│
└── js/
    └── ...              # Application logic
```

The project is intentionally kept small and dependency-light, with exactly one CSS file inside `css/` and one JavaScript file inside `js/`.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
```

### 2. Open the project

Navigate to the project directory:

```bash
cd expense-budget-visualizer
```

### 3. Run the application

No backend server or installation is required.

Simply open:

```text
index.html
```

in a modern web browser.

That's it! 🎉

---

## 🧭 How It Works

The application follows a simple client-side flow:

```text
        Add Expense
             │
             ▼
      Validate Input
             │
             ▼
      Create Transaction
             │
             ▼
       Save to LocalStorage
             │
       ┌─────┼─────┐
       ▼     ▼     ▼
    Balance List  Chart
       │
       ▼
  Budget Checking
```

All major UI components update automatically when transaction data changes.

---

## 💾 Data Persistence

The application uses the browser's built-in `localStorage` API.

The following information can persist between sessions:

| Data             | Storage Key   |
| ---------------- | ------------- |
| Transactions     | Local Storage |
| Sort preference  | `ebv_sort`    |
| Category budgets | `ebv_limits`  |
| Theme preference | `ebv_theme`   |

If saved transaction data cannot be restored, the application falls back to an empty state and displays an appropriate error message.

---

## 💡 Example Workflow

A typical session might look like this:

**1. Add an expense**

> Lunch — $12.50 — Food

**2. Add another expense**

> Bus Ticket — $3.00 — Transport

**3. Set category budgets**

> Food → $100
> Transport → $50
> Fun → $75

**4. Review the dashboard**

The total spending and pie chart update automatically.

**5. Sort the transactions**

For example, switch to **Amount: High → Low** to find your largest expenses.

**6. Exceed a budget**

If Food spending reaches or exceeds its limit, Food transactions are highlighted and a warning appears.

---

## 🎯 Project Goals

The project demonstrates how a small frontend application can combine:

* Form validation
* DOM manipulation
* Client-side state management
* Data persistence
* Data visualization
* Sorting and filtering-style interactions
* Budget monitoring
* Theme customization

while remaining **simple, dependency-light, and backend-free**.

---

## 🌐 Browser Compatibility

The application is designed to work with current stable versions of:

* Google Chrome
* Mozilla Firefox
* Microsoft Edge
* Safari

It should function as a standalone web page without requiring a backend server.

---

## ⚡ Performance

The project is designed with lightweight client-side interactions in mind.

Target behavior includes:

* Initial rendering within **2 seconds** under the defined test conditions
* UI updates within **100 ms** after user interactions
* Local Storage operations performed promptly after data changes

---

## 🔒 Privacy

Your expense data stays in your browser's Local Storage.

There is:

* ❌ No backend server
* ❌ No user account
* ❌ No external database
* ✅ Client-side data storage

> Clearing the browser's Local Storage/site data may remove saved transactions and preferences.

---

## 📌 Project Status

**Mini Project — Expense & Budget Visualizer**

The project focuses on demonstrating a complete, interactive frontend experience using standard web technologies without relying on a JavaScript framework.

---

### 👨‍💻 Built With

**HTML • CSS • Vanilla JavaScript • Local Storage • Data Visualization**

> Track it. Visualize it. Budget it. 💰📊