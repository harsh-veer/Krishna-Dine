'use strict';
const { MenuItem, Category } = require('../models');
const ApiError = require('../utils/ApiError');
const { emitMenuChanged } = require('../sockets/emitter');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function serializeItem(m) {
  const cat = m.category && m.category._id ? m.category : null;
  return {
    id: m._id.toString(),
    name: m.name,
    description: m.description,
    nameHi: m.nameHi || '',
    descriptionHi: m.descriptionHi || '',
    sizes: (m.sizes || []).map((s) => ({ label: s.label, price: s.price })),
    addons: (m.addons || []).map((a) => ({ name: a.name, price: a.price })),
    category: cat ? cat._id.toString() : String(m.category),
    categoryName: cat ? cat.name : undefined,
    price: m.price,
    image: m.image,
    isVegetarian: m.isVegetarian,
    isAvailable: m.isAvailable,
    preparationTime: m.preparationTime,
    updatedAt: m.updatedAt,
  };
}

function serializeCategory(c, itemCount) {
  return {
    id: c._id.toString(),
    name: c.name,
    nameHi: c.nameHi || '',
    slug: c.slug,
    description: c.description,
    image: c.image,
    displayOrder: c.displayOrder,
    isActive: c.isActive,
    ...(itemCount !== undefined ? { itemCount } : {}),
  };
}

/** With portion sizes, the base price is the cheapest size, so menus can show "from Rs X". */
function withFromPrice(body) {
  if (Array.isArray(body.sizes) && body.sizes.length) return { ...body, price: Math.min(...body.sizes.map((s) => s.price)) };
  return body;
}

const slugify = (s) =>
  s.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `category-${Date.now()}`;

/**
 * Public menu. Customers get active categories only; unavailable items are returned with
 * isAvailable=false so they can be shown as "sold out". Staff can pass ?all=true for everything.
 */
exports.listMenu = async (req, res) => {
  const staffView = Boolean(req.query.all && req.user);
  const catFilter = staffView ? {} : { isActive: true };
  const categories = await Category.find(catFilter).sort({ displayOrder: 1, name: 1 });
  const itemFilter = { isDeleted: false, category: { $in: categories.map((c) => c._id) } };
  if (req.query.category) itemFilter.category = req.query.category;
  if (req.query.vegOnly) itemFilter.isVegetarian = true;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    itemFilter.$or = [{ name: rx }, { description: rx }];
  }
  const items = await MenuItem.find(itemFilter).populate('category', 'name').sort({ name: 1 });
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { categories: categories.map((c) => serializeCategory(c)), items: items.map(serializeItem) } });
};

exports.createItem = async (req, res) => {
  const cat = await Category.findById(req.body.category);
  if (!cat) throw ApiError.badRequest('Category not found');
  const item = await MenuItem.create(withFromPrice(req.body));
  await item.populate('category', 'name');
  emitMenuChanged();
  res.status(201).json({ success: true, data: serializeItem(item) });
};

exports.updateItem = async (req, res) => {
  const item = await MenuItem.findOne({ _id: req.params.id, isDeleted: false });
  if (!item) throw ApiError.notFound('Menu item not found');
  if (req.body.category) {
    const cat = await Category.findById(req.body.category);
    if (!cat) throw ApiError.badRequest('Category not found');
  }
  Object.assign(item, withFromPrice(req.body));
  await item.save();
  await item.populate('category', 'name');
  emitMenuChanged();
  res.json({ success: true, data: serializeItem(item) });
};

exports.setAvailability = async (req, res) => {
  const item = await MenuItem.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { $set: { isAvailable: req.body.isAvailable } }, { new: true }).populate('category', 'name');
  if (!item) throw ApiError.notFound('Menu item not found');
  emitMenuChanged();
  res.json({ success: true, data: serializeItem(item) });
};

// Soft delete: past orders keep their snapshot, and the item disappears from the menu.
exports.deleteItem = async (req, res) => {
  const item = await MenuItem.findOneAndUpdate({ _id: req.params.id, isDeleted: false }, { $set: { isDeleted: true, isAvailable: false } }, { new: true });
  if (!item) throw ApiError.notFound('Menu item not found');
  emitMenuChanged();
  res.json({ success: true, data: { id: item._id.toString() } });
};

exports.listCategories = async (req, res) => {
  const staffView = Boolean(req.query.all && req.user);
  const categories = await Category.find(staffView ? {} : { isActive: true }).sort({ displayOrder: 1, name: 1 });
  const counts = await MenuItem.aggregate([{ $match: { isDeleted: false } }, { $group: { _id: '$category', n: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json({ success: true, data: categories.map((c) => serializeCategory(c, map.get(String(c._id)) || 0)) });
};

exports.createCategory = async (req, res) => {
  const cat = await Category.create({ ...req.body, slug: slugify(req.body.name) });
  emitMenuChanged();
  res.status(201).json({ success: true, data: serializeCategory(cat, 0) });
};

exports.updateCategory = async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw ApiError.notFound('Category not found');
  Object.assign(cat, req.body);
  if (req.body.name) cat.slug = slugify(req.body.name);
  await cat.save();
  emitMenuChanged();
  res.json({ success: true, data: serializeCategory(cat) });
};

exports.deleteCategory = async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw ApiError.notFound('Category not found');
  const n = await MenuItem.countDocuments({ category: cat._id, isDeleted: false });
  if (n) throw ApiError.conflict(`Move or delete the ${n} item(s) in this category first, or hide the category instead`);
  await cat.deleteOne();
  emitMenuChanged();
  res.json({ success: true, data: { id: cat._id.toString() } });
};

exports.serializeItem = serializeItem;
