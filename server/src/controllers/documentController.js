const ErrorResponse = require('../utils/errorResponse');
const Document = require('../models/Document');

exports.createDocument = async (req, res, next) => {
  try {
    const { title, category, description, documentType, version, visibility } = req.body;
    let url = req.file ? req.file.path : undefined;

    if (!url) return next(new ErrorResponse('File is required', 400));

    const inferredType = documentType || (
      req.file.mimetype === 'application/pdf' ? 'PDF' :
      req.file.mimetype.startsWith('image/') ? 'Image' : 'Document'
    );

    const doc = await Document.create({
      societyId: req.user.societyId,
      title,
      category,
      description,
      documentType: inferredType,
      version: version || '1.0',
      visibility: visibility || 'AdminOnly',
      url,
      uploadedBy: req.user.id
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.viewDocumentFile = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || (doc.societyId && doc.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Document not found', 404));
    }

    if (req.user.role === 'Resident' && doc.visibility !== 'ResidentVisible') {
      return next(new ErrorResponse('Document not found', 404));
    }

    if (req.user.role === 'SecurityStaff') {
      return next(new ErrorResponse('Not authorized', 403));
    }

    if (!doc.url) {
      return next(new ErrorResponse('Document file URL not found', 404));
    }

    // Direct image formats can be viewed directly
    const isImage = /\.(jpg|jpeg|png|webp)$/i.test(doc.url);
    if (isImage) {
      return res.redirect(doc.url);
    }

    // For PDFs and raw Cloudinary files, fetch and stream with proper PDF headers
    const response = await fetch(doc.url);
    if (!response.ok) {
      // Cloudinary default account ACL fallback for older image/upload PDF files
      if (response.status === 401 && doc.url.includes('/image/upload/') && doc.url.endsWith('.pdf')) {
        const previewUrl = doc.url.replace(/\.pdf$/i, '.jpg');
        const previewRes = await fetch(previewUrl);
        if (previewRes.ok) {
          res.setHeader('Content-Type', 'image/jpeg');
          res.setHeader('Content-Disposition', 'inline');
          const buffer = Buffer.from(await previewRes.arrayBuffer());
          return res.send(buffer);
        }
      }
      return next(new ErrorResponse('Failed to fetch document file from storage', 502));
    }

    const safeTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9_-]/g, '_');
    const isPdf = doc.url.toLowerCase().includes('.pdf') || doc.documentType === 'PDF' || (doc.category && doc.category.toLowerCase().includes('pdf')) || response.headers.get('content-type') === 'application/pdf';
    const contentType = isPdf ? 'application/pdf' : (response.headers.get('content-type') || 'application/pdf');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${safeTitle}.${isPdf ? 'pdf' : 'bin'}"`);
    
    const arrayBuffer = await response.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    next(err);
  }
};

exports.getDocuments = async (req, res, next) => {
  try {
    let query = { societyId: req.user.societyId, status: 'Active' };
    
    // Residents only see ResidentVisible docs in their society
    if (req.user.role === 'Resident') {
      query.visibility = 'ResidentVisible';
    } else if (req.user.role === 'SecurityStaff') {
      // Staff cannot see documents unless authorized
      return res.status(200).json({ success: true, data: [] });
    }

    const docs = await Document.find(query);
    res.status(200).json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
};

exports.getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || (doc.societyId && doc.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Document not found', 404));
    }

    if (req.user.role === 'Resident' && doc.visibility !== 'ResidentVisible') {
      return next(new ErrorResponse('Document not found', 404));
    }

    if (req.user.role === 'SecurityStaff') {
      return next(new ErrorResponse('Not authorized', 403));
    }

    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.updateDocument = async (req, res, next) => {
  try {
    let doc = await Document.findById(req.params.id);
    if (!doc || (doc.societyId && doc.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Document not found', 404));
    }

    if (req.file) req.body.url = req.file.path;
    const updateData = { ...req.body };
    delete updateData.societyId;

    doc = await Document.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

exports.deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc || (doc.societyId && doc.societyId.toString() !== req.user.societyId.toString())) {
      return next(new ErrorResponse('Document not found', 404));
    }

    doc.status = 'Archived'; // Soft delete
    await doc.save();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    next(err);
  }
};
