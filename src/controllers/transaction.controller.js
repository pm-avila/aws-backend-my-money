const prisma = require('../utils/prisma');

const getTransactions = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        account: {
          userId: req.userId,
        },
      },
      skip: parseInt(skip),
      take: parseInt(limit),
      orderBy: {
        date: 'desc',
      },
    });

    const totalTransactions = await prisma.transaction.count({
      where: {
        account: {
          userId: req.userId,
        },
      },
    });

    res.status(200).json({
      transactions,
      totalPages: Math.ceil(totalTransactions / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error('❌ [getTransactions] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      pagination: { page, limit }
    });
    res.status(500).json({
      error: 'Failed to retrieve transactions',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createTransaction = async (req, res) => {
  const { amount, description, date, categoryId, type } = req.body;

  if (!amount || !date || !categoryId || !type) {
    return res.status(400).json({ error: 'Amount, date, categoryId, and type are required' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Invalid transaction type' });
  }

  try {
    const account = await prisma.account.findFirst({
      where: { userId: req.userId },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount,
          description,
          date: new Date(date),
          type,
          accountId: account.id,
          categoryId,
        },
      });

      const newBalance =
        type === 'income' ? account.balance + amount : account.balance - amount;

      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      return transaction;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('❌ [createTransaction] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      data: { amount, type, categoryId, date }
    });
    res.status(500).json({
      error: 'Failed to create transaction',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { amount, description, date, categoryId, type } = req.body;

  if (!amount || !date || !categoryId || !type) {
    return res.status(400).json({ error: 'Amount, date, categoryId, and type are required' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Invalid transaction type' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const oldTransaction = await tx.transaction.findFirst({
        where: { id: parseInt(id), account: { userId: req.userId } },
      });

      if (!oldTransaction) {
        throw new Error('Transaction not found');
      }

      const account = await tx.account.findUnique({
        where: { id: oldTransaction.accountId },
      });

      // Revert the old transaction amount
      const balanceAfterRevert =
        oldTransaction.type === 'income'
          ? account.balance - oldTransaction.amount
          : account.balance + oldTransaction.amount;

      // Apply the new transaction amount
      const newBalance =
        type === 'income'
          ? balanceAfterRevert + amount
          : balanceAfterRevert - amount;

      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      const updatedTransaction = await tx.transaction.update({
        where: { id: parseInt(id) },
        data: {
          amount,
          description,
          date: new Date(date),
          type,
          categoryId,
        },
      });

      return updatedTransaction;
    });

    res.status(200).json(result);
  } catch (error) {
    if (error.message === 'Transaction not found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    console.error('❌ [updateTransaction] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      transactionId: id,
      data: { amount, type, categoryId, date }
    });
    res.status(500).json({
      error: 'Failed to update transaction',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteTransaction = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: { id: parseInt(id), account: { userId: req.userId } },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const account = await tx.account.findUnique({
        where: { id: transaction.accountId },
      });

      const newBalance =
        transaction.type === 'income'
          ? account.balance - transaction.amount
          : account.balance + transaction.amount;

      await tx.account.update({
        where: { id: account.id },
        data: { balance: newBalance },
      });

      await tx.transaction.delete({
        where: { id: parseInt(id) },
      });

      return true;
    });

    res.status(204).send();
  } catch (error) {
    if (error.message === 'Transaction not found') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    console.error('❌ [deleteTransaction] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      transactionId: id
    });
    res.status(500).json({
      error: 'Failed to delete transaction',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
