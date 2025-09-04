const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 Conexão com o MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Conectado ao MongoDB"))
.catch(err => console.error("❌ Erro ao conectar:", err));

// 🔑 Middleware de autenticação
function autenticarToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ erro: "Token não fornecido" });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ erro: "Token inválido" });
    req.user = user;
    next();
  });
}

// 📌 Registro de usuário
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const novoUser = new User({ username, password: hash });
    await novoUser.save();
    res.json({ mensagem: "Usuário registrado com sucesso!" });
  } catch (err) {
    res.status(400).json({ erro: "Falha ao registrar usuário" });
  }
});

// 📌 Login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ erro: "Usuário não encontrado" });

  const valido = await bcrypt.compare(password, user.password);
  if (!valido) return res.status(400).json({ erro: "Senha inválida" });

  const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.json({ token });
});

// 📌 Votação
let votos = { Lula: 0, Bolsonaro: 0, Branco: 0, Nulo: 0 };

app.post("/votar", autenticarToken, (req, res) => {
  const { candidato } = req.body;
  if (votos[candidato] !== undefined) {
    votos[candidato]++;
    res.json({ message: "✅ Voto registrado com sucesso!" });
  } else {
    votos.Nulo++;
    res.json({ message: "⚠️ Voto nulo registrado!" });
  }
});

// 📌 Resultado
app.get("/resultado", (req, res) => {
  res.json(votos);
});

// 🚀 Porta
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
