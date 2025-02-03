const fs = require("fs/promises");
const path = require("path");

const imageHandlerWithPath = async (photos, folderPath) => {
  try {
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      throw new Error("No images provided!");
    }

    if (photos.length > 8) {
      throw new Error("You can only upload up to 8 images.");
    }

    const allowedFormats = ["jpeg", "jpg", "png"]; 

    // Construct the dynamic upload path
    const uploadDir = path.join(__dirname, `../uploads/${folderPath}`);

    // Ensure the directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const savedFiles = [];

    for (const [index, base64Image] of photos.entries()) {
      // Check if the base64 image has the correct prefix for image type
      const match = base64Image.match(/^data:image\/([a-zA-Z0-9]+);base64,/);

      if (!match) {
        throw new Error(`Image ${index + 1} does not have a valid base64 format.`);
      }

      const ext = match[1].toLowerCase();

      // Validate the image format
      if (!allowedFormats.includes(ext)) {
        throw new Error(`Invalid format for image ${index + 1}. Allowed formats are jpeg, jpg, png.`);
      }

      const base64Data = base64Image.split(",")[1]; // Extract base64 data
      const buffer = Buffer.from(base64Data, "base64");

      const fileName = `${Date.now()}_${index + 1}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      try {
        await fs.writeFile(filePath, buffer); // Write the buffer to a file
        savedFiles.push({ fileName, filePath });
      } catch (err) {
        throw new Error(`Error writing image ${index + 1} to disk: ${err.message}`);
      }
    }

    return savedFiles; // Return the list of saved file info

  } catch (error) {
    throw new Error(`Error processing base64 images: ${error.message}`);
  }
};

module.exports = imageHandlerWithPath;