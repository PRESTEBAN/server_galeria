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
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
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

const bucket = admin.storage().bucket();

app.get('/get-image-url', async (req, res) => {
  try {
    let { imagePath } = req.query;

    if (!imagePath) {
      return res.status(400).json({ error: 'Missing imagePath parameter' });
    }

    // 🔹 Decodificar el imagePath correctamente
    imagePath = decodeURIComponent(imagePath);

    // 🔹 Verificar si el archivo existe en Firebase Storage
    const file = bucket.file(imagePath);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'File not found in Firebase Storage' });
    }

    // 🔹 Generar la URL firmada
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // URL válida por 1 hora
    });

    res.json({ url });

  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Error generating signed URL' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get('/', (req, res) => {
  res.send('Server is running');
});
