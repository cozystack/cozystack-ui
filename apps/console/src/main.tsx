import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"
import { K8sProvider } from "@cozystack/k8s-client"
import "./index.css"
import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <K8sProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </K8sProvider>
  </StrictMode>,
)
