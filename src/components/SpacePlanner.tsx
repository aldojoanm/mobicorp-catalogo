import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import "./SpacePlanner.css";

const WHATSAPP_NUMBER = "59169780623";

// === URL DEL BACKEND DE IA ===
// En producción (Netlify) pon VITE_SPACE_PLANNER_URL con la URL completa de tu backend,
// por ejemplo: https://tu-backend.onrender.com/api/space-planner
const SPACE_PLANNER_URL =
  import.meta.env.VITE_SPACE_PLANNER_URL || "/api/space-planner";

// ====== TIPOS DEL BACKEND ======
type ApiProducto = {
  idProducto: number;
  skuInterno: string;
  nombre: string;
  categoria: string;
  marca: string;
  anchoCm: number;
  altoCm: number;
  caracteristicas: string[];
  acabados: string[];
  activo: boolean;
  fechaCreacion: string;
  imageUrl: string | null;
  imageUrls: string[] | null;
};

// ====== TIPOS PARA EL PLANNER ======
type PlannerProduct = {
  id: string;
  name: string;
  category: string;
  line: string;
  mainImage: string;
  images: string[];
};

type CartItemLite = {
  productId: string;
  qty: number;
};

type DetailedCartItem = {
  product: PlannerProduct;
  qty: number;
};

type PlannerResponse = {
  suggestionText: string;
};

// === NGROK + NORMALIZACIÓN DE IMÁGENES (igual que Designer) ===
const API_BASE = "https://fa9e157e59cc.ngrok-free.app";
const PRODUCTS_URL = `${API_BASE}/api/entities/productos/?format=json`;

function normalizeImageUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  let url = u.trim();
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (!url.startsWith("/")) {
    url = "/" + url;
  }

  return `${API_BASE}${url}`;
}

