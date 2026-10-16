const express = require('express');
const upload = require('../middleware/upload');
const { verifyToken, requireRoles } = require('../middleware/auth');
const {
  createDocument,
  getDocuments,
  getDocument,
  viewDocumentFile,
  updateDocument,
  deleteDocument
} = require('../controllers/documentController');

const router = express.Router();
router.use(verifyToken);

router.route('/')
  .get(getDocuments)
  .post(requireRoles('Admin'), upload.single('document'), createDocument);

router.get('/:id/file', viewDocumentFile);

router.route('/:id')
  .get(getDocument)
  .patch(requireRoles('Admin'), upload.single('document'), updateDocument)
  .delete(requireRoles('Admin'), deleteDocument);

module.exports = router;
