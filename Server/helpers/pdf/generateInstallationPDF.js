const PDFDocument = require("pdfkit");

const generateInstallationPDF = async (req, res) => {
    try {
        const { name, fatherName, saralNo, phone, address, village, photoUrls } = req.body;

        if (!name || !fatherName || !saralNo || !phone || !address || !village || !photoUrls || photoUrls.length !== 4) {
            return res.status(400).json({ message: "Invalid data. Provide all details and exactly 4 photos." });
        }

        // Set response headers for downloading the file
        res.setHeader("Content-Disposition", `attachment; filename="${saralNo}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");

        // Create a new PDF document
        const doc = new PDFDocument({ margin: 30 });
        doc.pipe(res);  // Pipe the PDF into the response

        // Farmer details
        doc.font("Helvetica-Bold").fontSize(14).text(`Name - ${name}`).moveDown(0.3); // 0.5 line gap
        doc.text(`Father Name - ${fatherName}`).moveDown(0.3);
        doc.text(`Saral No - ${saralNo}`).moveDown(0.3);
        doc.text(`Phone No - ${phone}`).moveDown(0.3);
        doc.text(`Address - ${address}`).moveDown(0.3);
        doc.text(`Village - ${village}`).moveDown(-1);

        const photoWidth = 270;
        const photoHeight = 300;
        let x = 30, y = doc.y + 20;

        photoUrls.forEach((url, index) => {
            if (index === 2) {
                x = 30;
                y += photoHeight + 20; // Adjust the vertical spacing for 2nd row
            }
            doc.image(url, x, y, { width: photoWidth, height: photoHeight });
            x += photoWidth + 20; // Adjust the horizontal spacing
        });

        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

module.exports = {generateInstallationPDF};