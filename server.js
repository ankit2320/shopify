const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// PostgreSQL connection setup
const client = new Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: process.env.DB_PORT,
});

client.connect();

// Shopify API call to fetch orders
async function fetchOrders() {
  const shopifyUrl = `https://${process.env.SHOP_NAME}.myshopify.com/admin/api/2023-04/orders.json`;
  const response = await axios.get(shopifyUrl, {
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_API_KEY,
    },
  });
  return response.data.orders;
}

// Endpoint to get orders
app.get('/orders', async (req, res) => {
  try {
    const orders = await fetchOrders();
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching orders');
  }
});

// Start server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});


// Webhook handler for order creation
app.post('/webhook/orders', (req, res) => {
    const order = req.body;  // Get the order data from the webhook payload
    
    // Log the incoming order data for testing
    console.log('Webhook received: New order created', order);
  
    // Extract the order details and customer information
    const orderId = order.id;
    const customerName = order.customer.first_name;
    const totalPrice = order.total_price;
  
    // Save the order data to PostgreSQL
    const query = 'INSERT INTO orders (order_id, customer_name, total_price) VALUES ($1, $2, $3)';
    const values = [orderId, customerName, totalPrice];
  
    // Execute the query to store the order
    client.query(query, values, (err, result) => {
      if (err) {
        console.error('Error inserting order into the database', err);
        res.status(500).send('Error saving order to database');
      } else {
        res.status(200).send('Webhook received and order saved');
      }
    });
  });