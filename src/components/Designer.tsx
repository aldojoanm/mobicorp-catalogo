import { useEffect, useState } from "react";
import {
  FaWhatsapp,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import "./Designer.css";

export type Category =
  | "Ejecutiva"
  | "Gerencial"
  | "Operativa"
  | "Lounge"
  | "Longarinas"
  | (string & {});

export type CatalogProduct = {
  id: string;
  name: string;
  category: Category;
  line: string;
  mainImage: string;
  images: string[];

  // extra info del backend
  widthCm?: number;
  heightCm?: number;
  features?: string[];
  finishes?: string[];
};

type Product = CatalogProduct;

type CartItem = {
  productId: string;
  qty: number;
};

type LightboxState =
  | {
      productId: string;
      index: number;
    }
  | null;

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

// 🔹 SOLO NGROK
const API_BASE = "https://fa9e157e59cc.ngrok-free.app";
const PRODUCTS_URL = `${API_BASE}/api/entities/productos/?format=json`;

// helper para convertir rutas relativas tipo "/static/..." a URL completa
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

// 🔹 NUEVO: helper para poner primera letra en mayúscula
function capitalizeFirst(text: string): string {
  if (!text) return text;
  const trimmedStart = text.trimStart();
  if (!trimmedStart) return text;
  const startIndex = text.length - trimmedStart.length;
  const firstChar = trimmedStart.charAt(0).toUpperCase();
  const rest = trimmedStart.slice(1);
  return text.slice(0, startIndex) + firstChar + rest;
}

const CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "Ejecutiva", label: "Ejecutiva" },
  { id: "Gerencial", label: "Gerencial" },
  { id: "Operativa", label: "Operativa" },
  { id: "Lounge", label: "Lounge" },
  { id: "Longarinas", label: "Longarinas" },
] as const;

const WHATSAPP_NUMBER = "59169780623";

