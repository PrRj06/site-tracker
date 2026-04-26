// models/Update.js
const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  projectId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
  projectName:        { type: String, default: '' },
  date:               { type: String, required: true },
  siteName:           { type: String, required: true },
  workDone:           { type: String, required: true },
  numberOfWorkers:    { type: Number, required: true },
  materialsUsed:      { type: String, required: true },
  progressPercentage: { type: Number, required: true, min: 0, max: 100 },
  photoPath:          { type: String, default: '' },
  submittedBy:        { type: String, default: '' }  // tracks which user submitted
}, { timestamps: true });

const Update = mongoose.model('Update', updateSchema);
module.exports = Update;
