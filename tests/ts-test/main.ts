import { hydrate } from "lumin-js";
import App from "./src/App.lumin";

const root = document.getElementById("app")!;
hydrate(root, App);