export function Designer() {
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [imageIndexes, setImageIndexes] = useState<Record<string, number>>({});
  const [lightbox, setLightbox] = useState<LightboxState>(null);

  // 🔹 carrito móvil
  const [isCartOpenMobile, setIsCartOpenMobile] = useState(false);

  // === CARGAR PRODUCTOS DESDE BACKEND (SOLO NGROK) ===
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          "[Designer] Intentando cargar catálogo desde:",
          PRODUCTS_URL
        );

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
            "[Designer] Status no OK:",
            resp.status,
            resp.statusText,
            trimmed.slice(0, 200)
          );
          throw new Error(
            `No pudimos cargar los productos (HTTP ${resp.status})`
          );
        }

        if (!trimmed) {
          throw new Error("Respuesta vacía del backend");
        }

        if (trimmed.startsWith("<")) {
          console.warn(
            "[Designer] Backend respondió HTML, no JSON. Primeras líneas:\n",
            trimmed.slice(0, 300)
          );
          throw new Error(
            "La URL de catálogo está devolviendo HTML (probablemente la página de ngrok), no JSON. Verifica el túnel."
          );
        }

        let data: ApiProducto[];
        try {
          data = JSON.parse(trimmed) as ApiProducto[];
        } catch (e) {
          console.error("[Designer] No se pudo parsear JSON:", e);
          throw new Error("La respuesta del backend no es JSON válido.");
        }

        const mapped: Product[] = data
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
              category: p.categoria as Category,
              line: p.marca,
              mainImage,
              images: gallery.length > 0 ? gallery : mainImage ? [mainImage] : [],
              widthCm: p.anchoCm,
              heightCm: p.altoCm,
              features: p.caracteristicas,
              finishes: p.acabados,
            };
          });

        setProducts(mapped);
      } catch (err: any) {
        console.error("[Designer] No se pudo cargar el catálogo:", err);
        setError(
          err?.message ||
            "No pudimos cargar el catálogo. Verifica que el backend de Mobicorp esté corriendo detrás de ngrok."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // === CARRITO: cargar localStorage ===
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("mobicorp_cart");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as CartItem[];
      if (Array.isArray(parsed)) {
        setCart(parsed);
      }
    } catch (err) {
      console.error("Error leyendo mobicorp_cart desde localStorage", err);
    }
  }, []);

  // === CARRITO: guardar localStorage ===
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("mobicorp_cart", JSON.stringify(cart));
    } catch (err) {
      console.error("Error guardando mobicorp_cart en localStorage", err);
    }
  }, [cart]);

  // === inicializar índices de imágenes cuando haya productos ===
  useEffect(() => {
    if (!products.length) return;
    setImageIndexes((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const p of products) {
        if (next[p.id] == null) next[p.id] = 0;
      }
      return next;
    });
  }, [products]);

  // === autoplay de imágenes por producto ===
  useEffect(() => {
    if (!products.length) return;
    const id = window.setInterval(() => {
      setImageIndexes((prev) => {
        const next: Record<string, number> = { ...prev };
        for (const p of products) {
          const count = p.images.length || 1;
          const current = prev[p.id] ?? 0;
          next[p.id] = (current + 1) % count;
        }
        return next;
      });
    }, 3500);
    return () => window.clearInterval(id);
  }, [products]);

  // === derivados ===
  const filteredProducts =
    activeCategory === "todos"
      ? products
      : products.filter((p) => p.category === activeCategory);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { productId, qty: 1 }];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) {
        return prev.filter((i) => i.productId !== productId);
      }
      return prev.map((i) =>
        i.productId === productId ? { ...i, qty } : i
      );
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // === WhatsApp ===
  const handleSendWhatsApp = () => {
    if (cart.length === 0) return;
    if (typeof window === "undefined") return;

    const lines = cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return "";
        const dims =
          product.widthCm || product.heightCm
            ? ` · ${product.widthCm ?? "?"}×${product.heightCm ?? "?"} cm`
            : "";
        return `- ${item.qty} x ${product.name} [${product.category} · Línea ${
          product.line
        }${dims}]`;
      })
      .filter((l) => l.trim().length > 0);

    const text = `Resumen del pedido desde la web de Mobicorp:\n\n${lines.join(
      "\n"
    )}\n\nPor favor enviarme la cotización y opciones de configuración.`;

    const encoded = encodeURIComponent(text);
    const ua = navigator.userAgent || "";
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);

    let url: string;
    if (isMobile) {
      url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    } else {
      url = `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encoded}`;
    }

    window.open(url, "_blank");
  };

  const setProductImageIndex = (productId: string, index: number) => {
    setImageIndexes((prev) => ({
      ...prev,
      [productId]: index,
    }));
  };

  const openLightbox = (productId: string) => {
    const idx = imageIndexes[productId] ?? 0;
    setLightbox({ productId, index: idx });
  };

  const closeLightbox = () => setLightbox(null);

  const stepLightbox = (direction: 1 | -1) => {
    if (!lightbox) return;
    const product = products.find((p) => p.id === lightbox.productId);
    if (!product) return;
    const count = product.images.length || 1;
    const nextIndex = (lightbox.index + direction + count) % count;
    setLightbox({ ...lightbox, index: nextIndex });
    setProductImageIndex(product.id, nextIndex);
  };

  const handleLightboxDotClick = (index: number) => {
    if (!lightbox) return;
    setLightbox({ ...lightbox, index });
    setProductImageIndex(lightbox.productId, index);
  };

  return (
    <>
      <section className="designer" id="disena-tu-espacio">
        <div className="designer__inner">
          <header className="designer__header">
            <h2 className="designer__headline">Catálogo interactivo Mobicorp</h2>
            <p className="designer__sub">
              Elige la categoría, revisa las fotos de cada modelo (auto y
              manual) y arma tu pedido. Luego envíalo directo a WhatsApp.
            </p>
          </header>

          <div className="designer__grid designer__grid--catalog">
            {/* CATÁLOGO */}
            <div className="catalog">
              <div className="catalog__filters">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={
                      "catalog__filter-pill" +
                      (activeCategory === cat.id
                        ? " catalog__filter-pill--active"
                        : "")
                    }
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <p className="catalog__empty">Cargando productos...</p>
              ) : error ? (
                <p className="catalog__empty">{error}</p>
              ) : (
                <div className="catalog__grid">
                  {filteredProducts.map((product) => {
                    const idx = imageIndexes[product.id] ?? 0;
                    const count = product.images.length || 1;
                    const currentImage =
                      product.images[idx] ?? product.mainImage;

                    return (
                      <article key={product.id} className="catalog-card">
                        <button
                          type="button"
                          className="catalog-card__image-wrapper"
                          onClick={() => openLightbox(product.id)}
                        >
                          <img
                            key={currentImage}
                            src={currentImage}
                            alt={product.name}
                            className="catalog-card__image"
                          />
                          <div className="catalog-card__badge">
                            {product.category}
                          </div>

                          {count > 1 && (
                            <div className="catalog-card__dots">
                              {product.images.map((_, i) => (
                                <span
                                  key={i}
                                  className={
                                    "catalog-card__dot" +
                                    (i === idx
                                      ? " catalog-card__dot--active"
                                      : "")
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProductImageIndex(product.id, i);
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </button>

                        <div className="catalog-card__body">
                          <h3 className="catalog-card__name">
                            {product.name}
                          </h3>
                          <p className="catalog-card__line">
                            Línea <strong>{product.line}</strong>
                          </p>

                          {(product.widthCm || product.heightCm) && (
                            <p className="catalog-card__dims">
                              Dimensiones: {product.widthCm ?? "?"} ×{" "}
                              {product.heightCm ?? "?"} cm
                            </p>
                          )}

                          {product.features && product.features.length > 0 && (
                            <ul className="catalog-card__features">
                              {product.features.slice(0, 4).map((feat) => (
                                <li key={feat}>{capitalizeFirst(feat)}</li>
                              ))}
                            </ul>
                          )}

                          <div className="catalog-card__actions">
                            <button
                              type="button"
                              className="catalog-card__btn"
                              onClick={() => addToCart(product.id)}
                            >
                              Añadir al pedido
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {!filteredProducts.length && !loading && !error && (
                    <p className="catalog__empty">
                      No hay productos en esta categoría.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* CARRITO / RESUMEN - DESKTOP */}
            <aside className="cart cart--desktop">
              <div className="cart__header">
                <h3 className="cart__title">Resumen del pedido</h3>
                <span className="cart__chip">
                  {totalItems} {totalItems === 1 ? "producto" : "productos"}
                </span>
              </div>

              {cart.length === 0 ? (
                <p className="cart__empty">
                  Añade productos del catálogo para verlos aquí.
                </p>
              ) : (
                <ul className="cart__list">
                  {cart.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.productId
                    );
                    if (!product) return null;
                    return (
                      <li key={product.id} className="cart__item">
                        <div className="cart__item-left">
                          <img
                            src={product.mainImage}
                            alt={product.name}
                            className="cart__item-image"
                          />
                          <div className="cart__item-text">
                            <span className="cart__item-name">
                              {product.name}
                            </span>
                            <span className="cart__item-meta">
                              {product.category} · {product.line}
                            </span>
                          </div>
                        </div>

                        <div className="cart__qty">
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(product.id, item.qty - 1)
                            }
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="cart__qty-input"
                            min={1}
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (Number.isNaN(val) || val < 1) {
                                updateQty(product.id, 1);
                              } else {
                                updateQty(product.id, val);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(product.id, item.qty + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <button
                type="button"
                className="cart__whatsapp-btn"
                onClick={handleSendWhatsApp}
                disabled={cart.length === 0}
              >
                <FaWhatsapp className="cart__whatsapp-icon" />
                Enviar pedido por WhatsApp
              </button>

              <p className="cart__hint">
                Se abrirá una conversación con el número{" "}
                <strong>69780623</strong> con el detalle de tu pedido.
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* BOTÓN FLOTANTE CARRITO - MÓVIL */}
      <button
        type="button"
        className="cart-floating-toggle"
        onClick={() => setIsCartOpenMobile(true)}
        disabled={cart.length === 0}
      >
        <span className="cart-floating-toggle__label">Ver pedido</span>
        <span className="cart-floating-toggle__badge">{totalItems}</span>
      </button>

      {/* MODAL CARRITO - MÓVIL */}
      {isCartOpenMobile && (
        <div
          className="cart-modal-backdrop"
          onClick={() => setIsCartOpenMobile(false)}
        >
          <div
            className="cart-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cart-modal__header">
              <h3 className="cart-modal__title">Resumen del pedido</h3>
              <button
                type="button"
                className="cart-modal__close"
                onClick={() => setIsCartOpenMobile(false)}
              >
                <FaTimes />
              </button>
            </div>

            {cart.length === 0 ? (
              <p className="cart__empty">
                Añade productos del catálogo para verlos aquí.
              </p>
            ) : (
              <>
                <ul className="cart__list">
                  {cart.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.productId
                    );
                    if (!product) return null;
                    return (
                      <li key={product.id} className="cart__item">
                        <div className="cart__item-left">
                          <img
                            src={product.mainImage}
                            alt={product.name}
                            className="cart__item-image"
                          />
                          <div className="cart__item-text">
                            <span className="cart__item-name">
                              {product.name}
                            </span>
                            <span className="cart__item-meta">
                              {product.category} · {product.line}
                            </span>
                          </div>
                        </div>

                        <div className="cart__qty">
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(product.id, item.qty - 1)
                            }
                          >
                            −
                          </button>
                          <input
                            type="number"
                            className="cart__qty-input"
                            min={1}
                            value={item.qty}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (Number.isNaN(val) || val < 1) {
                                updateQty(product.id, 1);
                              } else {
                                updateQty(product.id, val);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateQty(product.id, item.qty + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <button
                  type="button"
                  className="cart__whatsapp-btn cart-modal__whatsapp-btn"
                  onClick={() => {
                    handleSendWhatsApp();
                    setIsCartOpenMobile(false);
                  }}
                  disabled={cart.length === 0}
                >
                  <FaWhatsapp className="cart__whatsapp-icon" />
                  Enviar pedido por WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="lightbox" onClick={closeLightbox}>
          <div
            className="lightbox__content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox__close"
              onClick={closeLightbox}
            >
              <FaTimes />
            </button>

            {(() => {
              const product = products.find(
                (p) => p.id === lightbox.productId
              );
              if (!product) return null;
              const count = product.images.length || 1;
              const currentImage =
                product.images[lightbox.index] ?? product.mainImage;

              return (
                <>
                  <div className="lightbox__image-wrapper">
                    <button
                      type="button"
                      className="lightbox__arrow lightbox__arrow--left"
                      onClick={() => stepLightbox(-1)}
                    >
                      <FaChevronLeft />
                    </button>

                    <img
                      src={currentImage}
                      alt={product.name}
                      className="lightbox__image"
                    />

                    <button
                      type="button"
                      className="lightbox__arrow lightbox__arrow--right"
                      onClick={() => stepLightbox(1)}
                    >
                      <FaChevronRight />
                    </button>
                  </div>

                  <div className="lightbox__info">
                    <div>
                      <h3 className="lightbox__name">{product.name}</h3>
                      <p className="lightbox__meta">
                        {product.category} · Línea {product.line}
                      </p>

                      {(product.widthCm || product.heightCm) && (
                        <p className="lightbox__dims">
                          {product.widthCm ?? "?"} ×{" "}
                          {product.heightCm ?? "?"} cm
                        </p>
                      )}
                    </div>

                    {product.features && product.features.length > 0 && (
                      <ul className="lightbox__features">
                        {product.features.map((feat) => (
                          <li key={feat}>{capitalizeFirst(feat)}</li>
                        ))}
                      </ul>
                    )}

                    {product.finishes && product.finishes.length > 0 && (
                      <p className="lightbox__finishes">
                        Acabados: {product.finishes.join(", ")}
                      </p>
                    )}

                    {count > 1 && (
                      <div className="lightbox__thumbs">
                        {product.images.map((img, i) => (
                          <button
                            key={img + i}
                            type="button"
                            className={
                              "lightbox__thumb" +
                              (i === lightbox.index
                                ? " lightbox__thumb--active"
                                : "")
                            }
                            onClick={() => handleLightboxDotClick(i)}
                          >
                            <img src={img} alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}
