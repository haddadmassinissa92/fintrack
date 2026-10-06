"use client";

import { useState } from "react";
import { Upload, X, AlertTriangle } from "lucide-react";
import { useTransactionStore } from "@/store/useTransactionStore";

type Categories = { expense: string[]; income: string[]; all: string[] };

type ParsedRow = {
  date: Date | null;
  description: string;
  amount: number | null;
  type: "revenu" | "dépense" | null;
};

// --- Petits utilitaires d'analyse CSV --------------------------------
// Les relevés bancaires varient beaucoup d'une banque à l'autre (virgule
// ou point-virgule, virgule ou point décimal, JJ/MM/AAAA ou AAAA-MM-JJ,
// montant signé ou colonnes Débit/Crédit séparées) : plutôt que deviner,
// on laisse l'utilisateur indiquer le format via le mappage de colonnes.

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  return semicolonCount > commaCount ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(raw: string, format: "DMY" | "YMD"): Date | null {
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const parts = cleaned.split(/[/\-.]/).map((p) => p.trim());
  if (parts.length !== 3) return null;
  let day: string, month: string, year: string;
  if (format === "DMY") [day, month, year] = parts;
  else [year, month, day] = parts;
  if (year.length === 2) year = `20${year}`;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  let cleaned = raw.trim().replace(/[^\d,.\-]/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    cleaned =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

export default function ImportTransactions({
  categories,
  onClose,
}: {
  categories: Categories;
  onClose: () => void;
}) {
  const importTransactions = useTransactionStore((s) => s.importTransactions);

  const [step, setStep] = useState<"upload" | "mapping" | "result">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [error, setError] = useState("");

  const [dateCol, setDateCol] = useState("");
  const [descCol, setDescCol] = useState("");
  const [amountMode, setAmountMode] = useState<"signed" | "split">("signed");
  const [amountCol, setAmountCol] = useState("");
  const [debitCol, setDebitCol] = useState("");
  const [creditCol, setCreditCol] = useState("");
  const [dateFormat, setDateFormat] = useState<"DMY" | "YMD">("DMY");
  const [expenseCategory, setExpenseCategory] = useState(categories.expense[0] || "");
  const [incomeCategory, setIncomeCategory] = useState(categories.income[0] || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const handleFile = async (file: File) => {
    setError("");
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setError("Ce fichier ne contient pas de données exploitables.");
      return;
    }
    const delimiter = detectDelimiter(lines[0]);
    const parsedHeaders = parseCsvLine(lines[0], delimiter);
    const parsedRows = lines.slice(1).map((l) => parseCsvLine(l, delimiter));

    setHeaders(parsedHeaders);
    setRows(parsedRows);
    setDateCol(parsedHeaders[0] || "");
    setDescCol(parsedHeaders[1] || "");
    setAmountCol(parsedHeaders[2] || "");
    setStep("mapping");
  };

  const colIndex = (name: string) => headers.indexOf(name);

  const buildParsedRows = (): ParsedRow[] => {
    const dIdx = colIndex(dateCol);
    const descIdx = colIndex(descCol);
    const amtIdx = colIndex(amountCol);
    const debitIdx = colIndex(debitCol);
    const creditIdx = colIndex(creditCol);

    return rows.map((r) => {
      const date = dIdx >= 0 ? parseDate(r[dIdx], dateFormat) : null;
      const description = descIdx >= 0 ? r[descIdx] : "";

      let amount: number | null = null;
      let type: "revenu" | "dépense" | null = null;

      if (amountMode === "signed") {
        const raw = amtIdx >= 0 ? parseAmount(r[amtIdx]) : null;
        if (raw !== null) {
          amount = Math.abs(raw);
          type = raw < 0 ? "dépense" : "revenu";
        }
      } else {
        const debit = debitIdx >= 0 ? parseAmount(r[debitIdx]) : null;
        const credit = creditIdx >= 0 ? parseAmount(r[creditIdx]) : null;
        if (debit && debit > 0) {
          amount = debit;
          type = "dépense";
        } else if (credit && credit > 0) {
          amount = credit;
          type = "revenu";
        }
      }

      return { date, description, amount, type };
    });
  };

  const parsedPreview = step === "mapping" ? buildParsedRows() : [];
  const validCount = parsedPreview.filter((r) => r.date && r.amount && r.type).length;
  const invalidCount = parsedPreview.length - validCount;

  const handleSubmit = async () => {
    if (!expenseCategory || !incomeCategory) {
      setError("Choisis une catégorie pour les dépenses et pour les revenus.");
      return;
    }

    const payload = parsedPreview
      .filter((r) => r.date && r.amount && r.type)
      .map((r) => ({
        type: r.type,
        amount: r.amount,
        category: r.type === "dépense" ? expenseCategory : incomeCategory,
        description: r.description,
        date: r.date!.toISOString(),
      }));

    if (payload.length === 0) {
      setError("Aucune ligne valide à importer avec ce mappage.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    const res = await importTransactions(payload);
    setIsSubmitting(false);

    if (res.success) {
      setResult({ imported: res.imported, skipped: res.skipped, errors: res.errors || [] });
      setStep("result");
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">Importer un relevé bancaire</h2>
          <button onClick={onClose} aria-label="Fermer" className="text-zinc-400 hover:text-zinc-700">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {error && (
          <p className="text-sm bg-red-50 dark:bg-red-950/40 text-red-600 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {step === "upload" && (
          <div>
            <p className="text-sm text-zinc-500 mb-4">
              Dépose un export CSV de ta banque. Tu pourras ensuite indiquer quelles colonnes
              correspondent à la date, au montant et à la description avant de valider.
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl py-10 cursor-pointer hover:border-accent-500 transition">
              <Upload size={24} className="text-zinc-400" strokeWidth={1.5} />
              <span className="text-sm text-zinc-500">Choisir un fichier .csv</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-zinc-500">Colonne Date</label>
                <select
                  value={dateCol}
                  onChange={(e) => setDateCol(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-zinc-500">Format de date</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as "DMY" | "YMD")}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
                >
                  <option value="DMY">JJ/MM/AAAA</option>
                  <option value="YMD">AAAA-MM-JJ</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs mb-1 text-zinc-500">Colonne Description</label>
              <select
                value={descCol}
                onChange={(e) => setDescCol(e.target.value)}
                className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
              >
                <option value="">Aucune</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs mb-1 text-zinc-500">Format du montant</label>
              <div className="flex gap-4 text-sm mb-2">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={amountMode === "signed"}
                    onChange={() => setAmountMode("signed")}
                  />
                  Une colonne signée
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={amountMode === "split"}
                    onChange={() => setAmountMode("split")}
                  />
                  Débit / Crédit séparés
                </label>
              </div>

              {amountMode === "signed" ? (
                <select
                  value={amountCol}
                  onChange={(e) => setAmountCol(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
                >
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={debitCol}
                    onChange={(e) => setDebitCol(e.target.value)}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
                  >
                    <option value="">Colonne Débit</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <select
                    value={creditCol}
                    onChange={(e) => setCreditCol(e.target.value)}
                    className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
                  >
                    <option value="">Colonne Crédit</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs mb-1 text-zinc-500">Catégorie des dépenses</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
                >
                  {categories.expense.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1 text-zinc-500">Catégorie des revenus</label>
                <select
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  className="w-full border border-zinc-300 dark:border-zinc-700 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900 text-sm"
                >
                  {categories.income.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">
                {validCount} ligne{validCount > 1 ? "s" : ""} prête
                {validCount > 1 ? "s" : ""} à importer
              </p>
              {invalidCount > 0 && (
                <p className="text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
                  <AlertTriangle size={13} strokeWidth={2} />
                  {invalidCount} ligne{invalidCount > 1 ? "s" : ""} ignorée
                  {invalidCount > 1 ? "s" : ""} (date ou montant illisible avec ce mappage)
                </p>
              )}
            </div>

            {parsedPreview.slice(0, 5).some((r) => r.date && r.amount) && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-400 text-left">
                      <th className="pr-3 pb-1">Date</th>
                      <th className="pr-3 pb-1">Description</th>
                      <th className="pb-1">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedPreview.slice(0, 5).map((r, i) => (
                      <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="pr-3 py-1">
                          {r.date ? r.date.toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="pr-3 py-1 truncate max-w-[140px]">{r.description || "—"}</td>
                        <td
                          className={`py-1 ${r.type === "dépense" ? "text-red-500" : "text-accent-600"}`}
                        >
                          {r.amount ? `${r.type === "dépense" ? "-" : "+"}${r.amount}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setStep("upload")}
                className="flex-1 border border-zinc-300 dark:border-zinc-700 rounded-lg py-2 text-sm font-medium"
              >
                Retour
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || validCount === 0}
                className="flex-1 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium"
              >
                {isSubmitting ? "Import en cours..." : `Importer ${validCount} transaction${validCount > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}

        {step === "result" && result && (
          <div>
            <p className="text-sm mb-2">
              <strong className="text-accent-600">{result.imported}</strong> transaction
              {result.imported > 1 ? "s" : ""} importée{result.imported > 1 ? "s" : ""} avec succès.
            </p>
            {result.skipped > 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-500 mb-3">
                {result.skipped} ligne{result.skipped > 1 ? "s" : ""} ignorée
                {result.skipped > 1 ? "s" : ""} côté serveur.
              </p>
            )}
            <button
              onClick={onClose}
              className="w-full bg-accent-600 hover:bg-accent-700 text-white rounded-lg py-2 text-sm font-medium mt-2"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
