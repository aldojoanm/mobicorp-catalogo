import { FaFacebook, FaInstagram, FaEnvelope } from "react-icons/fa";
import "./Header.css";

type HeaderProps = {
  onGoHome: () => void;
  onGoCatalog: () => void;
};

export function Header({ onGoHome, onGoCatalog }: HeaderProps) {
  return (
    <>
      {/* TOPBAR */}
      <header className="topbar">
        <div className="topbar__col topbar__col--logo">
          <button
            type="button"
            className="topbar__logo-btn"
            onClick={onGoHome}
          >
            <img
              src="https://mobicorp.com.bo/wp-content/uploads/2022/10/MC-logo-png.png"
              alt="Mobicorp logo"
              className="topbar__logo"
            />
          </button>
        </div>

        <div className="topbar__col topbar__col--social">
          <div className="social">
            <a
              href="https://www.facebook.com/mobicorpsolucionescorporativas"
              target="_blank"
              rel="noreferrer"
              className="social__icon"
            >
              <FaFacebook />
            </a>
            <a
              href="https://www.instagram.com/mobicorpbolivia/"
              target="_blank"
              rel="noreferrer"
              className="social__icon"
            >
              <FaInstagram />
            </a>
            <a
              href="mailto:ventascorporativas2@pb.com.bo"
              target="_blank"
              rel="noreferrer"
              className="social__icon"
            >
              <FaEnvelope />
            </a>
          </div>
        </div>

        <div className="topbar__col topbar__col--empty" />
      </header>

      {/* NAVBAR */}
      <nav className="nav">
        <div className="nav__inner">
          <ul className="nav__menu">
            <li>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onGoHome();
                }}
              >
                INICIO
              </a>
            </li>

            <li>
              <a
                href="/catalogo"
                onClick={(e) => {
                  e.preventDefault();
                  onGoCatalog();
                }}
              >
                CATÁLOGO
              </a>
            </li>

            <li>
              <a href="https://mobicorp.com.bo/ofertas/">OFERTAS</a>
            </li>
            <li>
              <a href="https://mobicorp.com.bo/contacto/">CONTACTO</a>
            </li>
            <li>
              <a href="https://mobicorp.com.bo/ofertas/">QUIENES SOMOS</a>
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
