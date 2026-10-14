import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Wallet, ArrowDownRight, ArrowUpRight, PiggyBank, Receipt, PieChart as PieIcon, Plus, Trash2, Edit2 } from "lucide-react";
import { PageHeader, Panel, SectionHeader, StatCard, ProgressBar, EmptyState } from "@/components/common/ui";
import { useLocal } from "@/lib/use-local";
import { pageHead } from "@/lib/meta";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/money-management")({
  head: pageHead("Money Management", "Monthly budget, expenses, income and spending by category."),
  component: Money,
});

export type Tx = { id: string; name: string; cat: string; amount: number; date: string };

const categories = ["Housing", "Food", "Health", "Transport", "Entertainment", "Utilities", "Income", "Other"];

function Money() {
  const [txs, setTxs] = useLocal<Tx[]>("transactions", []);
  const [budget, setBudget] = useLocal("budget", 2000);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget.toString());

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");

  const expenses = txs.filter((t) => t.amount < 0);
  const spent = Math.abs(expenses.reduce((s, t) => s + t.amount, 0));
  const income = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  const byCat = Object.entries(
    expenses.reduce<Record<string, number>>((a, t) => ({ ...a, [t.cat]: (a[t.cat] ?? 0) + Math.abs(t.amount) }), {}),
  ).map(([name, value]) => ({ name, value }));

  const largest = expenses.reduce<Tx | null>((m, t) => (!m || t.amount < m.amount ? t : m), null);
  const over = budget > 0 && spent > budget;
  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!name.trim() || isNaN(n)) return;
    const isIncome = n > 0 || category === "Income";
    const finalAmount = isIncome ? Math.abs(n) : -Math.abs(n);

    setTxs([
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        cat: isIncome ? "Income" : category,
        amount: finalAmount,
        date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      },
      ...txs,
    ]);
    setName("");
    setAmount("");
  };

  const removeTx = (id: string) => {
    setTxs(txs.filter((t) => t.id !== id));
  };

  const saveBudget = (e: React.FormEvent) => {
    e.preventDefault();
    const b = parseFloat(budgetInput);
    if (!isNaN(b) && b >= 0) {
      setBudget(b);
      setIsEditingBudget(false);
    }
  };

  const budgetUsedPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Money Management"
        description="See where your money goes, and keep it on track."
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
              className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-elevated"
            >
              <Edit2 className="size-3.5" /> Set budget
            </button>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Wallet} label="Monthly budget" value={fmt(budget)} />
        <StatCard icon={ArrowDownRight} label="Total expenses" value={fmt(spent)} tone={over ? "danger" : "warning"} />
        <StatCard
          icon={PiggyBank}
          label={over ? "Over budget" : "Remaining"}
          value={fmt(Math.abs(budget - spent))}
          tone={over ? "danger" : "success"}
        />
        <StatCard icon={ArrowUpRight} label="Income" value={fmt(income)} tone="success" />
      </div>

      <Panel className="mb-4">
        <div className="mb-2 flex justify-between text-[13px]">
          <span>Budget used</span>
          <span className={cn("font-medium", over ? "text-danger" : "text-muted-foreground")}>
            {budgetUsedPct}% {over ? "— over budget" : ""}
          </span>
        </div>
        <ProgressBar value={budgetUsedPct} tone={over ? "danger" : "success"} label="Budget used" />
        {largest && (
          <p className="mt-3 text-[13px] text-muted-foreground">
            Largest expense: <b className="text-foreground">{largest.name}</b> ({fmt(Math.abs(largest.amount))})
          </p>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel>
          <SectionHeader title="Recent transactions" icon={Receipt} />
          <form onSubmit={add} className="mb-3 flex flex-wrap gap-2">
            <input
              id="tx-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Description (e.g. Groceries)"
              className="h-11 min-w-0 flex-1 rounded-[10px] border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-11 rounded-[10px] border bg-background px-3 outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              id="tx-amt"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (₹)"
              inputMode="decimal"
              className="h-11 w-32 rounded-[10px] border bg-background px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
            <button className="flex h-11 items-center gap-1 rounded-[10px] bg-primary px-4 font-medium text-primary-foreground hover:bg-primary-hover">
              <Plus className="size-4" /> Add
            </button>
          </form>

          {txs.length === 0 ? (
            <EmptyState text="No transactions recorded yet. Add your first income or expense above." />
          ) : (
            <ul>
              {txs.map((t) => (
                <li key={t.id} className="group flex min-h-12 items-center gap-3 border-t px-1">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-lg",
                      t.amount > 0 ? "bg-success/15 text-success" : "bg-elevated text-muted-foreground",
                    )}
                  >
                    {t.amount > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.cat} · {t.date}</p>
                  </div>
                  <span className={cn("font-semibold tabular-nums", t.amount > 0 && "text-success")}>
                    {t.amount > 0 ? "+" : "−"}{fmt(Math.abs(t.amount))}
                  </span>
                  <button
                    onClick={() => removeTx(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-danger"
                    aria-label={`Delete ${t.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
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
                      {c.name} <span className="ml-auto text-muted-foreground tabular-nums">{fmt(c.value)}</span>
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
                <dd className="mt-1 text-lg font-semibold">{txs.length}</dd>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">Expense count</dt>
                <dd className="mt-1 text-lg font-semibold">{expenses.length}</dd>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">Net cashflow</dt>
                <dd className={cn("mt-1 text-lg font-semibold", income - spent >= 0 ? "text-success" : "text-danger")}>
                  {fmt(income - spent)}
                </dd>
              </div>
              <div className="rounded-lg bg-elevated p-3">
                <dt className="text-xs text-muted-foreground">Remaining budget</dt>
                <dd className="mt-1 text-lg font-semibold">{fmt(Math.max(0, budget - spent))}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
