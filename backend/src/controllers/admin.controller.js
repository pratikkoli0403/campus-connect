const { importStudentsFromFile } = require("../services/studentImport.service");

async function importStudents(req, res) {
  try {
    const summary = await importStudentsFromFile(req.file);

    return res.status(200).json({
      success: true,
      message: "Student import completed.",
      data: summary,
    });
  } catch (error) {
    return res.status(error.statusCode ?? 500).json({
      success: false,
      message: error.message ?? "Failed to import students.",
    });
  }
}

module.exports = {
  importStudents,
};
