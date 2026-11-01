import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { PREVIEW } from "./api";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {PREVIEW ? <HashRouter><App /></HashRouter> : <BrowserRouter><App /></BrowserRouter>}
  </StrictMode>,
);
