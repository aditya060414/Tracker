import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Receipt,
  PieChart as PieIcon,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ArrowLeftRight,
} from "lucide-react";
import { PageHeader, Panel, SectionHeader, StatCard, ProgressBar, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn, generateId } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/money-management")({
  head: pageHead("Money Management", "Monthly budget, expenses, income and spending by category."),
  component: Money,
});

export type Tx = {
  id: string;
  name: string;
  cat: string;
  amount: number; // negative for expense, positive for income
  date: string;
  type?: "expense" | "income";
};

function Money() {
  const [txs, setTxs] = useLocal<Tx[]>("transactions", []);
  const [budget, setBudget] = useLocal("budget", 2000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget.toString());

  // Form states - user writes custom category directly
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");

  // Filtering & Editing states
  const [filterMode, setFilterMode] = useState<"all" | "expenses" | "income">("all");
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"expense" | "income">("expense");

  // Calculations
  const expenses = txs.filter((t) => (t.type ? t.type === "expense" : t.amount < 0));
  const spent = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);

  const incomeTxs = txs.filter((t) => (t.type ? t.type === "income" : t.amount > 0));
  const income = incomeTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

  const remaining = Math.max(0, budget - spent);
  const over = budget > 0 && spent > budget;
  const budgetUsedPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const netCashflow = income - spent;
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const byCat = Object.entries(
    expenses.reduce<Record<string, number>>(
      (a, t) => ({ ...a, [t.cat]: (a[t.cat] ?? 0) + Math.abs(t.amount) }),
      {},
    ),
  ).map(([name, value]) => ({ name, value }));

  const largest = expenses.reduce<Tx | null>(
    (m, t) => (!m || Math.abs(t.amount) > Math.abs(m.amount) ? t : m),
    null,
  );

  const handleTypeSelect = (type: "expense" | "income") => {
    setTxType(type);
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const rawVal = parseFloat(amount);
    if (!name.trim()) {
      toast.error("Please enter a transaction description.");
      return;
    }
    if (isNaN(rawVal) || rawVal <= 0) {
      toast.error("Please enter an amount greater than 0.");
      return;
    }

    // Expense amounts are stored negative so budget spent deducts correctly
    const finalAmount = txType === "expense" ? -Math.abs(rawVal) : Math.abs(rawVal);
    const finalCat = category.trim() || (txType === "expense" ? "Expense" : "Income");

    const newTx: Tx = {
      id: generateId(),
      name: name.trim(),
      cat: finalCat,
      amount: finalAmount,
      type: txType,
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };

    setTxs([newTx, ...txs]);
    setName("");
    setCategory("");
    setAmount("");
    toast.success(
      txType === "expense"
        ? `Added ₹${rawVal.toLocaleString("en-IN")} expense under "${finalCat}". Money spent has been deducted from your budget.`
        : `Added ₹${rawVal.toLocaleString("en-IN")} income under "${finalCat}".`,
    );
  };

  const removeTx = (id: string) => {
    const target = txs.find((t) => t.id === id);
    setTxs(txs.filter((t) => t.id !== id));
    if (target) {
      toast.info(`Removed "${target.name}".`);
    }
  };

  const startEditTx = (t: Tx) => {
    const isIncome = t.type ? t.type === "income" : t.amount > 0;
    setEditingTxId(t.id);
    setEditName(t.name);
    setEditCategory(t.cat);
    setEditAmount(Math.abs(t.amount).toString());
    setEditType(isIncome ? "income" : "expense");
  };

  const saveEditTx = (id: string) => {
    const rawVal = parseFloat(editAmount);
    if (!editName.trim()) {
      toast.error("Please enter a valid description.");
      return;
    }
    if (isNaN(rawVal) || rawVal <= 0) {
      toast.error("Please enter an amount greater than 0.");
      return;
    }

    const finalAmount = editType === "expense" ? -Math.abs(rawVal) : Math.abs(rawVal);
    const finalCat = editCategory.trim() || (editType === "expense" ? "Expense" : "Income");

    setTxs(
      txs.map((t) =>
        t.id === id
          ? {
              ...t,
              name: editName.trim(),
              cat: finalCat,
              amount: finalAmount,
              type: editType,
            }
          : t,
      ),
    );
    setEditingTxId(null);
    toast.success("Transaction updated successfully.");
  };

  const toggleTxType = (id: string) => {
    setTxs(
      txs.map((t) => {
        if (t.id !== id) return t;
        const currentlyIncome = t.type ? t.type === "income" : t.amount > 0;
        const nextType: "expense" | "income" = currentlyIncome ? "expense" : "income";
        const nextAmount = nextType === "expense" ? -Math.abs(t.amount) : Math.abs(t.amount);

        return {
          ...t,
          type: nextType,
          amount: nextAmount,
        };
      }),
    );
    toast.success("Converted transaction type.");
  };

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const b = parseFloat(budgetInput);
    if (!isNaN(b) && b >= 0) {
      setBudget(b);
      setIsEditingBudget(false);
      toast.success(`Monthly budget updated to ${fmt(b)}`);
    }
  };

  const filteredTxs = txs.filter((t) => {
    const isIncome = t.type ? t.type === "income" : t.amount > 0;
    if (filterMode === "expenses") return !isIncome;
    if (filterMode === "income") return isIncome;
    return true;
  });

  return (
    <>
      <PageHeader
        title="Money Management"
        description="See where your money goes, track custom categories, and ensure spending is deducted from your budget."
        actions={
          isEditingBudget ? (
            <form onSubmit={saveBudget} className="flex items-center gap-2">
              <input
                type="number"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                className="h-10 w-28 rounded-md border bg-background px-2 text-sm"
                placeholder="Budget (₹)"
              />
              <button type="submit" className="h-10 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsEditingBudget(false)}
                className="h-10 rounded-md border px-2.5 text-xs hover:bg-elevated"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setBudgetInput(budget.toString());
                setIsEditingBudget(true);
              }}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-elevated transition-colors"
            >
              <Edit2 className="size-3.5" /> Set budget
            </button>
          )
        }
      />

      {/* Top Key Metrics */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Monthly budget" value={fmt(budget)} hint="Configured spending limit" />
        <StatCard
          icon={ArrowDownRight}
          label="Total expenses"
          value={fmt(spent)}
          hint={`${expenses.length} expense record${expenses.length === 1 ? "" : "s"}`}
          tone={over ? "danger" : spent > 0 ? "warning" : "primary"}
        />
        <StatCard
          icon={PiggyBank}
          label={over ? "Over budget by" : "Remaining budget"}
          value={fmt(Math.abs(budget - spent))}
          hint={over ? "Exceeded your limit" : "Deducted after expenses"}
          tone={over ? "danger" : "success"}
        />
        <StatCard
          icon={ArrowUpRight}
          label="Total Income"
          value={fmt(income)}
          hint={`${incomeTxs.length} income stream${incomeTxs.length === 1 ? "" : "s"}`}
          tone="success"
        />
      </div>

      {/* Budget Used Bar */}
      <Panel className="mb-4">
        <div className="mb-2 flex justify-between text-[13px]">
          <span className="font-medium">Budget used (Money spent deducted)</span>
          <span className={cn("font-semibold tabular-nums", over ? "text-danger" : "text-muted-foreground")}>
            {budgetUsedPct}% {over ? "— over budget!" : `(${fmt(spent)} of ${fmt(budget)})`}
          </span>
        </div>
        <ProgressBar value={budgetUsedPct} tone={over ? "danger" : "success"} label="Budget used" />
        {largest && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Largest expense: <b className="text-foreground">{largest.name}</b> ({fmt(Math.abs(largest.amount))}) in{" "}
            <span className="rounded bg-elevated px-1.5 py-0.5 text-xs font-medium text-foreground">{largest.cat}</span>
          </p>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <SectionHeader title="Recent transactions" icon={Receipt} className="mb-0" />
            {/* Filter buttons */}
            <div className="flex rounded-lg bg-elevated p-0.5 border text-xs">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors font-medium",
                  filterMode === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                All ({txs.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("expenses")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors font-medium flex items-center gap-1",
                  filterMode === "expenses"
                    ? "bg-rose-500/15 text-rose-500 font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ArrowDownRight className="size-3" /> Expenses ({expenses.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("income")}
                className={cn(
                  "rounded-md px-2.5 py-1 transition-colors font-medium flex items-center gap-1",
                  filterMode === "income"
                    ? "bg-emerald-500/15 text-emerald-500 font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <ArrowUpRight className="size-3" /> Income ({incomeTxs.length})
              </button>
            </div>
          </div>

          {/* Add Transaction Form */}
          <div className="mb-4 rounded-xl border border-border/80 bg-background/50 p-3 shadow-xs">
            {/* Transaction Type Selector */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Select Transaction Type:</span>
              <div className="flex items-center gap-1.5 rounded-lg border bg-elevated p-1">
                <button
                  type="button"
                  onClick={() => handleTypeSelect("expense")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all",
                    txType === "expense"
                      ? "bg-danger text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ArrowDownRight className="size-3.5" />
                  <span>Expense (Money spent)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeSelect("income")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all",
                    txType === "income"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <ArrowUpRight className="size-3.5" />
                  <span>Income (Money added)</span>
                </button>
              </div>
            </div>

            <form onSubmit={add} className="flex flex-wrap items-center gap-2">
              <input
                id="tx-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  txType === "expense"
                    ? "Expense description (e.g. Groceries, Coffee, Rent)"
                    : "Income description (e.g. Monthly Salary, Freelance project)"
                }
                className="h-11 min-w-[180px] flex-1 rounded-[10px] border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
              <input
                id="tx-cat"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder={txType === "expense" ? "Category (e.g. Food, Rent, Gym)" : "Category (e.g. Salary, Client, Bonus)"}
                className="h-11 w-44 rounded-[10px] border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  ₹
                </span>
                <input
                  id="tx-amt"
                  type="number"
                  step="any"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  inputMode="decimal"
                  className="h-11 w-32 rounded-[10px] border bg-background pl-7 pr-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring tabular-nums"
                  required
                />
              </div>
              <button
                type="submit"
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-[10px] px-4 font-semibold text-sm transition-all shadow-xs text-white",
                  txType === "expense"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700",
                )}
              >
                <Plus className="size-4" />
                <span>{txType === "expense" ? "Add Expense" : "Add Income"}</span>
              </button>
            </form>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {txType === "expense"
                ? "💡 Expenses are immediately deducted from your monthly budget and reflected in spending analytics."
                : "💡 Income contributes positively to your net monthly cashflow and total earnings."}
            </p>
          </div>

          {/* Transactions List */}
          {filteredTxs.length === 0 ? (
            <EmptyState
              text={
                txs.length === 0
                  ? "No transactions recorded yet. Choose Expense or Income above to record your first transaction."
                  : filterMode === "expenses"
                    ? "No expense transactions recorded yet."
                    : "No income transactions recorded yet."
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {filteredTxs.map((t) => {
                const isIncome = t.type ? t.type === "income" : t.amount > 0;
                const isEditing = editingTxId === t.id;

                if (isEditing) {
                  return (
                    <li key={t.id} className="p-3 bg-elevated/60 rounded-lg my-1 border border-primary/30">
                      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                        <span>Edit Transaction</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setEditType("expense")}
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                              editType === "expense"
                                ? "bg-danger text-white"
                                : "bg-card border text-muted-foreground",
                            )}
                          >
                            Expense
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditType("income")}
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                              editType === "income"
                                ? "bg-emerald-600 text-white"
                                : "bg-card border text-muted-foreground",
                            )}
                          >
                            Income
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="h-9 flex-1 min-w-[140px] rounded-md border bg-background px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="Description"
                        />
                        <input
                          type="text"
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="h-9 w-32 rounded-md border bg-background px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="Category"
                        />
                        <div className="relative">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                            ₹
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="h-9 w-24 rounded-md border bg-background pl-5 pr-2 text-xs font-semibold outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            placeholder="Amount"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => saveEditTx(t.id)}
                          className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
                          title="Save changes"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTxId(null)}
                          className="grid size-9 place-items-center rounded-md border text-muted-foreground hover:bg-elevated transition-colors"
                          title="Cancel"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={t.id} className="group flex min-h-12 items-center gap-3 py-2 px-1 hover:bg-elevated/40 transition-colors">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-lg shrink-0",
                        isIncome ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500",
                      )}
                    >
                      {isIncome ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-sm text-foreground">{t.name}</p>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider",
                            isIncome ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400",
                          )}
                        >
                          {isIncome ? "Income" : "Expense"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.cat} · {t.date}
                      </p>
                    </div>

                    <span
                      className={cn(
                        "font-semibold tabular-nums text-sm",
                        isIncome ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {isIncome ? "+" : "−"}
                      {fmt(Math.abs(t.amount))}
                    </span>

                    {/* Actions: Convert Type, Edit, Delete */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => toggleTxType(t.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-elevated transition-colors"
                        title={isIncome ? "Convert to Expense (deducts from budget)" : "Convert to Income (adds to cashflow)"}
                      >
                        <ArrowLeftRight className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditTx(t)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-elevated transition-colors"
                        title="Edit transaction"
                      >
                        <Edit2 className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTx(t.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-elevated transition-colors"
                        title={`Delete ${t.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionHeader title="Spending by category" icon={PieIcon} />
            {byCat.length === 0 ? (
              <EmptyState text="No category spending yet. Add expense transactions to view the breakdown." />
            ) : (
              <>
                <div className="h-48">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={byCat} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3} stroke="none">
                        {byCat.map((_, i) => (
                          <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [fmt(Number(val) || 0), "Spent"]}
                        contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-1 text-[13px]">
                  {byCat.map((c, i) => (
                    <li key={c.name} className="flex items-center gap-2">
                      <span className="size-2.5 rounded-sm" style={{ background: `var(--chart-${(i % 5) + 1})` }} />
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-muted-foreground tabular-nums font-medium">{fmt(c.value)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel>
            <SectionHeader title="Current month summary" icon={Receipt} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">Transactions</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{txs.length}</dd>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">Expense count</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-rose-500">{expenses.length}</dd>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">Net cashflow (Income − Spent)</dt>
                <dd className={cn("mt-1 text-lg font-semibold tabular-nums", netCashflow >= 0 ? "text-emerald-500" : "text-rose-500")}>
                  {fmt(netCashflow)}
                </dd>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">Remaining budget</dt>
                <dd className={cn("mt-1 text-lg font-semibold tabular-nums", over ? "text-rose-500" : "text-foreground")}>
                  {fmt(remaining)}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
