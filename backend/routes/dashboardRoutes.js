const router = require('express').Router();
const { stats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.get('/', protect, stats);
module.exports = router;
