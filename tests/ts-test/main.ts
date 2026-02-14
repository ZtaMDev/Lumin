import { hydrate } from "lumix-js";
import App from "./src/App.lumix";

const root = document.getElementById("app")!;
hydrate(root, App);
