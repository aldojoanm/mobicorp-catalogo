import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { HeroSlider } from "./components/HeroSlider";
import { CatalogTabs } from "./components/CatalogTabs";
import { Footer } from "./components/Footer";
import { FaPhoneAlt, FaWhatsapp } from "react-icons/fa";
import "./App.css";

type View = "home" | "catalog";

function pathToView(pathname: string): View {
  // quitar slashes al final
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/catalogo") return "catalog";
  return "home";
}

export default function App() {
  const [view, setView] = useState<View>(() =>
    typeof window !== "undefined" ? pathToView(window.location.pathname) : "home"
  );

  // Manejar back/forward del navegador
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const nextView = pathToView(window.location.pathname);
      setView(nextView);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const goHome = () => {
    setView("home");
    if (typeof window !== "undefined") {
      const current = window.location.pathname.replace(/\/+$/, "") || "/";
      if (current !== "/") {
        window.history.pushState({ view: "home" }, "", "/");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goCatalog = () => {
    setView("catalog");
    if (typeof window !== "undefined") {
      const current = window.location.pathname.replace(/\/+$/, "") || "/";
      if (current !== "/catalogo") {
        window.history.pushState({ view: "catalog" }, "", "/catalogo");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="page">
      <Header onGoHome={goHome} onGoCatalog={goCatalog} />

      {view === "home" && (
        <>
          {/* HERO / INICIO */}
          <section id="inicio">
            <HeroSlider />
          </section>

          {/* QUIENES SOMOS / CONTACTO / MAPA */}
          <section className="info">
            <div className="info__col">
              <h2>Quienes Somos</h2>
              <p>
                MOBICORP, empresa responsable del desarrollo y gestión de
                mobiliario para el mercado corporativo. Agregando en cada
                trabajo los mejores diseños, creatividad y tecnología para cada
                línea de producto. Trabajando de la mano con las mejores marcas
                de muebles y sillas en Latinoamérica.
              </p>
            </div>

            <div className="info__col">
              <h2>Contactos</h2>
              <p>
                Av. Alemana, entre 4to y 5to anillo
                <br />
                Esq. Calle Lucía Mercado
              </p>
              <p>
                <span style={{ color: "#ff0000" }}>info</span>@mobicorp.com.bo
              </p>

              <div className="info__phone">
                <div className="info__phone-icon">
                  <FaPhoneAlt />
                </div>
                <div className="info__phone-text">+(591) 3414144</div>
              </div>
              <a
                href="https://wa.me/59169780623"
                target="_blank"
                rel="noreferrer"
                className="info__phone"
              >
                <div className="info__phone-icon">
                  <FaWhatsapp />
                </div>
                <div className="info__phone-text">+(591) 69780623</div>
              </a>
            </div>

            <div className="info__col info__col--map">
              <div className="map">
                <iframe
                  title="Ubicación Mobicorp"
                  src="https://maps.google.com/maps?q=Premium%20Brands%2C%20Av.%20Alemana%20Esquina%20Calle%20Lucia%20Mercado%2C%20Santa%20Cruz%20de%20la%20Sierra&t=m&z=15&output=embed&iwloc=near"
                  loading="lazy"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {view === "catalog" && (
        <>
          {/* SOLO las pestañas: Catálogo + Diseña tu espacio con IA */}
          <CatalogTabs />
        </>
      )}

      <Footer />
    </div>
  );
}
