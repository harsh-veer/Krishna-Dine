'use strict';
const { Upload } = require('../models');
const ApiError = require('../utils/ApiError');
const { looksLikeImage } = require('../middleware/upload');

exports.create = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload (field name "image")');
  if (!looksLikeImage(req.file.buffer)) throw ApiError.badRequest('The file is not a valid image');
  const doc = await Upload.create({
    filename: String(req.file.originalname || 'image').slice(0, 120),
    contentType: req.file.mimetype,
    size: req.file.size,
    data: req.file.buffer,
    uploadedBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { id: doc._id.toString(), url: `/api/uploads/${doc._id}` } });
};

exports.get = async (req, res) => {
  const doc = await Upload.findById(req.params.id);
  if (!doc) throw ApiError.notFound('Image not found');
  res.set('Content-Type', doc.contentType);
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('X-Content-Type-Options', 'nosniff');
  res.send(doc.data);
};
