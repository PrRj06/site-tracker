const express = require('express');
const {
  addUpdate,
  getUpdates,
  deleteUpdate,
  updateById,
  getSiteProgress
} = require('../controllers/updateController');

const router = express.Router();

router.post('/add-update', addUpdate);
router.get('/updates', getUpdates);
router.delete('/update/:id', deleteUpdate);
router.put('/update/:id', updateById);
router.get('/site-progress', getSiteProgress);

module.exports = router;
