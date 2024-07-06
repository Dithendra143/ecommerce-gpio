const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const axios = require('axios');
const multer = require('multer');  // Add this line
const Product = require('./models/Product');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const adminSchema = new mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);
const Admin = mongoose.model('Admin', adminSchema);

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword });
  await user.save();
  res.status(201).json({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

app.post('/admin/register', async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = new Admin({ email, password: hashedPassword });
  await admin.save();
  res.status(201).json({ message: 'Admin registered' });
});

app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ adminId: admin._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuthMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Setup multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post('/admin/products', adminAuthMiddleware, upload.single('image'), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : ''
    };
    const product = new Product(productData);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error adding product', error: error.message });
  }
});

app.put('/admin/products/:id', adminAuthMiddleware, upload.single('image'), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : req.body.image
    };
    const product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

app.delete('/admin/products/:id', adminAuthMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

app.get('/admin/products', adminAuthMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

app.post('/checkout-success', authMiddleware, async (req, res) => {
  try {
    const { items } = req.body;
    for (const itemId of items) {
      const product = await Product.findById(itemId);
      if (product) {
        await axios.post('http://<Raspberry_Pi_IP>:5000/control_gpio', {
          pin: product.gpioPin,
          action: product.gpioAction
        });
      }
    }
    res.json({ message: 'GPIO controlled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error controlling GPIO', error: error.message });
  }
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
