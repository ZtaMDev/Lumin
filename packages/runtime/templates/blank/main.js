import { hydrate } from "luminjs";
import App from "./src/App.lumin";

const root = document.getElementById("app");
hydrate(root, App);
