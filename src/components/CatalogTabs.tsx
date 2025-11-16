import { useState } from "react";
import { Designer } from "./Designer";
import { SpacePlanner } from "./SpacePlanner";
import "./CatalogTabs.css";

export const CatalogTabs = () => {
  const [activeTab, setActiveTab] = useState<"catalog" | "planner">("catalog");

  return (
    <section className="tabs-section" id="catalogo-ai">
      <div className="tabs-header">
        <button
          type="button"
          className={
            "tabs-btn" + (activeTab === "catalog" ? " tabs-btn--active" : "")
          }
          onClick={() => setActiveTab("catalog")}
        >
          Catálogo de productos
        </button>
        <button
          type="button"
          className={
            "tabs-btn" + (activeTab === "planner" ? " tabs-btn--active" : "")
          }
          onClick={() => setActiveTab("planner")}
        >
          Diseña tu espacio con IA
        </button>
      </div>

      <div className="tabs-body">
        {activeTab === "catalog" ? <Designer /> : <SpacePlanner />}
      </div>
    </section>
  );
};
