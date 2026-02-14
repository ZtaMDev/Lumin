import { hydrate } from "luminjs";
import App from "./LayoutDemo.lumin";

const root = document.getElementById("app");
if (root) {
  hydrate(root, App);
}
