/*******************************
 * server.js
 * PDF Editor API — Multi-Page + Image Insert
 *******************************/

require('dotenv').config(); // Load .env variables

const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

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

// ✅ Multi-page editing + image insert route
app.post(
  '/edit-pdf',
  upload.fields([{ name: 'pdf' }, { name: 'image', maxCount: 1 }]),
  async (req, res) => {
    try {
      if (!req.files || !req.files['pdf']) {
        return res.status(400).json({ error: 'No PDF uploaded.' });
      }

      // Load the uploaded PDF
      const pdfBytes = req.files['pdf'][0].buffer;
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Embed a font for text
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      // 🖼️ Embed image if provided
      let pngImage, imageDims;
      if (req.files['image']) {
        const imageBytes = req.files['image'][0].buffer;
        pngImage = await pdfDoc.embedPng(imageBytes);
        imageDims = pngImage.scale(0.3); // scale the image as needed
      }

      // 📝 Loop through all pages
      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();

        // ✅ Add text
        page.drawText(`This is Page ${idx + 1} edited!`, {
          x: 50,
          y: height - 50,
          size: 18,
          font: helveticaFont,
          color: rgb(0, 0, 1), // blue text
        });

        // ✅ Draw rectangle highlight
        page.drawRectangle({
          x: 50,
          y: height - 100,
          width: 200,
          height: 30,
          color: rgb(0.95, 0.1, 0.1),
          opacity: 0.5,
        });

        // ✅ Insert image/stamp/signature in bottom-right
        if (pngImage) {
          page.drawImage(pngImage, {
            x: width - imageDims.width - 50,
            y: 50,
            width: imageDims.width,
            height: imageDims.height,
          });
        }
      });

      // Save the edited PDF
      const editedPdfBytes = await pdfDoc.save();

      // Send back the PDF
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

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 PDF Editor API running on port ${PORT}`);
});
