const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors'); // Importa el módulo cors

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Usa cors como middleware

require('dotenv').config();

admin.initializeApp({
  credential: admin.credential.cert({
    "type": process.env.FIREBASE_TYPE,
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_UR,
    "token_uri": process.env.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL,
    "universe_domain": process.env.FIREBASE_UNIVERSE_DOMAIN
  }),
});

app.post('/send-notification', async (req, res) => {
  const { email, message } = req.body;

  try {
    // Buscar el token en Firestore
    const tokenDoc = await admin.firestore().collection('tokens').doc(email).get();
    if (!tokenDoc.exists) {
      throw new Error('Token not found for this email');
    }
    const token = tokenDoc.data().token;

    const messagePayload = {
      notification: {
        title: 'Nueva foto',
        body: message,
      },
      android: {
        notification: {
          vibrateTimingsMillis: [0, 500, 1000, 500], // Patrón de vibración: [espera, vibrar, pausa, vibrar]
          priority: 'high',
        }
      },
       token: token,
    };

    const response = await admin.messaging().send(messagePayload);
    console.log('Successfully sent message:', response);
    res.status(200).send('Notification sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send(`Error sending notification: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Server is running');
});
