import { hydrate } from "lumix-js";
import App from "./src/main.lumix";

const root = document.getElementById("app")!;
hydrate(root, App);
