// controllers/category.controller.js
//
// Gère les catégories de l'utilisateur, qui vivent maintenant entièrement
// en base de données (copiées depuis une liste de départ à l'inscription,
// voir auth.controller.js) — donc librement modifiables, contrairement à
// une ancienne liste figée dans le code.

const Category = require("../models/category.model");
const logger = require("../logger");

// Renvoie les catégories de l'utilisateur, séparées par type — pour
// remplir les menus déroulants du formulaire d'ajout de transaction
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ user: req.user._id }).sort({ name: 1 });
    res.status(200).json({
      expense: categories.filter((c) => c.type === "dépense").map((c) => c.name),
      income: categories.filter((c) => c.type === "revenu").map((c) => c.name),
      // La liste complète (avec les _id), utile pour l'écran de gestion
      // des catégories (renommer/supprimer), contrairement aux deux
      // tableaux ci-dessus qui ne donnent que les noms
      all: categories,
    });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la récupération des catégories");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, type, budgetType } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Le nom de la catégorie est requis." });
    }
    if (!["revenu", "dépense"].includes(type)) {
      return res.status(400).json({ message: "Type invalide." });
    }
    if (budgetType && !["besoin", "envie", "épargne"].includes(budgetType)) {
      return res.status(400).json({ message: "Classification invalide." });
    }

    const category = await Category.create({
      user: req.user._id,
      name: name.trim(),
      type,
      budgetType: type === "dépense" ? budgetType || null : null,
    });

    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Cette catégorie existe déjà." });
    }
    logger.error({ err: error }, "Erreur lors de la création d'une catégorie");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

// Renomme une catégorie, et/ou change sa classification besoin/envie/épargne
// pour le plan budgétaire 50/30/20. Ne change rien aux transactions déjà
// créées avec l'ancien nom (elles gardent le texte tel quel, comme un
// instantané figé au moment de leur création) — seules les nouvelles
// transactions verront le nouveau nom proposé dans le formulaire.
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, budgetType } = req.body;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }
    if (category.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "Le nom de la catégorie est requis." });
      }
      category.name = name.trim();
    }
    if (budgetType !== undefined) {
      if (budgetType !== null && !["besoin", "envie", "épargne"].includes(budgetType)) {
        return res.status(400).json({ message: "Classification invalide." });
      }
      category.budgetType = budgetType;
    }

    await category.save();

    res.status(200).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Cette catégorie existe déjà." });
    }
    logger.error({ err: error }, "Erreur lors de la modification d'une catégorie");
    res.status(500).json({ message: "Erreur serveur." });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Catégorie introuvable." });
    }
    if (category.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Action non autorisée." });
    }

    // Les transactions déjà créées avec cette catégorie ne sont pas
    // touchées : elles gardent simplement le nom en texte, même si la
    // catégorie n'est plus proposée pour de nouvelles transactions
    await category.deleteOne();

    res.status(200).json({ message: "Catégorie supprimée." });
  } catch (error) {
    logger.error({ err: error }, "Erreur lors de la suppression d'une catégorie");
    res.status(500).json({ message: "Erreur serveur." });
  }
};
