/*******************************
 * server.js
 * PDF Editor API with API key
 *******************************/

require('dotenv').config(); // Load .env

const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

const app = express();
const upload = multer();

// ✅ API Key Middleware
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  console.log("Client sent API key:", apiKey);
  console.log("Expected API key:", process.env.API_KEY);

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ error: 'Forbidden: Invalid API Key' });
  }
  next();
});

// ✅ Root route
app.get('/', (req, res) => {
  res.send('✅ PDF Editor API is running!');
});

// ✅ /edit-pdf route
app.post(
  '/edit-pdf',
  upload.fields([{ name: 'pdf' }, { name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      if (!req.files || !req.files['pdf']) {
        return res.status(400).json({ error: 'No PDF uploaded.' });
      }

      // Load PDF
      const pdfBytes = req.files['pdf'][0].buffer;
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Embed font
      const pages = pdfDoc.getPages();
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // Example: add text to each page
      pages.forEach((page, idx) => {
        page.drawText(`Page ${idx + 1} edited!`, {
          x: 50,
          y: page.getHeight() - 50,
          size: 18,
          font: helveticaFont,
          color: rgb(1, 0, 0),
        });
      });

      // Example: add image if uploaded
      if (req.files['image']) {
        const imageBytes = req.files['image'][0].buffer;
        const pngImage = await pdfDoc.embedPng(imageBytes);
        const imageDims = pngImage.scale(0.5);

        const firstPage = pages[0];
        firstPage.drawImage(pngImage, {
          x: 50,
          y: firstPage.getHeight() - 200,
          width: imageDims.width,
          height: imageDims.height,
        });
      }

      // Final PDF bytes
      const editedPdfBytes = await pdfDoc.save();

      // Set response headers
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="edited.pdf"',
      });

      res.send(Buffer.from(editedPdfBytes));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to edit PDF.' });
    }
  }
);

// ✅ Start server locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 PDF Editor API running on port ${PORT}`);
});
