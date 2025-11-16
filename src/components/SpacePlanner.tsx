import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import "./SpacePlanner.css";

const WHATSAPP_NUMBER = "59169780623";

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

const API_BASE = "https://fa9e157e59cc.ngrok-free.app";
const PRODUCTS_URL = `${API_BASE}/api/entities/productos/`;

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

  // === CARGAR PRODUCTOS DESDE BACKEND (igual que Designer) ===
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        setErrorProducts(null);

        const resp = await fetch(PRODUCTS_URL, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!resp.ok) throw new Error("No pudimos cargar los productos");

        const data = (await resp.json()) as ApiProducto[];

        const mapped: PlannerProduct[] = data
          .filter((p) => p.activo !== false)
          .map((p) => {
            const gallery =
              p.imageUrls && p.imageUrls.length > 0
                ? p.imageUrls
                : p.imageUrl
                ? [p.imageUrl]
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
        console.error(err);
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
      };

      const resp = await fetch("/api/space-planner", {
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
      "Hola, quiero asesoría para el diseño de un espacio con mobiliario Mobicorp 👋"
    );
    lines.push("");

    lines.push("📐 Dimensiones aproximadas:");
    lines.push(`- Ancho: ${width || "?"} m`);
    lines.push(`- Largo: ${length || "?"} m`);
    if (height) lines.push(`- Altura: ${height} m`);
    if (seats) lines.push(`- Nº de puestos: ${seats}`);
    lines.push("");

    lines.push("🏢 Tipo de espacio y estilo:");
    lines.push(`- Tipo de espacio: ${spaceType || "sin especificar"}`);
    lines.push(`- Estilo: ${style}`);
    lines.push(`- Prioridad: ${priority}`);
    lines.push(`- Nivel de inversión: ${budget}`);
    lines.push("");

    if (detailedCart.length > 0) {
      lines.push("🪑 Modelos de interés (pre-carrito):");
      detailedCart.forEach((ci) => {
        lines.push(
          `- ${ci.product.category} – ${ci.product.name} (línea ${ci.product.line}) x${ci.qty}`
        );
      });
      lines.push("");
    } else if (!loadingProducts && !errorProducts) {
      lines.push(
        "🪑 Aún no he seleccionado modelos, necesito recomendaciones."
      );
      lines.push("");
    }

    if (extraNotes) {
      lines.push("📝 Notas adicionales:");
      lines.push(extraNotes);
      lines.push("");
    }

    if (suggestionText) {
      lines.push("🧠 Recomendación generada por IA (demo):");
      lines.push(suggestionText);
      lines.push("");
    }

    lines.push("¿Pueden ayudarme a definir la mejor propuesta? 🙌");

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
              Completa los datos de tu oficina y, si ya armaste un pre-pedido en
              el catálogo interactivo, lo usaremos como base para recomendar
              distribución, tipos de sillas y zonas clave de tu ambiente.
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
                  Notas adicionales para el asesor
                  <span className="planner-hint">
                    {" "}
                    (uso del espacio, tipo de empresa, crecimiento futuro, etc.)
                  </span>
                </label>
                <textarea
                  className="planner-input planner-textarea"
                  value={extraNotes}
                  onChange={(e) => setExtraNotes(e.target.value)}
                  placeholder="Ej: Necesitamos espacio para visitas, una pequeña sala de reunión interna y dejar prevista expansión a 4 puestos más."
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
                  Usamos tu pre-carrito del catálogo como referencia para
                  ajustar la propuesta. Puedes seguir editando tu pedido en el
                  catálogo interactivo.
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
                  Aún no has agregado modelos desde el catálogo. La IA igual
                  puede sugerirte qué tipos de sillas (ejecutiva, operativa,
                  lounge, longarinas, etc.) se adaptan mejor a tu espacio.
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
                  aquí una recomendación detallada de distribución, tipos de
                  sillas y zonas clave para tu oficina.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
