import { hydrate } from "@luminjs/runtime";
// You can switch this to other examples
//import App from "./StyledCounter.lumin";
import App from "./App.lumin";

const root = document.getElementById("app");
if (root) {
  hydrate(root, App);
}
