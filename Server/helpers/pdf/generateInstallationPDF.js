const PDFDocument = require("pdfkit");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");

const generateInstallationPDF = async (req, res) => {
  try {
    const farmerSaralId = req.query.farmerSaralId;
    const photoUrls = req.body.photoUrls;

    if (
      !farmerSaralId ||
      !photoUrls ||
      !Array.isArray(photoUrls) ||
      photoUrls.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "farmerSaralId & photoUrls are required." });
    }

    // ✅ Fetch farmer details
    const responseData = await axios.get(
      `http://88.222.214.93:8001/farmer/showFarmerAccordingToSaralId?saralId=${farmerSaralId}`
    );

    if (!responseData?.data?.success) {
      return res.status(404).json({ message: "Farmer not found." });
    }

    const farmerData = responseData?.data?.data;
    const {
      saralId,
      farmerName,
      fatherOrHusbandName,
      contact,
      address,
      village,
    } = farmerData;

    // ✅ Build full photo URLs
    const basePhotoPath = "http://88.222.214.93:5000";
    const fullPhotoUrls = photoUrls.map((url) =>
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : basePhotoPath + url
    );

    // ✅ Set headers for PDF download
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${saralId}.pdf"`
    );
    res.setHeader("Content-Type", "application/pdf");

    // ✅ Create a PDF doc (A4 size)
    const doc = new PDFDocument({ size: "A4", margin: 20 });
    doc.pipe(res);

    // Farmer details
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(`Name - ${farmerName}`)
      .moveDown(0.3);
    doc.text(`Father Name - ${fatherOrHusbandName}`).moveDown(0.3);
    doc.text(`Saral No - ${saralId}`).moveDown(0.3);
    doc.text(`Phone No - ${contact}`).moveDown(0.3);
    doc.text(`Address - ${address}`).moveDown(0.3);
    doc.text(`Village - ${village}`).moveDown(0.5);

    // 📸 Custom photo grid (2 photos per row)
    const photoWidth = 275; // fixed width
    const photoHeight = 315; // fixed height
    const gapX = 15;
    const gapY = 15;
    const cols = 2;

    // Available page width
    const pageWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Total width of 2 photos + 1 gap
    const totalRowWidth = cols * photoWidth + (cols - 1) * gapX;

    // Starting X (center align)
    const startX = doc.page.margins.left + (pageWidth - totalRowWidth) / 2;

    let y = doc.y + 20;

    for (let i = 0; i < fullPhotoUrls.length; i++) {
      const url = fullPhotoUrls[i];
      let imageBuffer;

      try {
        // ✅ Try reading from local file system if available
        const localPath = path.join(
          __dirname,
          "..", // adjust according to your folder structure
          "uploads",
          url.split("/uploads/")[1] // extract relative path after /uploads/
        );
        imageBuffer = await fs.readFile(localPath);
      } catch (e) {
        // ✅ If not found, fetch from HTTP
        const imageResponse = await axios.get(url, { responseType: "arraybuffer" });
        imageBuffer = Buffer.from(imageResponse.data, "binary");
      }

      const col = i % cols;
      const row = Math.floor(i / cols);

      const posX = startX + col * (photoWidth + gapX);
      const posY = y + row * (photoHeight + gapY);

      doc.image(imageBuffer, posX, posY, {
        width: photoWidth,
        height: photoHeight,
      });
    }

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (!res.headersSent) {
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
};

module.exports = { generateInstallationPDF };
