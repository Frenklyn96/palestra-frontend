import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// I dati di traduzione per le lingue
const resources = {
  en: {
    translation: {
      "home": "Home",
      "clienti": "Clients",
      "transazioni": "Transactions",
      "settings": "Settings",
      "aggiungiCliente": "Add Client",
      "tessera": "Card Number",
      "nome": "First Name",
      "cognome": "Last Name",
      "scadenza": "Expiry Date",
      "elimina": "Delete",
      "clientiPageTitle": "Clients",
      "transazioniPageTitle": "Transactions",
      "addClientDialogTitle": "Add Client",
      "cancel": "Cancel",
      "add": "Add",
    }
  },
  it: {
    translation: {
      "home": "Home",
      "clienti": "Clienti",
      "transazioni": "Transazioni",
      "settings": "Impostazioni",
      "aggiungiCliente": "Aggiungi Cliente",
      "tessera": "Numero Tessera",
      "nome": "Nome",
      "cognome": "Cognome",
      "scadenza": "Data di Scadenza",
      "elimina": "Elimina",
      "clientiPageTitle": "Clienti",
      "transazioniPageTitle": "Transazioni",
      "addClientDialogTitle": "Aggiungi Cliente",
      "cancel": "Annulla",
      "add": "Aggiungi",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "it", // La lingua di default
    keySeparator: false, // Non usare il separatore di chiavi (utile per gli oggetti)
    interpolation: {
      escapeValue: false, // Non è necessario in React
    }
  });

export default i18n;