export function SpacePlanner() {
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [height, setHeight] = useState("");
  const [style, setStyle] = useState("moderno");

  const [seats, setSeats] = useState("");
  const [spaceType, setSpaceType] = useState("oficina_abierta");
  const [priority, setPriority] = useState("equilibrio");
  const [budget, setBudget] = useState("intermedio");
  const [extraNotes, setExtraNotes] = useState("");

  const [cartItems, setCartItems] = useState<CartItemLite[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");

  const [products, setProducts] = useState<PlannerProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [errorProducts, setErrorProducts] = useState<string | null>(null);

  // === CARGAR PRODUCTOS DESDE BACKEND (mismo patrón que Designer) ===
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        setErrorProducts(null);

        const resp = await fetch(PRODUCTS_URL, {
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "ngrok-skip-browser-warning": "1",
          },
        });

        const text = await resp.text();
        const trimmed = text.trim();

        if (!resp.ok) {
          console.error(
            "[SpacePlanner] Status no OK:",
            resp.status,
            resp.statusText,
            trimmed.slice(0, 200)
          );
          throw new Error("No pudimos cargar los productos");
        }

        if (!trimmed) {
          throw new Error("Respuesta vacía del backend");
        }

        if (trimmed.startsWith("<")) {
          console.warn(
            "[SpacePlanner] Backend respondió HTML, no JSON. Primeras líneas:\n",
            trimmed.slice(0, 300)
          );
          throw new Error(
            "La URL de catálogo está devolviendo HTML (probablemente la página de ngrok)."
          );
        }

        let data: ApiProducto[];
        try {
          data = JSON.parse(trimmed) as ApiProducto[];
        } catch (e) {
          console.error("[SpacePlanner] Error parseando JSON:", e);
          throw new Error("La respuesta del backend no es JSON válido.");
        }

        const mapped: PlannerProduct[] = data
          .filter((p) => p.activo !== false)
          .map((p) => {
            const fromArray: string[] =
              p.imageUrls && p.imageUrls.length > 0
                ? p.imageUrls
                    .map((u) => normalizeImageUrl(u))
                    .filter((x): x is string => !!x)
                : [];

            const single = normalizeImageUrl(p.imageUrl);

            const gallery =
              fromArray.length > 0
                ? fromArray
                : single
                ? [single]
                : [];

            const mainImage = gallery[0] ?? "";

            return {
              id: String(p.idProducto),
              name: p.nombre,
              category: p.categoria,
              line: p.marca,
              mainImage,
              images: gallery.length > 0 ? gallery : mainImage ? [mainImage] : [],
            };
          });

        setProducts(mapped);
      } catch (err) {
        console.error("[SpacePlanner] No se pudo cargar el catálogo:", err);
        setErrorProducts("No pudimos cargar el catálogo.");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, []);

  // Leer pre-carrito guardado por el Designer
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("mobicorp_cart");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as CartItemLite[];
      if (Array.isArray(parsed)) {
        setCartItems(parsed);
      }
    } catch (err) {
      console.error("Error parseando mobicorp_cart en SpacePlanner", err);
    }
  }, []);

  // Cart detallado con información de producto (usa products del backend)
  const detailedCart: DetailedCartItem[] = cartItems
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { product, qty: item.qty };
    })
    .filter((x): x is DetailedCartItem => x !== null);

  const handleGenerate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsGenerating(true);
      setSuggestionText("");

      // Texto compacto que el backend puede usar como hint
      const promptHintLines: string[] = [];

      promptHintLines.push(
        "Genera una recomendación muy breve y clara para amoblar este espacio de oficina."
      );
      promptHintLines.push("");
      promptHintLines.push("Datos del espacio:");
      promptHintLines.push(
        `- Dimensiones (m): ancho ${width || "?"}, largo ${
          length || "?"
        }, altura ${height || "?"}`
      );
      if (seats) promptHintLines.push(`- Puestos de trabajo: ${seats}`);
      promptHintLines.push(`- Tipo de espacio: ${spaceType}`);
      promptHintLines.push(`- Estilo: ${style}`);
      promptHintLines.push(`- Prioridad: ${priority}`);
      promptHintLines.push(`- Nivel de inversión: ${budget}`);

      if (detailedCart.length > 0) {
        promptHintLines.push("");
        promptHintLines.push("Modelos de referencia seleccionados:");
        detailedCart.forEach((ci) => {
          promptHintLines.push(
            `- ${ci.product.name} (${ci.product.category}, línea ${ci.product.line}) x${ci.qty}`
          );
        });
      }

      if (extraNotes) {
        promptHintLines.push("");
        promptHintLines.push("Notas adicionales del cliente:");
        promptHintLines.push(extraNotes);
      }

      promptHintLines.push("");
      promptHintLines.push(
        "Devuelve un texto muy corto, directo y fácil de leer, sin listas ni títulos."
      );

      const promptHint = promptHintLines.join("\n");

      const payload = {
        width,
        length,
        height,
        style,
        seats,
        spaceType,
        priority,
        budget,
        extraNotes,
        cart: detailedCart.map((ci) => ({
          productId: ci.product.id,
          name: ci.product.name,
          category: ci.product.category,
          line: ci.product.line,
          qty: ci.qty,
        })),
        promptHint,
      };

      const resp = await fetch(SPACE_PLANNER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error("Error en la API de IA");
      }

      const data: PlannerResponse = await resp.json();
      setSuggestionText(data.suggestionText || "");
    } catch (err) {
      console.error(err);
      alert("Hubo un problema generando la asesoría con IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendWhatsApp = () => {
    const lines: string[] = [];

    lines.push(
      "Hola 👋 Me gustaría asesoría para amoblar un espacio con Mobicorp."
    );
    lines.push("");

    lines.push("📐 Medidas aproximadas");
    lines.push(`• Ancho: ${width || "?"} m`);
    lines.push(`• Largo: ${length || "?"} m`);
    if (height) lines.push(`• Altura: ${height} m`);
    if (seats) lines.push(`• Puestos de trabajo: ${seats}`);
    lines.push("");

    lines.push("🏢 Detalles del espacio");
    lines.push(`• Tipo de espacio: ${spaceType || "sin especificar"}`);
    lines.push(`• Estilo: ${style}`);
    lines.push(`• Prioridad: ${priority}`);
    lines.push(`• Nivel de inversión: ${budget}`);
    lines.push("");

    if (detailedCart.length > 0) {
      lines.push("🪑 Modelos que me interesan");
      detailedCart.forEach((ci) => {
        lines.push(
          `• ${ci.product.name} (${ci.product.category}, línea ${ci.product.line}) x${ci.qty}`
        );
      });
      lines.push("");
    } else if (!loadingProducts && !errorProducts) {
      lines.push("🪑 Aún no elegí modelos. Necesito recomendaciones.");
      lines.push("");
    }

    if (extraNotes) {
      lines.push("📝 Notas adicionales");
      lines.push(extraNotes);
      lines.push("");
    }

    if (suggestionText) {
      lines.push("🧠 Resumen generado con IA (demo)");
      lines.push(suggestionText);
      lines.push("");
    }

    lines.push("¿Pueden ayudarme a definir la mejor propuesta?");

    const text = encodeURIComponent(lines.join("\n"));
    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    const url = isMobile
      ? `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`
      : `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${text}`;

    window.open(url, "_blank");
  };

  return (
    <section className="planner-section" id="planner-ia">
      <div className="planner-inner">
        <header className="planner-header">
          <div>
            <h2 className="planner-title">Asesor de espacios con IA</h2>
            <p className="planner-sub">
              Ingresa las medidas de tu espacio y el estilo que buscas. Si ya
              tienes un pre-pedido en el catálogo, la IA lo usará como base para
              sugerirte distribución y tipos de mobiliario.
            </p>
          </div>
          <span className="planner-badge">Asesoría IA</span>
        </header>

        <div className="planner-grid">
          {/* IZQUIERDA: formulario de asesoría */}
          <div className="planner-card">
            <form className="planner-form" onSubmit={handleGenerate}>
              <div className="planner-field">
                <label className="planner-label">Ancho (m)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="planner-input"
                  placeholder="Ej: 4.5"
                />
              </div>

              <div className="planner-field">
                <label className="planner-label">Largo (m)</label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="planner-input"
                  placeholder="Ej: 6"
                />
              </div>

              <div className="planner-field">
                <label className="planner-label">
                  Altura (m)
                  <span className="planner-hint"> (opcional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="planner-input"
                  placeholder="Ej: 2.5"
                />
              </div>

              <div className="planner-field">
                <label className="planner-label">
                  Nº de puestos de trabajo
                </label>
                <input
                  type="number"
                  min={1}
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  className="planner-input"
                  placeholder="Ej: 8"
                />
              </div>

              <div className="planner-field">
                <label className="planner-label">Tipo de espacio</label>
                <select
                  className="planner-select"
                  value={spaceType}
                  onChange={(e) => setSpaceType(e.target.value)}
                >
                  <option value="oficina_abierta">Oficina abierta</option>
                  <option value="sala_reuniones">Sala de reuniones</option>
                  <option value="recepcion">Recepción</option>
                  <option value="area_espera">Área de espera / lounge</option>
                  <option value="direccion_gerencia">
                    Dirección / gerencia
                  </option>
                </select>
              </div>

              <div className="planner-field">
                <label className="planner-label">Estilo que buscas</label>
                <select
                  className="planner-select"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="moderno">Moderno y minimalista</option>
                  <option value="ejecutivo">Ejecutivo / gerencial</option>
                  <option value="colaborativo">Colaborativo / cowork</option>
                  <option value="clasico">Clásico / formal</option>
                </select>
              </div>

              <div className="planner-field">
                <label className="planner-label">Prioridad principal</label>
                <select
                  className="planner-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="equilibrio">
                    Equilibrio comodidad / cantidad de puestos
                  </option>
                  <option value="comodidad">Máxima comodidad</option>
                  <option value="capacidad">
                    Mayor cantidad de puestos posibles
                  </option>
                </select>
              </div>

              <div className="planner-field">
                <label className="planner-label">Nivel de inversión</label>
                <select
                  className="planner-select"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  <option value="intermedio">Intermedio</option>
                  <option value="alto">Inversión alta</option>
                  <option value="economico">Económico</option>
                </select>
              </div>

              <div className="planner-field planner-field--full">
                <label className="planner-label">
                  Notas para el asesor
                  <span className="planner-hint">
                    {" "}
                    (uso del espacio, tipo de empresa, planes de crecimiento,
                    etc.)
                  </span>
                </label>
                <textarea
                  className="planner-input planner-textarea"
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Ej: Necesitamos área para visitas, una sala de reunión interna y dejar prevista expansión a 4 puestos más."
                />
              </div>

              <div className="planner-actions planner-field--full">
                <button
                  type="submit"
                  className="planner-btn planner-btn--primary"
                  disabled={isGenerating}
                >
                  {isGenerating
                    ? "Generando asesoría..."
                    : "Obtener asesoría con IA"}
                </button>
                <button
                  type="button"
                  className="planner-btn planner-btn--outline"
                  onClick={handleSendWhatsApp}
                >
                  Enviar resumen a WhatsApp
                </button>
              </div>
            </form>
          </div>

          {/* DERECHA: resumen + respuesta IA */}
          <div className="planner-card planner-card--preview">
            <div className="planner-preview-header">
              <div>
                <h3 className="planner-preview-title">
                  Resumen de tu selección
                </h3>
                <p className="planner-preview-sub">
                  Usamos tu pre-pedido del catálogo como referencia. Puedes
                  seguir ajustando modelos en el catálogo interactivo.
                </p>
              </div>
            </div>

            <div className="planner-summary">
              {loadingProducts ? (
                <div className="planner-preview-placeholder">
                  Cargando modelos seleccionados...
                </div>
              ) : errorProducts ? (
                <div className="planner-preview-placeholder">
                  {errorProducts}
                </div>
              ) : detailedCart.length > 0 ? (
                <ul className="planner-summary-list">
                  {detailedCart.map((item) => (
                    <li
                      key={item.product.id}
                      className="planner-summary-item"
                    >
                      <div>
                        <div className="planner-summary-item-name">
                          {item.product.name}
                        </div>
                        <div className="planner-summary-item-meta">
                          {item.product.category} · línea {item.product.line}
                        </div>
                      </div>
                      <div className="planner-summary-item-meta">
                        x{item.qty}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="planner-preview-placeholder">
                  Si aún no elegiste modelos en el catálogo, la IA puede
                  sugerir qué tipos de mobiliario se adaptan mejor a tu espacio.
                </div>
              )}
            </div>

            <div className="planner-preview-text">
              {suggestionText ? (
                <p>{suggestionText}</p>
              ) : (
                <p>
                  Completa los datos del espacio y haz clic en{" "}
                  <strong>&quot;Obtener asesoría con IA&quot;</strong> para ver
                  aquí una recomendación corta y clara de distribución y
                  mobiliario.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
