// categoryStyleBackfill.js
//
// Les catégories créées avant l'ajout des icônes/couleurs n'ont pas ces
// champs en base. Au démarrage du serveur, on leur applique le style par
// défaut de leur nom (Alimentation → Utensils orange, etc.) — seulement
// si elles n'ont encore aucune icône : une catégorie déjà personnalisée
// par l'utilisateur n'est jamais écrasée, et une fois toutes rattrapées,
// ces requêtes ne trouvent plus rien à modifier (idempotent, bon marché).
//
// Les catégories personnalisées (noms que l'utilisateur a inventés) ne
// figurent pas dans DEFAULT_CATEGORY_STYLES : elles gardent simplement le
// style neutre par défaut du modèle (voir category.model.js).

const Category = require("./models/category.model");
const { DEFAULT_CATEGORY_STYLES } = require("./constants/categories");
const logger = require("./logger");

async function backfillCategoryStyles() {
  try {
    for (const [name, style] of Object.entries(DEFAULT_CATEGORY_STYLES)) {
      await Category.updateMany(
        { name, icon: { $exists: false } },
        { $set: { icon: style.icon, color: style.color } },
      );
    }
  } catch (error) {
    logger.error({ err: error }, "Erreur lors du rattrapage des styles de catégories");
  }
}

module.exports = { backfillCategoryStyles };
