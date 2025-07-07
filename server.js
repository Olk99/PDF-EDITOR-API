/*******************************
 * server.js - JSON Annotations
 * For Google Apps Script integration
 *******************************/

require('dotenv').config();

const express = require('express');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const axios = require('axios');

const app = express();
app.use(express.json({ limit: '50mb' })); // Handle large PDFs

// ✅ API Key Middleware (checks header or JSON body)
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;
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

// ✅ JSON-based PDF editing with coordinates & image support
app.post('/edit-pdf', async (req, res) => {
  try {
    const { base64Pdf, annotations } = req.body;

    if (!base64Pdf || !annotations) {
      return res.status(400).json({ error: 'Missing base64Pdf or annotations' });
    }

    // Load PDF
    const pdfBytes = Buffer.from(base64Pdf, 'base64');
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const annotation of annotations) {
      const pageIndex = parseInt(annotation.pages); // zero-based
      const page = pdfDoc.getPage(pageIndex);

      if (annotation.text) {
        // ✅ Draw text
        page.drawText(annotation.text, {
          x: annotation.x,
          y: annotation.y,
          size: annotation.size || 12,
          font: helveticaFont,
          color: rgb(0, 0, 1) // blue text
        });
      } else if (annotation.type === 'image' && annotation.imageUrl) {
        // ✅ Fetch image from URL
        const response = await axios.get(annotation.imageUrl, { responseType: 'arraybuffer' });
        const imgBytes = response.data;
        const img = await pdfDoc.embedPng(imgBytes);
        page.drawImage(img, {
          x: annotation.x,
          y: annotation.y,
          width: annotation.width || 100,
          height: annotation.height || 50
        });
      }
    }

    const finalPdfBytes = await pdfDoc.save();
    const base64Edited = Buffer.from(finalPdfBytes).toString('base64');

    res.status(200).json({
      status: 'success',
      message: 'PDF edited successfully',
      fileBase64: base64Edited
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to edit PDF.' });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 PDF Editor API running on port ${PORT}`);
});
