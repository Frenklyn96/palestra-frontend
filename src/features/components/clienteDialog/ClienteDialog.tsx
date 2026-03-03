import React, { useState, useEffect } from "react";
import {
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import { Cliente } from "../../class/Cliente";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../store/store";
import "./ClienteDialog.css";
import {
  createClienteAsync,
  fetchClienteById,
  removeSelectCliente,
  updateClienteAsync,
} from "../../slice/clientiSlice";
import { fetchTariffe } from "../../slice/settingsSlice";
import { it } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface ClienteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (cliente: Cliente) => void;
  isEditMode: boolean;
  isRinnovoMode?: boolean;
  clienteToEdit?: string;
}

const ClienteDialog: React.FC<ClienteDialogProps> = ({
  open,
  onClose,
  isEditMode,
  isRinnovoMode = false,
  clienteToEdit,
  onSubmit,
}) => {
  const userId = useSelector((state: RootState) => state.user.userId);

  const [cliente, setCliente] = useState<Cliente>({
    id: "",
    nome: "",
    cognome: "",
    numeroTessera: "",
    scadenza: null,
    email: "",
    dataNascita: null,
    telefono: "",
    foto: "",
    tariffaNome: "",
    note: "",
    userId: userId!,
  });

  const [tariffaSelezionata, setTariffaSelezionata] = useState("");
  const tariffe = useSelector((state: RootState) => state.settings.tariffe);
  const { selectedCliente, loadingSelectedCliente } = useSelector(
    (state: RootState) => state.clienti,
  );
  const [firstOpen, setFirstOpen] = useState(true); // ✅ Nuovo stato per gestire il primo open
  const [showErrors, setShowErrors] = useState(false);
  const { t } = useTranslation();

  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;

      setLoading(true); // <-- spostato qui
      await dispatch(fetchTariffe(userId!));

      if ((isEditMode || isRinnovoMode) && clienteToEdit) {
        await dispatch(fetchClienteById(clienteToEdit));
      }

      setLoading(false);
    };

    fetchData();
  }, [open, isEditMode, isRinnovoMode, clienteToEdit, dispatch]);

  useEffect(() => {
    if (selectedCliente) {
      setCliente(selectedCliente);
      setTariffaSelezionata(selectedCliente.tariffaNome || "");
    }
  }, [selectedCliente]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCliente({ ...cliente, [name]: value });
  };

  const handleDateChange = (date: Date | null) => {
    setFirstOpen(false);
    setCliente({ ...cliente, scadenza: date });
  };

  const handleBirthDateChange = (date: Date | null) => {
    setCliente({ ...cliente, dataNascita: date });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCliente({ ...cliente, foto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTariffaChange = (e: any) => {
    const nome = e.target.value;
    setTariffaSelezionata(nome);
    setFirstOpen(false);
    const selezionata = tariffe.find((t) => t.nome === nome);

    if (selezionata) {
      const numero = selezionata.durata;
      const unita = selezionata.unitaDurata;

      const oggi = new Date();
      let scadenza = new Date(oggi);

      if (unita === "Giorni") scadenza.setDate(oggi.getDate() + numero);
      if (unita === "Mesi") scadenza.setMonth(oggi.getMonth() + numero);
      if (unita === "Anni") scadenza.setFullYear(oggi.getFullYear() + numero);

      setCliente((prev) => ({
        ...prev,
        scadenza,
        tariffaNome: selezionata.nome,
      }));
    }
  };

  const calcolaScadenza = (dataBase: Date, nomeTariffa: string): Date => {
    const selezionata = tariffe.find((t) => t.nome === nomeTariffa);
    if (!selezionata) return dataBase;

    const numero = selezionata.durata;
    const unita = selezionata.unitaDurata;

    const nuovaData = new Date(dataBase);

    if (unita === "Giorni") nuovaData.setDate(nuovaData.getDate() + numero);
    if (unita === "Mesi") nuovaData.setMonth(nuovaData.getMonth() + numero);
    if (unita === "Anni")
      nuovaData.setFullYear(nuovaData.getFullYear() + numero);

    return nuovaData;
  };

  // const isGiornaliera = () => {
  //   const selezionata = tariffe.find(t => t.nome === tariffaSelezionata);
  //   return selezionata?.durata === 1 && selezionata.unitaDurata === 'Giorni';
  // };

  const handleFormSubmit = async () => {
    setShowErrors(true); // Mostra gli errori

    if (!cliente.nome.trim()) {
      return; // Blocca il submit se il campo è vuoto
    }

    if (isEditMode && cliente.id) {
      await dispatch(updateClienteAsync({ ...cliente, userId: userId! }));
    } else if (isRinnovoMode) {
      onSubmit({
        ...cliente,
        scadenza: firstOpen
          ? calcolaScadenza(new Date(), cliente.tariffaNome)
          : cliente.scadenza,
      });
    } else {
      const { id, ...clienteSenzaId } = cliente;
      await dispatch(
        createClienteAsync({ ...clienteSenzaId, userId: userId! }),
      );
    }

    dispatch(removeSelectCliente());
    onClose();
    setLoading(true);
    setShowErrors(false); // Reset per il prossimo utilizzo
  };

  const handleDialogClose = () => {
    setCliente({
      id: "",
      nome: "",
      cognome: "",
      numeroTessera: "",
      scadenza: null,
      email: "",
      dataNascita: null,
      telefono: "",
      foto: "",
      tariffaNome: "",
      note: "",
      userId: userId!,
    });
    setTariffaSelezionata("");
    dispatch(removeSelectCliente());
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      {loading || loadingSelectedCliente ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "400px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : tariffe.length === 0 ? (
        <DialogContent>
          <Box sx={{ textAlign: "center", padding: 4 }}>
            <DialogTitle>{t("cliente_dialog.title.warning")}</DialogTitle>
            <p>{t("cliente_dialog.errors.no_tariffa")}</p>
            <DialogActions sx={{ justifyContent: "center", marginTop: 2 }}>
              <Button
                onClick={handleDialogClose}
                className="button-general"
                color="primary"
                variant="contained"
              >
                {t("cliente_dialog.buttons.close")}
              </Button>
            </DialogActions>
          </Box>
        </DialogContent>
      ) : (
        <>
          <DialogContent>
            <Box className="dialog-header">
              <DialogTitle>
                {isRinnovoMode
                  ? t("cliente_dialog.title.renew")
                  : isEditMode
                    ? t("cliente_dialog.title.edit")
                    : t("cliente_dialog.title.add")}
              </DialogTitle>

              <Box
                className="photo-upload"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {/* Anteprima Foto */}
                {cliente.foto && (
                  <Box sx={{ marginBottom: 1 }}>
                    <img
                      src={
                        cliente.foto.startsWith("data:")
                          ? cliente.foto
                          : `${process.env.REACT_APP_API_URL}${cliente.foto}`
                      }
                      alt={t("cliente_dialog.photo.preview")}
                      style={{
                        width: "100%",
                        maxHeight: "200px",
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                )}
                {/* Bottone per caricare foto, posizionato sotto l'anteprima */}
                <Button
                  variant="outlined"
                  component="label"
                  sx={{ marginTop: 1 }}
                  disabled={isRinnovoMode}
                  className="button-general"
                >
                  {t("cliente_dialog.photo.upload")}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handlePhotoUpload}
                  />
                </Button>
              </Box>
            </Box>

            <TextField
              label={t("cliente_dialog.fields.nome")}
              variant="outlined"
              fullWidth
              name="nome"
              value={cliente.nome}
              onChange={handleInputChange}
              sx={{ marginBottom: 2 }}
              disabled={isRinnovoMode}
              required
              error={showErrors && !cliente.nome}
              helperText={
                showErrors && !cliente.nome
                  ? t("cliente_dialog.errors.required")
                  : ""
              }
            />

            <TextField
              label={t("cliente_dialog.fields.cognome")}
              variant="outlined"
              fullWidth
              name="cognome"
              value={cliente.cognome}
              onChange={handleInputChange}
              sx={{ marginBottom: 2 }}
              disabled={isRinnovoMode}
              required
              error={showErrors && !cliente.cognome}
              helperText={
                showErrors && !cliente.cognome
                  ? t("cliente_dialog.errors.required")
                  : ""
              }
            />
            <TextField
              label={t("cliente_dialog.fields.email")}
              variant="outlined"
              fullWidth
              name="email"
              value={cliente.email}
              onChange={handleInputChange}
              sx={{ marginBottom: 2 }}
              disabled={isRinnovoMode}
              error={
                showErrors &&
                cliente.email !== "" &&
                !cliente.email.includes("@")
              }
              helperText={
                showErrors &&
                cliente.email !== "" &&
                !cliente.email.includes("@")
                  ? t("cliente_dialog.errors.invalid_email")
                  : ""
              }
            />

            <Box className="form-row" sx={{ marginBottom: 2 }}>
              <TextField
                label={t("cliente_dialog.fields.telefono")}
                variant="outlined"
                name="telefono"
                value={cliente.telefono}
                onChange={handleInputChange}
                disabled={isRinnovoMode}
                sx={{ flex: 1, marginRight: 2 }}
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                onKeyDown={(e) => {
                  // Permetti solo numeri, backspace, delete, frecce, tab
                  const allowedKeys = [
                    "Backspace",
                    "Delete",
                    "ArrowLeft",
                    "ArrowRight",
                    "Tab",
                  ];
                  if (!/[0-9]/.test(e.key) && !allowedKeys.includes(e.key)) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  // Impedisci l’incolla se contiene caratteri non numerici
                  const paste = e.clipboardData.getData("text");
                  if (!/^\d+$/.test(paste)) {
                    e.preventDefault();
                  }
                }}
              />
              <LocalizationProvider
                dateAdapter={AdapterDateFns}
                adapterLocale={it}
              >
                <DateTimePicker
                  label={t("cliente_dialog.fields.data_nascita")}
                  value={
                    cliente.dataNascita ? new Date(cliente.dataNascita) : null
                  }
                  onChange={handleBirthDateChange}
                  views={["year", "month", "day"]}
                  disabled={isRinnovoMode}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Box>

            <TextField
              label={t("cliente_dialog.fields.numero_tessera")}
              variant="outlined"
              fullWidth
              name="numeroTessera"
              value={cliente.numeroTessera}
              onChange={handleInputChange}
              disabled={isRinnovoMode}
              sx={{ marginBottom: 2 }}
            />

            <TextField
              label={t("cliente_dialog.fields.note")}
              variant="outlined"
              fullWidth
              name="note"
              value={cliente.note}
              onChange={handleInputChange}
              multiline
              rows={3}
              sx={{ marginBottom: 2 }}
              disabled={isRinnovoMode}
            />

            <Box sx={{ display: "flex", gap: 2, marginBottom: 2 }}>
              <FormControl fullWidth error={showErrors && !tariffaSelezionata}>
                <InputLabel>{t("cliente_dialog.fields.tariffa")}</InputLabel>
                <Select
                  value={tariffaSelezionata}
                  label={t("cliente_dialog.fields.tariffa")}
                  onChange={handleTariffaChange}
                >
                  {tariffe.map((t, i) => (
                    <MenuItem key={i} value={t.nome}>
                      {t.nome}
                    </MenuItem>
                  ))}
                </Select>
                {showErrors && !tariffaSelezionata && (
                  <Box
                    sx={{
                      color: "error.main",
                      fontSize: "0.75rem",
                      marginTop: "4px",
                    }}
                  >
                    {t("cliente_dialog.errors.required")}
                  </Box>
                )}
              </FormControl>

              <LocalizationProvider
                dateAdapter={AdapterDateFns}
                adapterLocale={it}
              >
                <DateTimePicker
                  label={t("cliente_dialog.fields.scadenza")}
                  value={
                    isRinnovoMode &&
                    firstOpen &&
                    cliente.scadenza &&
                    tariffaSelezionata &&
                    !tariffe.find((t) => t.nome === tariffaSelezionata)?.toCount
                      ? calcolaScadenza(new Date(), cliente.tariffaNome)
                      : cliente.scadenza &&
                          !tariffe.find((t) => t.nome === tariffaSelezionata)
                            ?.toCount
                        ? new Date(cliente.scadenza)
                        : null
                  }
                  onChange={handleDateChange}
                  disabled={
                    tariffe.find((t) => t.nome === tariffaSelezionata)?.toCount
                  }
                  views={["year", "month", "day"]}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={handleDialogClose}
              className="button-general"
              color="secondary"
            >
              {t("cliente_dialog.buttons.cancel")}
            </Button>
            <Button
              onClick={handleFormSubmit}
              color="primary"
              className="button-general"
            >
              {isRinnovoMode
                ? t("cliente_dialog.buttons.submit.renew")
                : isEditMode
                  ? t("cliente_dialog.buttons.submit.edit")
                  : t("cliente_dialog.buttons.submit.add")}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default ClienteDialog;
