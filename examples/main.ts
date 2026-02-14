import { hydrate } from "@luminjs/runtime";
import App from "./ControlFlowDemo.lumin";

const root = document.getElementById("app");
if (root) {
  hydrate(root, App);
}
