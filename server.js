const express = require('express');
const cors = require('cors');
const { initDb } = require('./config/database');
const buildingsRouter = require('./routes/buildings');
const flatsRouter = require('./routes/flats');
const tenantsRouter = require('./routes/tenants');
const leasesRouter = require('./routes/leases');
const paymentsRouter = require('./routes/payments');
const errorHandler = require('./middleware/errorHandler');
const syncRouter = require('./routes/sync');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/buildings', buildingsRouter);
app.use('/api/flats', flatsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/leases', leasesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use(errorHandler);

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}).catch(e => {
  console.error('DB init failed', e);
  process.exit(1);
});
