const Update = require('../../models/Update');
const { requireProjectId } = require('../middlewares/projectValidation');

function hasRequiredUpdateFields(body) {
  return body.date &&
    body.siteName &&
    body.workDone &&
    body.numberOfWorkers !== undefined &&
    body.materialsUsed &&
    body.progressPercentage !== undefined;
}

function runPhotoUpload(req, res) {
  const upload = req.app.locals.upload;

  return new Promise((resolve, reject) => {
    upload.single('photo')(req, res, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function addUpdate(req, res) {
  try {
    await runPhotoUpload(req, res);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const projectId = requireProjectId(req, res);
  if (!projectId) return;

  try {
    if (!hasRequiredUpdateFields(req.body)) {
      return res.status(400).json({ message: 'All fields are required!' });
    }

    const photoPath = req.file ? '/uploads/' + req.file.filename : '';
    const newUpdate = new Update({
      projectId,
      projectName: String(req.body.projectName || ''),
      date: req.body.date,
      siteName: req.body.siteName,
      workDone: req.body.workDone,
      numberOfWorkers: Number(req.body.numberOfWorkers),
      materialsUsed: req.body.materialsUsed,
      progressPercentage: Number(req.body.progressPercentage),
      photoPath,
      submittedBy: String(req.body.submittedBy || '')
    });

    await newUpdate.save();
    res.status(201).json({ message: 'Update saved successfully!', data: newUpdate });
  } catch (error) {
    res.status(500).json({ message: 'Server error. Could not save update.' });
  }
}

async function getUpdates(req, res) {
  const projectId = requireProjectId(req, res);
  if (!projectId) return;

  try {
    const updates = await Update.find({ projectId }).sort({ createdAt: -1 });
    res.status(200).json(updates);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
}

async function deleteUpdate(req, res) {
  const projectId = requireProjectId(req, res);
  if (!projectId) return;

  try {
    const deleted = await Update.findOneAndDelete({ _id: req.params.id, projectId });
    if (!deleted) return res.status(404).json({ message: 'Update not found!' });
    res.status(200).json({ message: 'Deleted successfully!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
}

async function updateById(req, res) {
  try {
    await runPhotoUpload(req, res);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }

  const projectId = requireProjectId(req, res);
  if (!projectId) return;

  try {
    if (!hasRequiredUpdateFields(req.body)) {
      return res.status(400).json({ message: 'All fields are required!' });
    }

    const updateData = {
      date: req.body.date,
      siteName: req.body.siteName,
      workDone: req.body.workDone,
      numberOfWorkers: Number(req.body.numberOfWorkers),
      materialsUsed: req.body.materialsUsed,
      progressPercentage: Number(req.body.progressPercentage),
      submittedBy: String(req.body.submittedBy || '')
    };

    if (req.file) updateData.photoPath = '/uploads/' + req.file.filename;

    const updated = await Update.findOneAndUpdate(
      { _id: req.params.id, projectId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Update not found!' });
    res.status(200).json({ message: 'Updated successfully!', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
}

async function getSiteProgress(req, res) {
  const projectId = requireProjectId(req, res);
  if (!projectId) return;

  try {
    const updates = await Update.find({ projectId }).sort({ createdAt: -1 });
    const siteMap = {};

    updates.forEach(update => {
      if (!siteMap[update.siteName]) siteMap[update.siteName] = update;
    });

    res.status(200).json(Object.values(siteMap));
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  addUpdate,
  getUpdates,
  deleteUpdate,
  updateById,
  getSiteProgress
};
