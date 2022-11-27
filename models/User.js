const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  organizationId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  projectsId: {
    type: [mongoose.Types.ObjectId],
    default: []
  },
  roleId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: false,
    default: ''
  },
  firstName: {
    type: String,
    required: false,
    default: ''
  },
  lastName: {
    type: String,
    required: false,
    default: ''
  },
  password: {
    type: String,
    required: true,
  },
  pic: {
    type: String,
    default: ''
  },
  createdOn: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('User', userSchema);