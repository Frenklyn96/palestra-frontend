import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Transazione } from "../../class/Transazione";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../../store/store";
import {
  createTransazioneAsync,
  updateTransazioneAsync,
} from "../../slice/transazioniSlice";
import "./TransazioneDialog.css";
import GenericSearchTable, { TableNames } from "../generic/GenericSearchTable";
import { clearResults } from "../../slice/genericSlice";
import { it } from "date-fns/locale";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";

interface TransazioneDialogProps {
  open: boolean;
  onClose: () => void;
  isEditMode: boolean;
  transazioneToEdit: Transazione | null;
  clienteId: string | null;
  clienteNome: string | null;
  isFilterActive: boolean;
}

const TransazioneDialog: React.FC<TransazioneDialogProps> = ({
  open,
  onClose,
  isEditMode,
  transazioneToEdit,
  clienteId,
  clienteNome,
  isFilterActive,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user.userId);

  // Stato per la transazione
  const [transazione, setTransazione] = useState<Transazione>({
    id: "",
    dataTransazione: new Date(),
    metodoPagamento: "",
    causale: "",
    importo: 0,
    clienteId: clienteId || null,
    clienteNome: clienteNome || "",
    userId: userId!, // Nome completo cliente (nome + cognome)
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClienti, setFilteredClienti] = useState<
    { id: string; nome: string; cognome: string; numeroTessera: string }[]
  >([]);
  const { results } = useSelector((state: RootState) => state.generic);
  const [showErrors, setShowErrors] = useState(false);
  const { t } = useTranslation();

  // Gestione dei dati da visualizzare quando il dialogo si apre
  useEffect(() => {
    if (open) {
      if (isEditMode && transazioneToEdit) {
        // Se siamo in modalità modifica, carica i dati della transazione da modificare
        setTransazione(transazioneToEdit);
      } else {
        // Se siamo in modalità aggiungi, resetta il form a valori vuoti
        setTransazione({
          id: "",
          dataTransazione: new Date(),
          metodoPagamento: "",
          causale: "",
          importo: 0,
          clienteId: clienteId || null,
          clienteNome: clienteNome || "",
          userId: userId!,
        });
      }
    }
  }, [open, isEditMode, transazioneToEdit, clienteId, clienteNome]);

  useEffect(() => {
    setFilteredClienti(results);
    clearResults();
  }, [results]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransazione((prev) => ({
      ...prev,
      [name]: name === "importo" ? parseFloat(value) : value,
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setTransazione((prev) => ({
      ...prev,
      dataTransazione: date ? date : new Date(),
    }));
  };

  const handleSelectCliente = (id: string, nome: string, cognome: string) => {
    setTransazione((prev) => ({
      ...prev,
      clienteId: id,
      clienteNome: `${nome} ${cognome}`, // Concatenare nome e cognome
    }));
    setSearchTerm("");
    setFilteredClienti([]);
  };

  const handleSubmit = async () => {
    setShowErrors(true);

    const isCausaleValid = !!transazione.causale?.trim();
    // const isMetodoPagamentoValid = !!transazione.metodoPagamento?.trim();
    // const isImportoValid = transazione.importo > 0;
    // const isClienteValid = !!transazione.clienteId;

    if (!isCausaleValid) {
      return; // blocca il submit
    }

    if (isEditMode && transazione.id) {
      await dispatch(updateTransazioneAsync(transazione));
    } else {
      const { id, clienteNome, ...createTransazione } = transazione;
      await dispatch(createTransazioneAsync(createTransazione));
    }

    setShowErrors(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {isEditMode
          ? t("trnsazioni_dialog.dialog.title.edit")
          : t("trnsazioni_dialog.dialog.title.add")}
      </DialogTitle>

      <DialogContent>
        <Box className="form-row">
          {/* Cliente */}
          {transazione.clienteNome && !isFilterActive ? (
            <TextField
              label={t("trnsazioni_dialog.dialog.fields.cliente_selezionato")}
              value={transazione.clienteNome}
              disabled
              fullWidth
              className="text-field"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() =>
                      setTransazione((prev) => ({
                        ...prev,
                        clienteId: null,
                        clienteNome: "",
                      }))
                    }
                    size="small"
                  >
                    <CloseIcon />
                  </IconButton>
                ),
              }}
            />
          ) : (
            <Box className="form-row">
              {!isFilterActive && (
                <GenericSearchTable
                  tableName={TableNames.CLIENTIRICERCATRANSAZIONE}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  page={null}
                  pageSize={null}
                  orderBy={null}
                  orderDirection={"desc"}
                  userId={userId!}
                  placeholder={t(
                    "trnsazioni_dialog.dialog.fields.search_placeholder",
                  )}
                />
              )}
              {searchTerm && filteredClienti && filteredClienti.length > 0 && (
                <List>
                  {filteredClienti.map((cliente) => (
                    <ListItem
                      key={cliente.id}
                      component="button"
                      onClick={() =>
                        handleSelectCliente(
                          cliente.id,
                          cliente.nome,
                          cliente.cognome,
                        )
                      }
                    >
                      <ListItemText
                        primary={`${cliente.nome} ${cliente.cognome} - ${cliente.numeroTessera}`}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          {/* Causale */}
          <TextField
            label={t("trnsazioni_dialog.dialog.fields.causale")}
            name="causale"
            value={transazione.causale}
            onChange={handleChange}
            fullWidth
            className="text-field"
            required
            error={showErrors && !transazione.causale?.trim()}
            helperText={
              showErrors && !transazione.causale?.trim()
                ? t("trnsazioni_dialog.dialog.errors.required")
                : ""
            }
          />

          {/* Metodo di pagamento */}
          <TextField
            label={t("trnsazioni_dialog.dialog.fields.metodo_pagamento")}
            name="metodoPagamento"
            value={transazione.metodoPagamento}
            onChange={handleChange}
            fullWidth
            className="text-field"
          />

          {/* Data transazione */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
            <DateTimePicker
              label={t("trnsazioni_dialog.dialog.fields.data_transazione")}
              value={
                transazione.dataTransazione
                  ? new Date(transazione.dataTransazione)
                  : new Date()
              }
              onChange={handleDateChange}
              views={["year", "month", "day"]}
            />
          </LocalizationProvider>

          {/* Importo */}
          <TextField
            label={t("trnsazioni_dialog.dialog.fields.importo")}
            name="importo"
            type="number"
            value={transazione.importo}
            onChange={handleChange}
            fullWidth
            className="text-field-importo"
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="secondary" className="button-general">
          {t("trnsazioni_dialog.dialog.buttons.cancel")}
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          className="button-general"
        >
          {isEditMode
            ? t("trnsazioni_dialog.dialog.buttons.submit_edit")
            : t("trnsazioni_dialog.dialog.buttons.submit_add")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransazioneDialog;
