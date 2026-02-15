declare module "*.lumix" {
  const component: any;
  export default component;
}

declare module "../.lumix/routes.mjs" {
  export const routes: Array<{ path: string; file: string }>;
}
