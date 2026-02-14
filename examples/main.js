import { hydrate } from "lumin-js";
import App from "./LayoutDemo.lumin";

const root = document.getElementById("app");
if (root) {
  hydrate(root, App);
}
