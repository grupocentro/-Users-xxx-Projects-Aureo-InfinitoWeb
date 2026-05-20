import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installPinSessionListener } from "./lib/access-control";

// Limpia el PIN al detectar SIGNED_OUT — idempotente, una sola vez.
installPinSessionListener();

createRoot(document.getElementById("root")!).render(<App />);
