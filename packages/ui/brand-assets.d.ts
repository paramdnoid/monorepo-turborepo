declare module "@repo/brand/logo" {
  /** Next.js may resolve a data object; Vite etc. often resolve a URL string. */
  const logo: string | { src: string; width: number; height: number };
  export default logo;
}
