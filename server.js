import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = process.env.SPACE_PLANNER_PORT || process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const apiKey = process.env.OPENAI_API_KEY || "";
if (!apiKey) {
  console.warn("⚠️ No se encontró la variable de entorno OPENAI_API_KEY");
}

const openai = new OpenAI({
  apiKey,
});

// Endpoint simple para probar
app.get("/", (_req, res) => {
  res.send("SpacePlanner API OK");
});

// Mapear el estilo corto de la UI a un texto más descriptivo
function styleLabel(style) {
  switch (style) {
    case "moderno":
      return "moderno y minimalista";
    case "ejecutivo":
      return "ejecutivo / gerencial";
    case "colaborativo":
      return "colaborativo tipo cowork";
    case "clasico":
      return "clásico y formal";
    default:
      return style || "moderno y minimalista";
  }
}

// === ENDPOINT IA SOLO TEXTO ===
app.post("/api/space-planner", async (req, res) => {
  try {
    const {
      width,
      length,
      height,
      style,
      seats,
      spaceType,
      priority,
      budget,
      extraNotes,
      cart,
    } = req.body || {};

    const prettyStyle = styleLabel(style);
    const areaText =
      width && length
        ? `de aproximadamente ${width}m x ${length}m (${(
            parseFloat(width) * parseFloat(length)
          ).toFixed(1)} m²)`
        : "con dimensiones aún por definir";

    const seatsText = seats
      ? `${seats} puestos de trabajo`
      : "un número de puestos todavía flexible";

    let cartSummary = "No se han seleccionado modelos específicos aún.";
    if (Array.isArray(cart) && cart.length > 0) {
      cartSummary = cart
        .map(
          (item) =>
            `- ${item.name} (${item.category}, línea ${item.line}) x${item.qty}`
        )
        .join("\n");
    }

    const userPrompt = `
Datos del proyecto (no los repitas como lista en la respuesta, solo úsalos como contexto interno):
- Dimensiones del ambiente: ${areaText}
- Altura aproximada: ${height || "no indicada"} m
- Tipo de espacio: ${spaceType || "no indicado"}
- Estilo deseado: ${prettyStyle}
- Nº de puestos: ${seatsText}
- Prioridad principal: ${priority || "no indicada"}
- Nivel de inversión: ${budget || "no indicado"}

Selección de productos (pre-carrito Mobicorp):
${cartSummary}

Notas adicionales del cliente:
${extraNotes || "Sin notas adicionales."}

Instrucciones para la respuesta:

Redacta una recomendación muy corta y directa para el cliente, explicando en general cómo conviene organizar el espacio, qué tipos de sillas o zonas serían más útiles y una idea general de combinación de mobiliario.

La respuesta debe cumplir estrictamente estas reglas:
1) Extensión: entre 2 y 3 frases en total (máximo ~60 palabras).
2) Usa solo 1 párrafo.
3) No uses títulos, encabezados ni secciones. No escribas cosas como "1)", "Resumen", "Recomendaciones finales" ni "###".
4) No uses listas, viñetas, guiones, numeraciones, emojis ni símbolos como *, # o •.
5) Escribe en tono profesional pero muy conciso, como si respondieras por WhatsApp a un cliente ocupado.
6) Ve directo al punto, sin introducciones ni conclusiones genéricas, sin repetir todos los datos del proyecto.

Devuelve únicamente el texto final para el cliente, sin explicaciones adicionales.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Eres un asesor experto en diseño de oficinas para la marca de mobiliario Mobicorp. Respondes siempre en español, con tono profesional pero muy conciso. Escribes solo texto plano en un único párrafo, con 2 o 3 frases cortas (máximo ~60 palabras). No usas títulos, ni listas, ni numeraciones, ni emojis, ni símbolos como *, #, -, •. Nunca uses encabezados como '1)' o '###'. Ve directo al punto.",
        },
        { role: "user", content: userPrompt },
      ],
    });

    const suggestionText =
      completion.choices[0]?.message?.content?.trim() ||
      "Propuesta generada: distribuye los puestos de forma ordenada, combinando sillas ejecutivas y operativas según el rol, dejando zonas claras de circulación y espera.";

    res.json({ suggestionText });
  } catch (err) {
    console.error("Error en /api/space-planner:", err);
    res.status(500).json({
      error: "Error generando la propuesta con IA",
      suggestionText:
        "No se pudo generar la propuesta con IA en este momento. Por favor, intenta nuevamente.",
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Space Planner API escuchando en http://localhost:${PORT}`);
});
