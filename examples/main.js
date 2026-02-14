import { hydrate } from "@luminjs/runtime";
import App from "./LayoutDemo.lumin";

const root = document.getElementById("app");
if (root) {
  hydrate(root, App);
}
