const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const db = require('./db');

let mode = "controle";
let logsESP = [];
let lastBadge = {};

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// 👉 Sert les fichiers statiques : /rfid.css, /rfid.js, etc.
app.use(express.static(path.join(__dirname, '../public')));

// 👉 Sert la page HTML principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../views/rfid.html'));
});

// === Routes API RFID ===

app.post('/api/verify', (req, res) => {
  const uid = req.body.uid?.trim().toLowerCase();
  db.query("SELECT * FROM utilisateurs WHERE LOWER(uid) = ?", [uid], (err, results) => {
    if (err) return res.sendStatus(500);
    if (results.length > 0) {
      lastBadge = results[0];
      res.sendStatus(200);
    } else {
      lastBadge = { uid };
      res.sendStatus(404);
    }
  });
});

// ✅ Route d'enregistrement avec école et filière
app.post('/api/register', (req, res) => {
  const { uid, nom, prenom, ecole, filiere } = req.body;
  if (!uid || !nom || !prenom || !ecole || !filiere) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  db.query(
    "INSERT INTO utilisateurs (uid, nom, prenom, ecole, filiere) VALUES (?, ?, ?, ?, ?)",
    [uid.trim(), nom, prenom, ecole, filiere],
    err => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: "Cet UID est déjà enregistré." });
        }
        return res.status(500).json({ error: err.message });
      }

      lastBadge = {};
      res.sendStatus(201);
    }
  );
});

app.delete('/api/delete/:uid', (req, res) => {
  const uid = req.params.uid.trim();
  db.query("DELETE FROM utilisateurs WHERE uid = ?", [uid], err => {
    if (err) return res.sendStatus(500);
    res.sendStatus(200);
  });
});

app.get('/api/logs', (req, res) => {
  db.query("SELECT * FROM utilisateurs ORDER BY date_enregistrement DESC LIMIT 10", (err, results) => {
    if (err) return res.sendStatus(500);
    res.json(results);
  });
});

app.get('/api/mode', (req, res) => {
  res.json({ mode });
});

app.post('/api/mode', (req, res) => {
  mode = (mode === "controle") ? "enregistrement" : "controle";
  res.json({ mode });
});

app.post('/api/log', (req, res) => {
  const msg = req.body.message;
  if (msg) {
    logsESP.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    if (logsESP.length > 50) logsESP.shift();
  }
  res.sendStatus(200);
});

app.get('/api/logs/esp', (req, res) => {
  res.json(logsESP);
});

// ✅ Enregistrement du dernier badge vu (avec tout le profil si connu)
app.post('/api/last', (req, res) => {
  const uid = req.body.uid?.trim();
  console.log(`📥 Reçu de l'ESP pour /last:`, uid);

  if (!uid) {
    console.log("❌ UID manquant dans la requête.");
    return res.sendStatus(400);
  }

  db.query("SELECT * FROM utilisateurs WHERE uid = ?", [uid], (err, results) => {
    if (err) {
      console.error("❌ Erreur MySQL :", err);
      return res.sendStatus(500);
    }

    if (results.length > 0) {
      console.log("✅ UID reconnu (déjà dans la base)");
      lastBadge = results[0]; // contient uid, nom, prenom, ecole, filiere, etc.
    } else {
      console.log("🆕 UID nouveau, non enregistré");
      lastBadge = { uid };
    }

    console.log("🧠 Mise à jour de lastBadge :", lastBadge);
    res.sendStatus(200);
  });
});

app.get('/api/last', (req, res) => {
  res.json(lastBadge);
});

// Lancement serveur
const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Serveur démarré sur http://192.168.1.151:${port}`);
});
