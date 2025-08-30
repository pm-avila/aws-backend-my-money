const prisma = require('../utils/prisma');

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
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
    res.status(500).json({ error: 'Something went wrong' });
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
    res.status(500).json({ error: 'Something went wrong' });
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
    res.status(500).json({ error: 'Something went wrong' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
