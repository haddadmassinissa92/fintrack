// controllers/wallet.controller.js

const Wallet = require("../models/wallet.model");
const Transaction = require("../models/transaction.model");
const logger = require("../logger");

/**
 * Assure qu'un utilisateur possède au moins un compte par défaut ("Compte Courant").
 * Rétrocompatible : si l'utilisateur a des transactions historiques sans wallet,
 * elles seront associées à ce compte principal.
 */
async function ensureDefaultWallet(userId) {
  let defaultWallet = await Wallet.findOne({ user: userId, isDefault: true });
  if (!defaultWallet) {
    // Vérifier si un compte existe déjà
    const anyWallet = await Wallet.findOne({ user: userId });
    if (!anyWallet) {
      defaultWallet = await Wallet.create({
        user: userId,
        name: "Compte Courant",
        type: "courant",
        color: "#10b981",
        icon: "Wallet",
        isDefault: true,
        initialBalance: 0,
      });

      // Lier les transactions historiques orphelines au compte par défaut
      await Transaction.updateMany(
        { user: userId, wallet: null },
        { $set: { wallet: defaultWallet._id } }
      );
    } else {
      anyWallet.isDefault = true;
      await anyWallet.save();
      defaultWallet = anyWallet;
    }
  }
  return defaultWallet;
}

exports.getWallets = async (req, res) => {
  try {
    const userId = req.user._id;
    await ensureDefaultWallet(userId);

    const wallets = await Wallet.find({ user: userId }).sort({ isDefault: -1, createdAt: 1 }).lean();

    // Calcul des soldes pour chaque compte via agrégation
    const txStats = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $facet: {
          // Revenus par wallet
          income: [
            { $match: { type: "revenu", wallet: { $ne: null } } },
            { $group: { _id: "$wallet", total: { $sum: "$amount" } } },
          ],
          // Dépenses par wallet
          expense: [
            { $match: { type: "dépense", wallet: { $ne: null } } },
            { $group: { _id: "$wallet", total: { $sum: "$amount" } } },
          ],
          // Transferts sortants
          outgoingTransfers: [
            { $match: { type: "transfert", wallet: { $ne: null } } },
            { $group: { _id: "$wallet", total: { $sum: "$amount" } } },
          ],
          // Transferts entrants
          incomingTransfers: [
            { $match: { type: "transfert", toWallet: { $ne: null } } },
            { $group: { _id: "$toWallet", total: { $sum: "$amount" } } },
          ],
        },
      },
    ]);

    const toMap = (arr) => Object.fromEntries(arr.map((item) => [item._id.toString(), item.total]));
    const incomeMap = toMap(txStats[0].income);
    const expenseMap = toMap(txStats[0].expense);
    const outTransferMap = toMap(txStats[0].outgoingTransfers);
    const inTransferMap = toMap(txStats[0].incomingTransfers);

    const walletsWithBalances = wallets.map((w) => {
      const id = w._id.toString();
      const inc = incomeMap[id] || 0;
      const exp = expenseMap[id] || 0;
      const outT = outTransferMap[id] || 0;
      const inT = inTransferMap[id] || 0;

      const balance = (w.initialBalance || 0) + inc - exp - outT + inT;
      return {
        ...w,
        income: inc,
        expense: exp,
        balance: Math.round(balance * 100) / 100,
      };
    });

    res.status(200).json(walletsWithBalances);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des portefeuilles");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.createWallet = async (req, res) => {
  try {
    const { name, type, initialBalance, color, icon } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Le nom du portefeuille est requis." });
    }

    const existing = await Wallet.findOne({ user: req.user._id, name: name.trim() });
    if (existing) {
      return res.status(400).json({ message: "Un portefeuille avec ce nom existe déjà." });
    }

    const wallet = await Wallet.create({
      user: req.user._id,
      name: name.trim(),
      type: type || "courant",
      initialBalance: Number(initialBalance) || 0,
      color: color || "#10b981",
      icon: icon || "Wallet",
      isDefault: false,
    });

    res.status(201).json(wallet);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la création d'un portefeuille");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.updateWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const wallet = await Wallet.findOne({ _id: id, user: req.user._id });

    if (!wallet) {
      return res.status(404).json({ message: "Portefeuille introuvable." });
    }

    const { name, type, initialBalance, color, icon } = req.body;

    if (name && name.trim() !== wallet.name) {
      const duplicate = await Wallet.findOne({
        user: req.user._id,
        name: name.trim(),
        _id: { $ne: id },
      });
      if (duplicate) {
        return res.status(400).json({ message: "Un portefeuille avec ce nom existe déjà." });
      }
      wallet.name = name.trim();
    }

    if (type) wallet.type = type;
    if (initialBalance !== undefined) wallet.initialBalance = Number(initialBalance);
    if (color) wallet.color = color;
    if (icon) wallet.icon = icon;

    await wallet.save();
    res.status(200).json(wallet);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la mise à jour d'un portefeuille");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.deleteWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const wallet = await Wallet.findOne({ _id: id, user: req.user._id });

    if (!wallet) {
      return res.status(404).json({ message: "Portefeuille introuvable." });
    }

    if (wallet.isDefault) {
      return res.status(400).json({ message: "Impossible de supprimer le compte principal par défaut." });
    }

    // Réassigner les transactions vers le compte par défaut
    const defaultWallet = await ensureDefaultWallet(req.user._id);
    await Transaction.updateMany(
      { user: req.user._id, wallet: id },
      { $set: { wallet: defaultWallet._id } }
    );
    await Transaction.updateMany(
      { user: req.user._id, toWallet: id },
      { $set: { toWallet: defaultWallet._id } }
    );

    await wallet.deleteOne();
    res.status(200).json({ message: "Portefeuille supprimé et transactions réassignées." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'un portefeuille");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

/**
 * Effectue un virement interne entre deux portefeuilles de l'utilisateur
 */
exports.transferBetweenWallets = async (req, res) => {
  try {
    const { fromWalletId, toWalletId, amount, description, date } = req.body;

    if (!fromWalletId || !toWalletId) {
      return res.status(400).json({ message: "Veuillez sélectionner le compte source et destination." });
    }
    if (fromWalletId === toWalletId) {
      return res.status(400).json({ message: "Les comptes source et destination doivent être différents." });
    }

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: "Le montant du virement doit être positif." });
    }

    const [fromW, toW] = await Promise.all([
      Wallet.findOne({ _id: fromWalletId, user: req.user._id }),
      Wallet.findOne({ _id: toWalletId, user: req.user._id }),
    ]);

    if (!fromW || !toW) {
      return res.status(404).json({ message: "Un des portefeuilles sélectionnés est introuvable." });
    }

    const desc = description?.trim() || `Virement de ${fromW.name} vers ${toW.name}`;

    const tx = await Transaction.create({
      user: req.user._id,
      type: "transfert",
      amount: numAmount,
      category: "Virement interne",
      description: desc,
      wallet: fromW._id,
      toWallet: toW._id,
      date: date ? new Date(date) : new Date(),
    });

    res.status(201).json(tx);
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du virement interne");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
