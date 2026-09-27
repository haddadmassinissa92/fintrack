// controllers/transaction.controller.js

const Transaction = require("../models/transaction.model");
const Category = require("../models/category.model");
const logger = require("../logger");

// Vérifie qu'une catégorie donnée existe bien parmi les catégories de cet
// utilisateur, pour ce type précis (revenu/dépense) — les catégories
// vivent maintenant entièrement en base (voir category.controller.js),
// il n'y a donc plus de liste figée à vérifier ici
const isValidCategory = async (userId, type, categoryName) => {
  const category = await Category.findOne({ user: userId, type, name: categoryName });
  return !!category;
};

exports.createTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, date } = req.body;

    if (!type || !amount || !category) {
      return res.status(400).json({ message: "Type, montant et catégorie sont requis." });
    }
    if (amount <= 0) {
      return res.status(400).json({ message: "Le montant doit être positif." });
    }

    // Une catégorie de revenu ne peut pas être utilisée sur une dépense,
    // et inversement — évite des statistiques faussées plus tard
    if (!(await isValidCategory(req.user._id, type, category))) {
      return res.status(400).json({ message: "Catégorie invalide pour ce type de transaction." });
    }

    const transaction = await Transaction.create({
      user: req.user._id,
      type,
      amount,
      category,
      description: description?.trim() || "",
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json(transaction);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la création d'une transaction");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Liste les transactions de l'utilisateur, plus récentes en premier.
// Filtres optionnels par mois précis (?month=9&year=2026) et par type.
exports.getTransactions = async (req, res) => {
  try {
    const { month, year, type, category, search } = req.query;
    const filter = { user: req.user._id };

    if (type) filter.type = type;
    if (category) filter.category = category;

    // Recherche texte simple, insensible à la casse, sur la description
    // (ex. "courses" retrouve "Courses de la semaine")
    if (search && search.trim()) {
      filter.description = { $regex: search.trim(), $options: "i" };
    }

    if (month && year) {
      const start = new Date(Number(year), Number(month) - 1, 1);
      const end = new Date(Number(year), Number(month), 1);
      filter.date = { $gte: start, $lt: end };
    }

    const transactions = await Transaction.find(filter).sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des transactions");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction introuvable." });
    }
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    const { type, amount, category, description, date } = req.body;

    if (type) transaction.type = type;
    if (amount !== undefined) {
      if (amount <= 0) {
        return res.status(400).json({ message: "Le montant doit être positif." });
      }
      transaction.amount = amount;
    }
    if (category) {
      if (!(await isValidCategory(req.user._id, transaction.type, category))) {
        return res.status(400).json({ message: "Catégorie invalide pour ce type de transaction." });
      }
      transaction.category = category;
    }
    if (description !== undefined) transaction.description = description.trim();
    if (date) transaction.date = new Date(date);

    await transaction.save();
    res.status(200).json(transaction);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la modification d'une transaction");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await Transaction.findById(id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction introuvable." });
    }
    if (transaction.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    await transaction.deleteOne();
    res.status(200).json({ message: "Transaction supprimée." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'une transaction");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Calcule les statistiques du tableau de bord : total revenus/dépenses/
// solde sur le mois en cours, répartition des dépenses par catégorie
// (pour le graphique en secteurs), et tendance des 6 derniers mois (pour
// le graphique en barres revenus vs dépenses)
exports.getStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [totalsAgg, prevTotalsAgg, byCategoryAgg, monthlyTrendAgg, startingBalanceAgg] = await Promise.all([
      // Totaux du mois en cours
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startOfMonth, $lt: startOfNextMonth } } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),

      // Totaux du mois précédent, pour la comparaison ("+12% par rapport
      // au mois dernier")
      Transaction.aggregate([
        { $match: { user: userId, date: { $gte: startOfPrevMonth, $lt: startOfMonth } } },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),

      // Répartition des dépenses du mois en cours par catégorie
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            type: "dépense",
            date: { $gte: startOfMonth, $lt: startOfNextMonth },
          },
        },
        { $group: { _id: "$category", total: { $sum: "$amount" } } },
        { $sort: { total: -1 } },
      ]),

      // Tendance des 6 derniers mois (revenus vs dépenses), pour situer le
      // mois en cours dans une évolution plutôt qu'un chiffre isolé
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$date" }, month: { $month: "$date" }, type: "$type" },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // Solde accumulé AVANT le début de la fenêtre des 6 derniers mois —
      // point de départ nécessaire pour que la courbe de solde reflète le
      // vrai solde total, pas juste l'évolution des 6 derniers mois isolée
      Transaction.aggregate([
        {
          $match: {
            user: userId,
            date: { $lt: new Date(now.getFullYear(), now.getMonth() - 5, 1) },
          },
        },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalIncome = totalsAgg.find((t) => t._id === "revenu")?.total || 0;
    const totalExpense = totalsAgg.find((t) => t._id === "dépense")?.total || 0;
    const prevIncome = prevTotalsAgg.find((t) => t._id === "revenu")?.total || 0;
    const prevExpense = prevTotalsAgg.find((t) => t._id === "dépense")?.total || 0;
    const balance = totalIncome - totalExpense;
    const prevBalance = prevIncome - prevExpense;

    // Variation en pourcentage par rapport au mois précédent. Renvoie
    // "null" quand la comparaison n'a pas de sens (rien le mois dernier),
    // pour que le frontend sache qu'il ne faut rien afficher plutôt que
    // d'afficher un chiffre absurde comme "+∞%"
    const percentChange = (current, previous) => {
      if (previous === 0) return current === 0 ? 0 : null;
      return ((current - previous) / previous) * 100;
    };

    // Reconstitue les 6 derniers mois sous une forme directement exploitable
    // par le graphique, même pour les mois sans aucune transaction (total à 0)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const income = monthlyTrendAgg.find(
        (m) => m._id.year === year && m._id.month === month && m._id.type === "revenu",
      )?.total || 0;
      const expense = monthlyTrendAgg.find(
        (m) => m._id.year === year && m._id.month === month && m._id.type === "dépense",
      )?.total || 0;
      monthlyTrend.push({
        label: d.toLocaleDateString("fr-FR", { month: "short" }),
        income,
        expense,
      });
    }

    // Solde cumulé mois par mois, pour la courbe d'évolution : part du
    // solde déjà accumulé avant la fenêtre de 6 mois, puis ajoute le
    // résultat net (revenus - dépenses) de chaque mois les uns après les
    // autres — montre la vraie trajectoire du solde total, pas juste les
    // mouvements isolés d'un mois donné
    const startingIncome = startingBalanceAgg.find((t) => t._id === "revenu")?.total || 0;
    const startingExpense = startingBalanceAgg.find((t) => t._id === "dépense")?.total || 0;
    let runningBalance = startingIncome - startingExpense;
    const balanceTrend = monthlyTrend.map((m) => {
      runningBalance += m.income - m.expense;
      return { label: m.label, balance: runningBalance };
    });

    res.status(200).json({
      totalIncome,
      totalExpense,
      balance,
      incomeChange: percentChange(totalIncome, prevIncome),
      expenseChange: percentChange(totalExpense, prevExpense),
      balanceChange: percentChange(balance, prevBalance),
      byCategory: byCategoryAgg.map((c) => ({ category: c._id, total: c.total })),
      monthlyTrend,
      balanceTrend,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du calcul des statistiques");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Exporte toutes les transactions de l'utilisateur en CSV ou en PDF
// (?format=csv ou ?format=pdf), triées de la plus ancienne à la plus
// récente — plus naturel à lire dans un tableur ou un document qu'un tri
// décroissant.
exports.exportTransactions = async (req, res) => {
  try {
    const { format } = req.query;
    if (!["csv", "pdf"].includes(format)) {
      return res.status(400).json({ message: "Format d'export invalide (csv ou pdf)." });
    }

    const transactions = await Transaction.find({ user: req.user._id }).sort({ date: 1 });
    const currency = req.user.currency || "DZD";

    if (format === "csv") {
      return exportAsCsv(res, transactions, currency);
    }
    return exportAsPdf(res, transactions, currency, req.user.username);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de l'export des transactions");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Échappe les guillemets et entoure de guillemets tout champ contenant une
// virgule, un guillemet ou un retour à la ligne — évite qu'une description
// du style "Courses, boulangerie" ne casse la structure du fichier CSV
const escapeCsvField = (value) => {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

function exportAsCsv(res, transactions, currency) {
  const header = ["Date", "Type", "Catégorie", "Description", `Montant (${currency})`];
  const rows = transactions.map((t) => [
    new Date(t.date).toLocaleDateString("fr-FR"),
    t.type,
    t.category,
    t.description || "",
    t.amount,
  ]);

  const csvContent = [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");

  // Le "\uFEFF" (BOM UTF-8) en préfixe garantit que les accents s'affichent
  // correctement une fois le fichier ouvert dans Excel, qui sinon suppose
  // par défaut un encodage différent
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=fintrack-transactions.csv");
  res.send("\uFEFF" + csvContent);
}

function exportAsPdf(res, transactions, currency, username) {
  const PDFDocument = require("pdfkit");
  const doc = new PDFDocument({ margin: 40, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=fintrack-transactions.pdf");
  doc.pipe(res);

  doc.fontSize(20).fillColor("#059669").text("FinTrack", { continued: false });
  doc.fontSize(11).fillColor("#666").text(`Relevé de transactions — ${username}`);
  doc.moveDown(1.5);

  const totalIncome = transactions
    .filter((t) => t.type === "revenu")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "dépense")
    .reduce((sum, t) => sum + t.amount, 0);

  doc.fontSize(10).fillColor("#111");
  doc.text(`Total revenus : ${totalIncome.toLocaleString("fr-FR")} ${currency}`);
  doc.text(`Total dépenses : ${totalExpense.toLocaleString("fr-FR")} ${currency}`);
  doc.text(`Solde : ${(totalIncome - totalExpense).toLocaleString("fr-FR")} ${currency}`);
  doc.moveDown(1);

  // En-tête du tableau
  const startX = 40;
  let y = doc.y;
  const colWidths = [70, 60, 100, 180, 90];
  const headers = ["Date", "Type", "Catégorie", "Description", "Montant"];

  doc.fontSize(9).fillColor("#fff");
  doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 20).fill("#059669");
  let x = startX;
  headers.forEach((h, i) => {
    doc.fillColor("#fff").text(h, x + 4, y + 6, { width: colWidths[i] - 8 });
    x += colWidths[i];
  });
  y += 20;

  // Lignes du tableau, avec une nouvelle page automatique si besoin
  transactions.forEach((t, index) => {
    if (y > 760) {
      doc.addPage();
      y = 40;
    }
    if (index % 2 === 0) {
      doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 18).fill("#f3f4f6");
    }
    x = startX;
    const cells = [
      new Date(t.date).toLocaleDateString("fr-FR"),
      t.type,
      t.category,
      t.description || "-",
      `${t.type === "revenu" ? "+" : "-"}${t.amount.toLocaleString("fr-FR")} ${currency}`,
    ];
    cells.forEach((cell, i) => {
      doc
        .fillColor(t.type === "revenu" && i === 4 ? "#059669" : i === 4 ? "#dc2626" : "#111")
        .fontSize(8)
        .text(String(cell), x + 4, y + 5, { width: colWidths[i] - 8 });
      x += colWidths[i];
    });
    y += 18;
  });

  doc.end();
}

