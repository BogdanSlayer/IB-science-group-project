const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Extracts plain text from a PDF, Word (.docx), or plain text file.
 * @param {string} filePath  - Absolute path to the uploaded file on disk
 * @param {string} mimeType  - MIME type of the file
 * @returns {Promise<string>} - Extracted plain text
 */
async function extractText(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);

  switch (mimeType) {
    case "application/pdf": {
      const data = await pdfParse(buffer);
      return data.text;
    }

    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/msword": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    case "text/plain":
      return buffer.toString("utf-8");

    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

module.exports = { extractText };
