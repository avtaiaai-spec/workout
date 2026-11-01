import { createRoot } from "react-dom/client";
import App from "./App";
import { AppUpdates } from "./AppUpdates";
import { Provider } from "./store";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <Provider>
    <AppUpdates>
      <App />
    </AppUpdates>
  </Provider>,
);
