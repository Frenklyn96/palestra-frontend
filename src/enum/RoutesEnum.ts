enum BE_API {
  CLIENTI = "Clienti",
  SEARCH = "search",
  GENERIC = "GenericSearch",
  TRANSAZIONI = "Transazioni",
  TARIFFE = "Tariffe",
  UTILITY = "Utility",
  BASE_URL_ENTRATE = "Entrance",
  HEALTH = "Health",
}

const BASE_URL = import.meta.env.VITE_BE_URL_LOCAL + "/api/";

export const BASE_URL_TARIFFE = BASE_URL + BE_API.TARIFFE;
export const BASE_URL_TRANSAZIONI = BASE_URL + BE_API.TRANSAZIONI;
export const BASE_URL_CLIENTI = BASE_URL + BE_API.CLIENTI;
export const BASE_URL_GENERIC = BASE_URL + BE_API.GENERIC;
export const BASE_URL_UTILITY = BASE_URL + BE_API.UTILITY;
export const BASE_URL_ENTRATE = BASE_URL + BE_API.BASE_URL_ENTRATE;
export const BASE_URL_HEALTH = BASE_URL + BE_API.HEALTH;

export enum RoutesEnum {
  HOME = "/",
  CLIENTI = "/clienti",
  TRANSAZIONI = "/transazioni",
  SETTINGS = "/settings",
  INGRESSI = "/ingressi",
  SCANNER = "/scanner",
  OAUTH_CALLBACK = "/oauth-callback",
  SSO_CALLBACK = "/sso-callback",
}
