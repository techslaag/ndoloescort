import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  // Check required environment variables
  const requiredVars = [
    'FLUTTERWAVE_SECRET_KEY',
    'APPWRITE_FUNCTION_API_ENDPOINT',
    'APPWRITE_FUNCTION_PROJECT_ID'
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      error(`Missing required environment variable: ${varName}`);
      return res.json({
        error: `Missing required environment variable: ${varName}`
      }, 500);
    }
  }

  // Initialize Appwrite client
  const client = new Client();
  client
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

  const databases = new Databases(client);

  // Parse request body
  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch (err) {
    error('Invalid request body:', err);
    return res.json({ error: 'Invalid request body' }, 400);
  }

  const { action, data } = payload;

  // Get Flutterwave configuration
  const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
  const FLUTTERWAVE_BASE_URL = 'https://api.flutterwave.com/v3';

  log(`Processing ${action} request`);

  try {
    switch (action) {
      case 'initialize':
        // Initialize payment
        const paymentData = {
          tx_ref: data.tx_ref,
          amount: data.amount,
          currency: data.currency || 'USD',
          redirect_url: data.redirect_url,
          payment_options: 'mobilemoneyfranco,card',
          // payment_options: 'card,account,banktransfer,ussd,credit,mpesa,mobilemoneyghana,mobilemoneyfranco,mobilemoneyuganda,mobilemoneyrwanda,mobilemoneyzambia,mobilemoneytanzania,barter,qr,enaira',
          customer: {
            email: data.customer.email,
            // phonenumber: data.customer.phone || '',
            phonenumber: '+237681839583',
            name: data.customer.name
          },
          customizations: {
            title: data.customizations?.title || 'Escorts Prime Payment',
            description: data.customizations?.description || '',
            logo: data.customizations?.logo || ''
          },
          meta: data.meta || {}
        };

        log('Initializing payment with Flutterwave');

        const initResponse = await fetch(`${FLUTTERWAVE_BASE_URL}/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        });

        const initResult = await initResponse.json();

        if (!initResponse.ok) {
          error('Flutterwave initialization error:', initResult);
          throw new Error(initResult.message || 'Payment initialization failed');
        }

        log('Payment initialized successfully');
        return res.json({
          status: 'success',
          data: initResult.data
        });

      case 'verify':
        // Verify payment
        const { tx_ref } = data;
        
        if (!tx_ref) {
          return res.json({ error: 'Transaction reference required' }, 400);
        }

        log(`Verifying payment with tx_ref: ${tx_ref}`);

        const verifyResponse = await fetch(
          `${FLUTTERWAVE_BASE_URL}/transactions/verify_by_reference?tx_ref=${tx_ref}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`
            }
          }
        );

        const verifyResult = await verifyResponse.json();

        if (!verifyResponse.ok) {
          error('Flutterwave verification error:', verifyResult);
          throw new Error(verifyResult.message || 'Payment verification failed');
        }

        log('Payment verified successfully');
        return res.json({
          status: 'success',
          data: verifyResult.data
        });

      case 'refund':
        // Process refund
        const { transaction_id, amount } = data;
        
        if (!transaction_id) {
          return res.json({ error: 'Transaction ID required' }, 400);
        }

        log(`Processing refund for transaction: ${transaction_id}`);

        const refundResponse = await fetch(
          `${FLUTTERWAVE_BASE_URL}/transactions/${transaction_id}/refund`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
          }
        );

        const refundResult = await refundResponse.json();

        if (!refundResponse.ok) {
          error('Flutterwave refund error:', refundResult);
          throw new Error(refundResult.message || 'Refund request failed');
        }

        log('Refund processed successfully');
        return res.json({
          status: 'success',
          data: refundResult.data
        });

      default:
        return res.json({ error: 'Invalid action' }, 400);
    }
  } catch (err) {
    error('Flutterwave function error:', err.message);
    return res.json({
      error: err.message || 'An error occurred',
      status: 'error'
    }, 500);
  }
};