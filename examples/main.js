import { hydrate } from "lumix-js";
import App from "./LayoutDemo.lumix";

const root = document.getElementById("app");
if (root) {
  hydrate(root, App);
}
