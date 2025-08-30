const express = require('express');
const { getAccount, createAccount, updateAccount } = require('../controllers/account.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', getAccount);
router.post('/', createAccount);
router.put('/', updateAccount);

module.exports = router;
