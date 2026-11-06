import React from "react";
import ReactDOM from "react-dom/client";
import { CommandPalette } from "./pages/CommandPalette";
import "./index.css";
import "./palette.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <CommandPalette />
  </React.StrictMode>,
);
