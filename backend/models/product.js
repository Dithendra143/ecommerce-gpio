const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
  gpioPin: Number,
  gpioAction: String,
  image: String  // Add this line
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
