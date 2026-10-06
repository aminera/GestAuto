import { Router } from 'express';
import { canWrite } from '../middleware/auth.js';
import { HttpError } from '../middleware/error.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Fabrique de routes CRUD REST réutilisable.
 *
 *   GET    /        liste paginée  (?page, ?limit, ?search, ?sort, + filtres)
 *   GET    /:id     détail
 *   POST   /        création       (admin, manager)
 *   PATCH  /:id     mise à jour    (admin, manager)
 *   DELETE /:id     suppression    (admin, manager)
 *
 * @param {import('mongoose').Model} Model
 * @param {object}   opts
 * @param {import('zod').ZodObject} opts.schema   validation des corps de requête
 * @param {string[]} [opts.searchFields]          champs pour ?search=
 * @param {string[]} [opts.filterFields]          champs filtrables en query (?status=active)
 * @param {string|object|Array} [opts.populate]
 * @param {string}   [opts.defaultSort]
 * @param {(doc, req, previous)=>Promise} [opts.afterSave]
 * @param {(doc, req)=>Promise} [opts.afterDelete]
 * @param {(router)=>void} [opts.extend]          routes spécifiques (déclarées avant /:id)
 */
export function crudRouter(Model, opts) {
  const { schema, searchFields = [], filterFields = [], populate, defaultSort = '-createdAt', afterSave, afterDelete, extend } = opts;
  const router = Router();

  if (extend) extend(router);

  router.get('/', async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 25));
    const filter = {};
    for (const f of filterFields) {
      if (req.query[f] !== undefined && req.query[f] !== '') filter[f] = req.query[f];
    }
    if (req.query.search && searchFields.length) {
      const rx = new RegExp(escapeRegex(String(req.query.search)), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    let q = Model.find(filter).sort(req.query.sort || defaultSort).skip((page - 1) * limit).limit(limit);
    if (populate) q = q.populate(populate);
    const [items, total] = await Promise.all([q.lean(), Model.countDocuments(filter)]);
    res.json({ items, total, page, limit });
  });

  router.get('/:id', async (req, res) => {
    let q = Model.findById(req.params.id);
    if (populate) q = q.populate(populate);
    const doc = await q;
    if (!doc) throw new HttpError(404, 'Introuvable');
    res.json(doc);
  });

  router.post('/', canWrite, async (req, res) => {
    const data = schema.parse(req.body);
    const doc = await Model.create(data);
    if (afterSave) await afterSave(doc, req, null);
    res.status(201).json(populate ? await doc.populate(populate) : doc);
  });

  router.patch('/:id', canWrite, async (req, res) => {
    const data = schema.partial().parse(req.body);
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new HttpError(404, 'Introuvable');
    const previous = doc.toObject();
    doc.set(data);
    await doc.save();
    if (afterSave) await afterSave(doc, req, previous);
    res.json(populate ? await doc.populate(populate) : doc);
  });

  router.delete('/:id', canWrite, async (req, res) => {
    const doc = await Model.findByIdAndDelete(req.params.id);
    if (!doc) throw new HttpError(404, 'Introuvable');
    if (afterDelete) await afterDelete(doc, req);
    res.status(204).end();
  });

  return router;
}
