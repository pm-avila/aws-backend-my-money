const prisma = require('../utils/prisma');

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
    });
    res.status(200).json(categories);
  } catch (error) {
    console.error('❌ [getCategories] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId
    });
    res.status(500).json({
      error: 'Failed to retrieve categories',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const createCategory = async (req, res) => {
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Invalid category type' });
  }

  try {
    const category = await prisma.category.create({
      data: {
        name,
        type,
        userId: req.userId,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('❌ [createCategory] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      data: { name, type }
    });
    res.status(500).json({
      error: 'Failed to create category',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { name, type } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  if (type !== 'income' && type !== 'expense') {
    return res.status(400).json({ error: 'Invalid category type' });
  }

  try {
    const category = await prisma.category.findFirst({
      where: { id: parseInt(id), userId: req.userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: { name, type },
    });

    res.status(200).json(updatedCategory);
  } catch (error) {
    console.error('❌ [updateCategory] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      categoryId: id,
      data: { name, type }
    });
    res.status(500).json({
      error: 'Failed to update category',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findFirst({
      where: { id: parseInt(id), userId: req.userId },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await prisma.category.delete({
      where: { id: parseInt(id) },
    });

    res.status(204).send();
  } catch (error) {
    console.error('❌ [deleteCategory] Database error:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      userId: req.userId,
      categoryId: id
    });
    res.status(500).json({
      error: 'Failed to delete category',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
