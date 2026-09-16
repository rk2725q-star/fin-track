import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("finance.db");

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS financer (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    rule_config_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    place TEXT,
    phone TEXT,
    preferred_frequency TEXT DEFAULT 'daily',
    preferred_day TEXT DEFAULT 'all',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    asked_amount REAL NOT NULL,
    takeout_amount REAL NOT NULL,
    given_amount REAL NOT NULL,
    total_repay REAL NOT NULL,
    total_paid REAL DEFAULT 0,
    balance REAL NOT NULL,
    status TEXT DEFAULT 'active',
    payment_type TEXT DEFAULT 'daily',
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    close_date DATETIME,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (loan_id) REFERENCES loans(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT,
    expense_date DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Ensure all columns exist in customers table
const customerColumns = db.prepare("PRAGMA table_info(customers)").all() as any[];
const customerColumnNames = customerColumns.map(c => c.name);
if (!customerColumnNames.includes('preferred_frequency')) {
  db.exec("ALTER TABLE customers ADD COLUMN preferred_frequency TEXT DEFAULT 'daily'");
}
if (!customerColumnNames.includes('preferred_day')) {
  db.exec("ALTER TABLE customers ADD COLUMN preferred_day TEXT DEFAULT 'all'");
}

// Migration: Ensure all columns exist in financer table
const columns = db.prepare("PRAGMA table_info(financer)").all() as any[];
const columnNames = columns.map(c => c.name);

if (!columnNames.includes('username')) {
  console.log("Migrating: Adding username column to financer table");
  try {
    db.exec("ALTER TABLE financer ADD COLUMN username TEXT");
    db.exec("UPDATE financer SET username = 'admin' WHERE username IS NULL");
  } catch (err) {
    console.error("Failed to add username column:", err);
  }
}

if (!columnNames.includes('password')) {
  console.log("Migrating: Adding password column to financer table");
  try {
    db.exec("ALTER TABLE financer ADD COLUMN password TEXT");
    db.prepare("UPDATE financer SET password = ? WHERE password IS NULL").run("admin123");
  } catch (err) {
    console.error("Failed to add password column:", err);
  }
}

if (!columnNames.includes('rule_config_json')) {
  console.log("Migrating: Adding rule_config_json column to financer table");
  try {
    const defaultConfig = JSON.stringify({
      takeout_method: "fixed",
      takeout_value: 500,
      repay_method: "multiplier",
      repay_value: 1.2,
      penalty_enabled: false,
      early_closure_allowed: true,
      default_payment_frequency: "daily"
    });
    db.exec("ALTER TABLE financer ADD COLUMN rule_config_json TEXT");
    db.prepare("UPDATE financer SET rule_config_json = ? WHERE rule_config_json IS NULL").run(defaultConfig);
  } catch (err) {
    console.error("Failed to add rule_config_json column:", err);
  }
}

// Migration: Ensure all columns exist in loans table
const loanColumns = db.prepare("PRAGMA table_info(loans)").all() as any[];
const loanColumnNames = loanColumns.map(c => c.name);

if (!loanColumnNames.includes('close_date')) {
  console.log("Migrating: Adding close_date column to loans table");
  try {
    db.exec("ALTER TABLE loans ADD COLUMN close_date DATETIME");
  } catch (err) {
    console.error("Failed to add close_date column:", err);
  }
}

// Migration: Ensure payment_date exists in payments table
const paymentColumns = db.prepare("PRAGMA table_info(payments)").all() as any[];
const paymentColumnNames = paymentColumns.map(c => c.name);
if (!paymentColumnNames.includes('payment_date')) {
  if (paymentColumnNames.includes('date')) {
    console.log("Migrating: Renaming date to payment_date in payments table");
    db.exec("ALTER TABLE payments RENAME COLUMN date TO payment_date");
  } else {
    console.log("Migrating: Adding payment_date to payments table");
    db.exec("ALTER TABLE payments ADD COLUMN payment_date DATETIME DEFAULT CURRENT_TIMESTAMP");
  }
}

// Migration: Ensure expense_date exists in expenses table
const expenseColumns = db.prepare("PRAGMA table_info(expenses)").all() as any[];
const expenseColumnNames = expenseColumns.map(c => c.name);
if (!expenseColumnNames.includes('expense_date')) {
  if (expenseColumnNames.includes('date')) {
    console.log("Migrating: Renaming date to expense_date in expenses table");
    db.exec("ALTER TABLE expenses RENAME COLUMN date TO expense_date");
  } else {
    console.log("Migrating: Adding expense_date to expenses table");
    db.exec("ALTER TABLE expenses ADD COLUMN expense_date DATETIME DEFAULT CURRENT_TIMESTAMP");
  }
}

// Seed default financer if none exists
const financerCount = db.prepare("SELECT count(*) as count FROM financer").get() as { count: number };
if (financerCount.count === 0) {
  const defaultConfig = JSON.stringify({
    takeout_method: "fixed", // or "percentage"
    takeout_value: 500,
    repay_method: "multiplier", // or "fixed"
    repay_value: 1.2,
    penalty_enabled: false,
    early_closure_allowed: true,
    default_payment_frequency: "daily"
  });
  db.prepare("INSERT INTO financer (name, username, password, rule_config_json) VALUES (?, ?, ?, ?)").run("Main Admin", "admin", "admin123", defaultConfig);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Settings
  app.get("/api/settings", (req: any, res) => {
    const user = db.prepare("SELECT rule_config_json FROM financer WHERE id = 1").get() as any;
    res.json(JSON.parse(user.rule_config_json));
  });

  app.post("/api/settings", (req: any, res) => {
    const config = JSON.stringify(req.body);
    db.prepare("UPDATE financer SET rule_config_json = ? WHERE id = 1").run(config);
    res.json({ success: true });
  });

  // Customers
  app.get("/api/customers", (req, res) => {
    const customers = db.prepare("SELECT * FROM customers ORDER BY name ASC").all();
    res.json(customers);
  });

  app.post("/api/customers", (req, res) => {
    const { name, place, phone, preferred_frequency, preferred_day } = req.body;
    const result = db.prepare("INSERT INTO customers (name, place, phone, preferred_frequency, preferred_day) VALUES (?, ?, ?, ?, ?)").run(name, place, phone, preferred_frequency || 'daily', preferred_day || 'all');
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/customers/:id", (req, res) => {
    const { id } = req.params;
    try {
      const transaction = db.transaction(() => {
        // Check if customer has active loans
        const activeLoans = db.prepare("SELECT count(*) as count FROM loans WHERE customer_id = ? AND status = 'active'").get(id) as { count: number };
        if (activeLoans.count > 0) {
          throw new Error("Cannot delete customer with active loans");
        }
        
        // Delete related data (closed loans, payments, etc. or just prevent if any data exists?)
        // For safety, let's just allow deletion if no active loans exist, but we should probably delete closed loans too if we want a full delete.
        // However, usually, you want to keep history. Let's just delete the customer if they have NO loans at all for now, or just delete everything.
        // User asked to "delete a particular customer".
        db.prepare("DELETE FROM payments WHERE loan_id IN (SELECT id FROM loans WHERE customer_id = ?)").run(id);
        db.prepare("DELETE FROM loans WHERE customer_id = ?").run(id);
        db.prepare("DELETE FROM customers WHERE id = ?").run(id);
      });
      transaction();
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Loans
  app.get("/api/loans", (req, res) => {
    const loans = db.prepare(`
      SELECT l.*, c.name as customer_name 
      FROM loans l 
      JOIN customers c ON l.customer_id = c.id 
      ORDER BY l.start_date DESC
    `).all();
    res.json(loans);
  });

  app.post("/api/loans", (req, res) => {
    const { customer_id, asked_amount, takeout_amount, total_repay, payment_type, start_date } = req.body;
    const given_amount = asked_amount - takeout_amount;
    const balance = total_repay;
    
    const result = db.prepare(`
      INSERT INTO loans (customer_id, asked_amount, takeout_amount, given_amount, total_repay, balance, payment_type, start_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(customer_id, asked_amount, takeout_amount, given_amount, total_repay, balance, payment_type, start_date || new Date().toISOString());
    
    res.json({ id: result.lastInsertRowid });
  });

  // Early Closure (Adaipu)
  app.post("/api/loans/:id/close", (req, res) => {
    const { id } = req.params;
    const { settlement_amount } = req.body;
    
    const transaction = db.transaction(() => {
      const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(id) as any;
      if (!loan) throw new Error("Loan not found");
      
      // Record final payment
      db.prepare("INSERT INTO payments (loan_id, amount) VALUES (?, ?)").run(id, settlement_amount);
      
      // Close loan
      db.prepare(`
        UPDATE loans 
        SET total_paid = total_paid + ?, 
            balance = 0,
            status = 'closed',
            close_date = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(settlement_amount, id);
    });
    
    transaction();
    res.json({ success: true });
  });

  // Payments
  app.get("/api/payments", (req, res) => {
    const { loan_id } = req.query;
    let query = `
      SELECT p.*, c.name as customer_name 
      FROM payments p 
      JOIN loans l ON p.loan_id = l.id 
      JOIN customers c ON l.customer_id = c.id
    `;
    let params: any[] = [];
    if (loan_id) {
      query += " WHERE p.loan_id = ?";
      params.push(loan_id);
    }
    query += " ORDER BY p.payment_date DESC";
    const payments = db.prepare(query).all(...params);
    res.json(payments);
  });

  app.post("/api/payments", (req, res) => {
    const { loan_id, amount, payment_date } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO payments (loan_id, amount, payment_date) VALUES (?, ?, ?)").run(loan_id, amount, payment_date || new Date().toISOString());
      
      const loan = db.prepare("SELECT balance FROM loans WHERE id = ?").get(loan_id) as any;
      const newBalance = loan.balance - amount;
      const status = newBalance <= 0 ? 'closed' : 'active';
      const closeDate = status === 'closed' ? new Date().toISOString() : null;

      db.prepare(`
        UPDATE loans 
        SET total_paid = total_paid + ?, 
            balance = ?,
            status = ?,
            close_date = ?
        WHERE id = ?
      `).run(amount, newBalance, status, closeDate, loan_id);
    });
    
    transaction();
    res.json({ success: true });
  });

  // Expenses
  app.get("/api/expenses", (req, res) => {
    const expenses = db.prepare("SELECT * FROM expenses ORDER BY expense_date DESC").all();
    res.json(expenses);
  });

  app.post("/api/expenses", (req, res) => {
    const { amount, description, expense_date } = req.body;
    const result = db.prepare("INSERT INTO expenses (amount, description, expense_date) VALUES (?, ?, ?)").run(amount, description, expense_date || new Date().toISOString());
    res.json({ id: result.lastInsertRowid });
  });

  // Dashboard
  app.get("/api/dashboard", (req, res) => {
    const { date, period } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];
    const targetPeriod = (period as string) || 'day';

    let dateFilter = "date(start_date) = date(?)";
    let paymentFilter = "date(payment_date) = date(?)";
    let expenseFilter = "date(expense_date) = date(?)";

    if (targetPeriod === 'week') {
      dateFilter = "strftime('%Y-%W', start_date) = strftime('%Y-%W', ?)";
      paymentFilter = "strftime('%Y-%W', payment_date) = strftime('%Y-%W', ?)";
      expenseFilter = "strftime('%Y-%W', expense_date) = strftime('%Y-%W', ?)";
    } else if (targetPeriod === 'month') {
      dateFilter = "strftime('%Y-%m', start_date) = strftime('%Y-%m', ?)";
      paymentFilter = "strftime('%Y-%m', payment_date) = strftime('%Y-%m', ?)";
      expenseFilter = "strftime('%Y-%m', expense_date) = strftime('%Y-%m', ?)";
    } else if (targetPeriod === 'year') {
      dateFilter = "strftime('%Y', start_date) = strftime('%Y', ?)";
      paymentFilter = "strftime('%Y', payment_date) = strftime('%Y', ?)";
      expenseFilter = "strftime('%Y', expense_date) = strftime('%Y', ?)";
    }

    const overall = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_loans,
        SUM(given_amount) as total_given,
        SUM(total_repay) as total_expected,
        SUM(total_paid) as total_collected,
        SUM(balance) as total_pending,
        (SUM(total_repay) - SUM(given_amount)) as total_profit_potential
      FROM loans
    `).get() as any;

    const periodCollections = db.prepare(`
      SELECT SUM(amount) as total FROM payments WHERE ${paymentFilter}
    `).get(targetDate) as any;

    const periodExpenses = db.prepare(`
      SELECT SUM(amount) as total FROM expenses WHERE ${expenseFilter}
    `).get(targetDate) as any;

    const loansByType = db.prepare(`
      SELECT payment_type, COUNT(*) as count, SUM(balance) as pending
      FROM loans
      WHERE status = 'active'
      GROUP BY payment_type
    `).all();

    res.json({
      overall,
      period: {
        collected: periodCollections.total || 0,
        expenses: periodExpenses.total || 0,
        net: (periodCollections.total || 0) - (periodExpenses.total || 0)
      },
      loansByType
    });
  });

  // Cashbook
  app.get("/api/cashbook", (req, res) => {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Opening Balance (Simplified: Total Collected - Total Given - Total Expenses before targetDate)
    const opening = db.prepare(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE date(payment_date) < ?) -
        (SELECT COALESCE(SUM(given_amount), 0) FROM loans WHERE date(start_date) < ?) -
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date(expense_date) < ?) as balance
    `).get(targetDate, targetDate, targetDate) as any;

    const collections = db.prepare(`
      SELECT p.*, c.name as customer_name 
      FROM payments p
      JOIN loans l ON p.loan_id = l.id
      JOIN customers c ON l.customer_id = c.id
      WHERE date(p.payment_date) = ?
    `).all(targetDate);

    const disbursements = db.prepare(`
      SELECT l.*, c.name as customer_name
      FROM loans l
      JOIN customers c ON l.customer_id = c.id
      WHERE date(l.start_date) = ?
    `).all(targetDate);

    const expenses = db.prepare(`
      SELECT * FROM expenses WHERE date(expense_date) = ?
    `).all(targetDate);

    res.json({
      opening_balance: opening.balance || 0,
      collections,
      disbursements,
      expenses
    });
  });

  // Get current user (Simplified)
  app.get("/api/me", (req, res) => {
    const user = db.prepare("SELECT id, name, username, rule_config_json FROM financer WHERE id = 1").get() as any;
    res.json({ id: user.id, name: user.name, username: user.username, config: JSON.parse(user.rule_config_json) });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
