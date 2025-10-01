const prisma = require('../utils/prisma');

const getAccount = async (req, res) => {
  try {
    const account = await prisma.account.findFirst({
      where: { userId: req.userId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.status(200).json(account);
  } catch (error) {
    console.error('❌ [getAccount] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId
    });
    res.status(500).json({
      error: 'Failed to retrieve account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createAccount = async (req, res) => {
  const { name, balance } = req.body;

  if (!name || balance === undefined) {
    return res.status(400).json({ error: 'Name and balance are required' });
  }

  try {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: req.userId },
    });

    if (existingAccount) {
      return res.status(400).json({ error: 'User already has an account' });
    }

    const account = await prisma.account.create({
      data: {
        name,
        balance,
        userId: req.userId,
      },
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('❌ [createAccount] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      data: { name, balance }
    });
    res.status(500).json({
      error: 'Failed to create account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateAccount = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const account = await prisma.account.updateMany({
      where: { userId: req.userId },
      data: { name },
    });

    if (account.count === 0) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.status(200).json({ message: 'Account updated successfully' });
  } catch (error) {
    console.error('❌ [updateAccount] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      data: { name }
    });
    res.status(500).json({
      error: 'Failed to update account',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAccount,
  createAccount,
  updateAccount,
};
