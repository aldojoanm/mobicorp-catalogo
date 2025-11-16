import { useEffect, useState } from "react";
import "./HeroSlider.css";

const SLIDES = [
  "https://mobicorp.com.bo/wp-content/uploads/2017/06/slide002-1-scaled.jpg",
  "https://mobicorp.com.bo/wp-content/uploads/2017/06/slide001-1-scaled.jpg",
  "https://mobicorp.com.bo/wp-content/uploads/2017/06/slide006-scaled.jpg",
  "https://mobicorp.com.bo/wp-content/uploads/2017/06/slide005-scaled.jpg",
  "https://mobicorp.com.bo/wp-content/uploads/2017/06/slide003-scaled.jpg",
  "https://mobicorp.com.bo/wp-content/uploads/2017/06/slide004-scaled.jpg",
];

export function HeroSlider() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setSlide((s) => (s + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const nextSlide = () => setSlide((s) => (s + 1) % SLIDES.length);
  const prevSlide = () =>
    setSlide((s) => (s - 1 + SLIDES.length) % SLIDES.length);

  return (
    <section className="hero">
      <div className="hero__slider">
        <button className="hero__arrow hero__arrow--left" onClick={prevSlide}>
          ❮
        </button>

        <div className="hero__slide-wrapper">
          <img
            key={SLIDES[slide]}
            src={SLIDES[slide]}
            alt="Mobicorp slide"
            className="hero__slide-image"
          />
        </div>

        <button className="hero__arrow hero__arrow--right" onClick={nextSlide}>
          ❯
        </button>
      </div>
    </section>
  );
}
