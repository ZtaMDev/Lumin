declare module "vinxi" {
  export function createApp(config: { routers: unknown[] }): {
    dev(): Promise<void>;
    build(): Promise<void>;
  };
}
