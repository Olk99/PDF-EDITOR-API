const express = require('express');
const multer = require('multer');
const { PDFDocument, rgb } = require('pdf-lib');

const app = express();
const upload = multer();

app.get('/', (req, res) => {
  res.send('✅ PDF Editor API is running!');
});

// New endpoint to receive PDF + optional image, edit PDF, and return result
app.post('/edit-pdf', upload.fields([
  { name: 'pdf' },
  { name: 'image', maxCount: 1 }
]), async (req, res) => {
  try {
    // Get the uploaded PDF file buffer
    const pdfBytes = req.files['pdf'][0].buffer;
    // Get the uploaded image file buffer if present
    const imageBytes = req.files['image'] ? req.files['image'][0].buffer : null;

    // Load the PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the first page (for demo purposes)
    const page = pdfDoc.getPage(0);

    // Add some text on the page
    page.drawText('Edited by My PDF API!', {
      x: 50,
      y: 700,
      size: 20,
      color: rgb(1, 0, 0),
    });

    // If an image was uploaded, embed and draw it on the page
    if (imageBytes) {
      const pngImage = await pdfDoc.embedPng(imageBytes);
      page.drawImage(pngImage, {
        x: 50,
        y: 500,
        width: 200,
        height: 200,
      });
    }

    // Save the edited PDF to bytes
    const editedPdfBytes = await pdfDoc.save();

    // Set response content type to PDF and send edited PDF bytes
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(editedPdfBytes));
  } catch (err) {
    console.error('Error editing PDF:', err);
    res.status(500).send('Failed to edit PDF');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server started at http://localhost:${PORT}`);
});
