const express = require('express');

const app = express();
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

app.post('/api/payments/webhook', (req, res) => {
  res.json({
    isBuffer: Buffer.isBuffer(req.body),
    bodyText: req.body ? req.body.toString('utf8') : null,
    rawBody: req.rawBody ? req.rawBody.toString('utf8') : null
  });
});

app.post('/api/test', (req, res) => {
  res.json({
    body: req.body,
    raw: req.rawBody ? req.rawBody.toString('utf8') : null
  });
});

const s = app.listen(0, async () => {
  const p = s.address().port;
  const r1 = await fetch(`http://localhost:${p}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'order.paid' })
  });
  console.log('webhook:', await r1.json());

  const r2 = await fetch(`http://localhost:${p}/api/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test: 'ok' })
  });
  console.log('normal:', await r2.json());

  s.close();
});
