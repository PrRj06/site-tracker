const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  fullName: {
    type: String,
    trim: true,
    default: ''
  },
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['builder', 'manager', 'admin'],
    required: true
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  users: [accountSchema]
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
module.exports = Project;
