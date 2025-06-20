import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import {sql} from './config/db.js'; // Adjust the path as necessary
import rateLimiterMiddleware from './middleware/rateLimiter.js';

dotenv.config();  

const app = express();

app.use(rateLimiterMiddleware); // Apply rate limiting middleware
app.use(express.json());
app.use(cors());

const port=process.env.PORT||5001;

async function initDB(){
  try{
    await sql `CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
    console.log("Database initialized successfully");

  }catch(err){
    console.error("Error  initializing the database:", err);
    process.exit(1);
  }
}


app.get('/', (req, res) => {
  res.send('Hello, World!');
}
);

app.get('/api/transactions/:user_id', async (req, res) => {
  const { user_id } = req.params;      
  try {
    const result = await sql`
      SELECT * FROM transactions WHERE user_id = ${user_id}
      ORDER BY created_at
    `;
    res.status(200).json(result);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
);

app.post('/api/transactions',  async (req, res) => {
  const { user_id, title, amount, category } = req.body;      
  try {
    if (!user_id || !title || amount===undefined || !category) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    const result = await sql`
      INSERT INTO transactions (user_id, title, amount, category)
      VALUES (${user_id}, ${title}, ${amount}, ${category})
      RETURNING *
    `;
    res.status(201).json(result[0]);
  } catch (err) {
    console.error("Error inserting transaction:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}); 

app.delete('/api/transactions/:id', async (req, res) => {
  const { id } = req.params;
  if(!id || isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'Invalid transaction ID' });
  }
  try {
    const result = await sql`
      DELETE FROM transactions WHERE id = ${id}
      RETURNING *
    `;
    if (result.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.status(200).json(result[0]);
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  } 
});

app.get('/api/transactions/summary/:user_id', async (req, res) => {
  const { user_id } = req.params;
  try{
    const totalbalance = await sql`
      SELECT COALESCE(SUM(amount),0) AS balance
      FROM transactions
      WHERE user_id = ${user_id}
    `;
    const totalincome = await sql`
      SELECT COALESCE(SUM(amount),0) AS income
      FROM transactions
      WHERE user_id = ${user_id} AND amount > 0
    `;
    const totalexpenses = await sql`
      SELECT COALESCE(SUM(amount),0) AS expenses
      FROM transactions
      WHERE user_id = ${user_id} AND amount < 0
    `;
    res.status(200).json({
      balance:totalbalance[0].balance,
      income:totalincome[0].income,
      expense:totalexpenses[0].expenses
    });
  }

  catch (err) {
    console.error("Error fetching all transactions:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

initDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}).catch(err => {
  console.error("Failed to initialize the database:", err);
  process.exit(1);
});   