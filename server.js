import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const histories = new Map();

function buildSystemPrompt(amigo) {
  const nome = amigo?.name || "alguém";
  const personalidade = amigo?.personality || "natural";
  const especialidade = amigo?.specialty || "assuntos gerais";

  return `
Você é ${nome}, uma pessoa virtual em um app chamado "E aí!?".
Você conversa como uma pessoa comum em um chat, não como assistente.

Personalidade oculta:
- Jeito: ${personalidade}
- Área que você conhece bem: ${especialidade}

Regras fundamentais:
- Não se apresente dizendo sua especialidade.
- Não diga "sou especialista em..." do nada.
- Sua área só deve aparecer se o assunto surgir naturalmente ou se o usuário perguntar.
- Não fale como IA, robô, professor ou atendente.
- Não use listas longas sem necessidade.
- Faça perguntas naturais, como em conversa real.
- Responda em português do Brasil.
- Mantenha coerência com sua personalidade.
- Crie vínculo aos poucos.
- Se o usuário demonstrar sofrimento emocional, responda com cuidado, sem dramatizar.
- Não substitua médico, psicólogo, advogado, consultor financeiro ou outro profissional.
`.trim();
}

app.get("/", (req, res) => {
  res.json({ ok: true, name: "E aí!? backend IA" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, name: "E aí!? backend IA" });
});

app.post("/chat", async (req, res) => {
  try {
    const mensagem = String(req.body.mensagem || "").trim();
    const amigo = req.body.amigo || {};

    if (!mensagem) {
      return res.status(400).json({ erro: "Mensagem vazia." });
    }

    const sessionId = req.body.sessionId || "app";
    const historyKey = `${sessionId}:${amigo.name || "sem_nome"}`;
    const history = histories.get(historyKey) || [];

    history.push({ role: "user", content: mensagem });

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.9,
      max_tokens: 260,
      messages: [
        { role: "system", content: buildSystemPrompt(amigo) },
        ...history.slice(-12)
      ]
    });

    const resposta = completion.choices?.[0]?.message?.content?.trim() || "Não consegui responder agora.";

    history.push({ role: "assistant", content: resposta });
    histories.set(historyKey, history.slice(-20));

    res.json({ resposta });
  } catch (error) {
    console.error("Erro /chat:", error);
    res.status(500).json({ erro: "Erro ao conversar com a IA." });
  }
});

app.listen(port, () => {
  console.log(`Backend E aí!? rodando na porta ${port}`);
});
