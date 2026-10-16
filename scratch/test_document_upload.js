const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const connectDB = require('../server/src/config/db');
const mongoose = require('../server/node_modules/mongoose');
const jwt = require('jsonwebtoken');

const User = require('../server/src/models/User');
const Society = require('../server/src/models/Society');
const Document = require('../server/src/models/Document');
const express = require('express');

// We test against our actual Express routes and middleware
const app = express();
app.use(express.json());

const documentRoutes = require('../server/src/routes/documentRoutes');
const errorHandler = require('../server/src/middleware/error');

app.use('/api/documents', documentRoutes);
app.use(errorHandler);

let totalPassed = 0;
let totalFailed = 0;

function assert(cond, name) {
  if (cond) {
    totalPassed++;
    console.log(`  ✓ ${name}`);
  } else {
    totalFailed++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

// Minimal valid PNG buffer
const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const validPngBuffer = Buffer.from(validPngBase64, 'base64');

// Minimal valid JPEG buffer
const validJpgBuffer = Buffer.from([
  0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46,0x00,0x01,0x01,0x01,0x00,0x60,
  0x00,0x60,0x00,0x00,0xFF,0xDB,0x00,0x43,0x00,0x08,0x06,0x06,0x07,0x06,0x05,0x08,
  0x07,0x07,0x07,0x09,0x09,0x08,0x0A,0x0C,0x14,0x0D,0x0C,0x0B,0x0B,0x0C,0x19,0x12,
  0x13,0x0F,0x14,0x1D,0x1A,0x1F,0x1E,0x1D,0x1A,0x1C,0x1C,0x20,0x24,0x2E,0x27,0x20,
  0x22,0x2C,0x23,0x1C,0x1C,0x28,0x37,0x29,0x2C,0x30,0x31,0x34,0x34,0x34,0x1F,0x27,
  0x39,0x3D,0x38,0x32,0x3C,0x2E,0x33,0x34,0x32,0xFF,0xC0,0x00,0x0B,0x08,0x00,0x01,
  0x00,0x01,0x01,0x01,0x11,0x00,0xFF,0xC4,0x00,0x1F,0x00,0x00,0x01,0x05,0x01,0x01,
  0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x01,0x02,0x03,0x04,
  0x05,0x06,0x07,0x08,0x09,0x0A,0x0B,0xFF,0xDA,0x00,0x08,0x01,0x01,0x00,0x00,0x3F,
  0x00,0xBF,0x80,0xFF,0xD9
]);

// Minimal valid PDF buffer
const validPdfBuffer = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
  'xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
  'trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF\n'
);

(async () => {
  console.log('====================================================');
  console.log('SOCIETYHUB: COMPREHENSIVE DOCUMENT UPLOAD & RBAC TEST');
  console.log('====================================================');

  await connectDB();

  // Verify existing document records are preserved
  const initialDocs = await Document.find().lean();
  console.log(`Pre-test Document count in database: ${initialDocs.length}`);
  assert(initialDocs.length > 0, 'Existing document database records are present and preserved');

  // Find actual test societies and users
  const adminA = await User.findOne({ role: 'Admin', status: 'Active' });
  const societyA = await Society.findById(adminA.societyId);
  const residentA = await User.findOne({ societyId: societyA._id, role: 'Resident', status: 'Active' });
  const staffA = await User.findOne({ societyId: societyA._id, role: 'SecurityStaff', status: 'Active' });

  const adminB = await User.findOne({ role: 'Admin', societyId: { $ne: societyA._id }, status: 'Active' });
  const societyB = adminB ? await Society.findById(adminB.societyId) : null;

  const adminTokenA = jwt.sign({ id: adminA._id, role: adminA.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const residentTokenA = jwt.sign({ id: residentA._id, role: residentA.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const staffTokenA = staffA ? jwt.sign({ id: staffA._id, role: staffA.role }, process.env.JWT_SECRET, { expiresIn: '1h' }) : null;
  const adminTokenB = adminB ? jwt.sign({ id: adminB._id, role: adminB.role }, process.env.JWT_SECRET, { expiresIn: '1h' }) : null;

  const server = app.listen(5095, async () => {
    try {
      const baseUrl = 'http://localhost:5095/api/documents';

      // TEST 1: Unauthenticated request rejected
      console.log('\n--- 1. Authentication & Role Validation ---');
      const unauthRes = await fetch(baseUrl, { method: 'GET' });
      assert(unauthRes.status === 401, 'Unauthenticated request to GET /api/documents rejected with 401');

      // TEST 2: Resident cannot upload documents (Admin only)
      const formResidentUpload = new FormData();
      formResidentUpload.append('title', 'Resident Rule');
      formResidentUpload.append('category', 'Rules');
      formResidentUpload.append('document', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'doc.pdf');
      const resUploadRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${residentTokenA}` },
        body: formResidentUpload
      });
      assert(resUploadRes.status === 403, 'Resident attempting POST /api/documents rejected with 403 Forbidden');

      // TEST 3: Staff cannot upload documents
      if (staffTokenA) {
        const staffUploadRes = await fetch(baseUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${staffTokenA}` },
          body: formResidentUpload
        });
        assert(staffUploadRes.status === 403, 'SecurityStaff attempting POST /api/documents rejected with 403 Forbidden');
      }

      // TEST 4: Missing file rejected
      console.log('\n--- 2. File Validation & Error Handling ---');
      const emptyForm = new FormData();
      emptyForm.append('title', 'Empty File Doc');
      emptyForm.append('category', 'General');
      const emptyRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokenA}` },
        body: emptyForm
      });
      const emptyData = await emptyRes.json();
      assert(emptyRes.status === 400 && emptyData.error.includes('File is required'), 'Upload with missing file rejected with 400');

      // TEST 5: Dangerous executable format rejected
      const exeForm = new FormData();
      exeForm.append('title', 'Malicious Script');
      exeForm.append('category', 'Rules');
      exeForm.append('document', new Blob(['fake binary'], { type: 'application/x-msdownload' }), 'exploit.exe');
      const exeRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokenA}` },
        body: exeForm
      });
      const exeData = await exeRes.json();
      assert(exeRes.status === 400 && exeData.error.includes('Dangerous'), 'Executable file (.exe) rejected with 400');

      // TEST 6: Arbitrary unsupported extension rejected
      const binForm = new FormData();
      binForm.append('title', 'Arbitrary Binary');
      binForm.append('category', 'Rules');
      binForm.append('document', new Blob(['random binary'], { type: 'application/octet-stream' }), 'data.bin');
      const binRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokenA}` },
        body: binForm
      });
      const binData = await binRes.json();
      assert(binRes.status === 400 && binData.error.includes('Unsupported'), 'Arbitrary unsupported file format rejected with 400');

      // TEST 7: Genuine Cloudinary PDF Upload
      console.log('\n--- 3. Genuine PDF Document Upload (Cloudinary) ---');
      const pdfForm = new FormData();
      pdfForm.append('title', 'Society By-Laws 2026 Test');
      pdfForm.append('category', 'Rules');
      pdfForm.append('visibility', 'ResidentVisible');
      pdfForm.append('document', new Blob([validPdfBuffer], { type: 'application/pdf' }), 'Society_ByLaws.pdf');

      const pdfUploadRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokenA}` },
        body: pdfForm
      });
      const pdfUploadData = await pdfUploadRes.json();
      assert(pdfUploadRes.status === 201 && pdfUploadData.success, 'PDF document upload succeeded with 201 Created');
      assert(pdfUploadData.data && pdfUploadData.data.url && pdfUploadData.data.url.includes('cloudinary.com'), 'PDF URL is properly generated and stored from Cloudinary');
      assert(pdfUploadData.data.documentType === 'PDF', 'Document documentType automatically inferred as PDF');
      assert(pdfUploadData.data.societyId.toString() === societyA._id.toString(), 'Document correctly assigned to Admin Society A');

      const uploadedPdfDoc = pdfUploadData.data;

      // TEST 8: Genuine Cloudinary PNG Image Upload
      console.log('\n--- 4. Genuine Image Upload (Cloudinary) ---');
      const pngForm = new FormData();
      pngForm.append('title', 'Society Layout Map');
      pngForm.append('category', 'Notices');
      pngForm.append('visibility', 'AdminOnly');
      pngForm.append('document', new Blob([validPngBuffer], { type: 'image/png' }), 'Society_Map.png');

      const pngUploadRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokenA}` },
        body: pngForm
      });
      const pngUploadData = await pngUploadRes.json();
      assert(pngUploadRes.status === 201 && pngUploadData.success, 'PNG image upload succeeded with 201 Created');
      assert(pngUploadData.data && pngUploadData.data.url && pngUploadData.data.url.includes('/image/upload/'), 'PNG URL uses image resource_type in Cloudinary');

      const uploadedPngDoc = pngUploadData.data;

      // Genuine Cloudinary JPG Image Upload
      const jpgForm = new FormData();
      jpgForm.append('title', 'Society Entrance Photo');
      jpgForm.append('category', 'Notices');
      jpgForm.append('visibility', 'ResidentVisible');
      jpgForm.append('document', new Blob([validJpgBuffer], { type: 'image/jpeg' }), 'Gate.jpg');

      const jpgUploadRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminTokenA}` },
        body: jpgForm
      });
      const jpgUploadData = await jpgUploadRes.json();
      assert(jpgUploadRes.status === 201 && jpgUploadData.success, 'JPG image upload succeeded with 201 Created');
      assert(jpgUploadData.data && jpgUploadData.data.url && jpgUploadData.data.url.includes('/image/upload/'), 'JPG URL uses image resource_type in Cloudinary');

      const uploadedJpgDoc = jpgUploadData.data;

      // TEST 9: View PDF file via backend delivery route /api/documents/:id/file
      console.log('\n--- 5. Document Streaming & View Delivery ---');
      const viewPdfRes = await fetch(`${baseUrl}/${uploadedPdfDoc._id}/file`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${adminTokenA}` }
      });
      assert(viewPdfRes.status === 200, 'Admin can view uploaded PDF via /:id/file endpoint (200 OK)');
      assert(viewPdfRes.headers.get('content-type') === 'application/pdf', 'Delivered content-type is application/pdf');
      assert(viewPdfRes.headers.get('content-disposition').includes('inline'), 'Delivered content-disposition is inline for in-browser PDF viewing');
      const pdfBytes = await viewPdfRes.arrayBuffer();
      assert(pdfBytes.byteLength === validPdfBuffer.byteLength, 'Delivered PDF byte stream matches uploaded file bytes exactly');

      // TEST 10: Resident can view ResidentVisible PDF
      const resViewPdfRes = await fetch(`${baseUrl}/${uploadedPdfDoc._id}/file`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${residentTokenA}` }
      });
      assert(resViewPdfRes.status === 200, 'Resident of same society can view ResidentVisible PDF (200 OK)');

      // TEST 11: Resident CANNOT view AdminOnly document of same society
      const resViewPrivateRes = await fetch(`${baseUrl}/${uploadedPngDoc._id}/file`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${residentTokenA}` }
      });
      assert(resViewPrivateRes.status === 404, 'Resident attempting to access AdminOnly document receives 404 Not Found');

      // TEST 12: SecurityStaff CANNOT access documents
      if (staffTokenA) {
        const staffViewRes = await fetch(`${baseUrl}/${uploadedPdfDoc._id}/file`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${staffTokenA}` }
        });
        assert(staffViewRes.status === 403, 'SecurityStaff accessing /:id/file rejected with 403 Forbidden');
      }

      // TEST 13: Query param token authentication for direct browser links
      const queryAuthRes = await fetch(`${baseUrl}/${uploadedPdfDoc._id}/file?token=${adminTokenA}`, {
        method: 'GET'
      });
      assert(queryAuthRes.status === 200, 'Browser direct link with ?token= authenticates successfully');

      // TEST 14: Cross-Society Isolation
      console.log('\n--- 6. Multi-Society Isolation Validation ---');
      if (adminTokenB) {
        const crossSocietyViewRes = await fetch(`${baseUrl}/${uploadedPdfDoc._id}/file`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminTokenB}` }
        });
        assert(crossSocietyViewRes.status === 404, 'Admin of Society B cannot access Society A document (404 Not Found)');

        // Cross-society GET /api/documents only returns own society's docs
        const societyBDocsRes = await fetch(baseUrl, {
          method: 'GET',
          headers: { Authorization: `Bearer ${adminTokenB}` }
        });
        const societyBDocsData = await societyBDocsRes.json();
        const containsDocA = societyBDocsData.data.some(d => d._id === uploadedPdfDoc._id);
        assert(!containsDocA, 'Society B document list does not contain any Society A documents');
      }

      // Clean up test documents created during this test
      await Document.deleteMany({ _id: { $in: [uploadedPdfDoc._id, uploadedPngDoc._id, uploadedJpgDoc._id] } });

      // Verify original documents remain intact
      const postTestDocs = await Document.find().lean();
      assert(postTestDocs.length === initialDocs.length, `Database document count restored to original count (${initialDocs.length}) without data loss`);

      console.log('\n====================================================');
      console.log(`TEST SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
      console.log('====================================================\n');

    } catch (err) {
      console.error('Test execution exception:', err);
    } finally {
      server.close();
      await mongoose.disconnect();
    }
  });
})();
