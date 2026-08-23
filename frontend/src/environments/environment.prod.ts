// Overwritten at build time on Render (see render.yaml buildCommand) with the
// actual backend service URL. This placeholder is only used for local
// `ng build --configuration production` runs outside of Render.
export const environment = {
  production: true,
  apiBaseUrl: 'https://REPLACE_WITH_BACKEND_URL',
};
