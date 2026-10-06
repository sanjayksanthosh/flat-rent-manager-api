const express = require('express');
const cors = require('cors');
const { getDb } = require('./config/database');
const buildingsRouter = require('./routes/buildings');
const flatsRouter = require('./routes/flats');
const tenantsRouter = require('./routes/tenants');
const leasesRouter = require('./routes/leases');
const paymentsRouter = require('./routes/payments');
const errorHandler = require('./middleware/errorHandler');
const syncRouter = require('./routes/sync');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/buildings', buildingsRouter);
app.use('/api/flats', flatsRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/leases', leasesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/sync', syncRouter);
app.use(errorHandler);

getDb();
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
