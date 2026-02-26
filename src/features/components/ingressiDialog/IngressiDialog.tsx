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
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GenericSearchTable, { TableNames } from "../generic/GenericSearchTable";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../../store/store";
import { clearResults } from "../../slice/genericSlice";
import { useTranslation } from "react-i18next";
import "./IngressiDialog.css";
import { Entrance } from "../../class/Entrances";
import { createEntranceAsync } from "../../slice/entrancesSlice";
import { LocalizationProvider, DateTimePicker } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import it from "date-fns/locale/it";

interface IngressiDialogProps {
  open: boolean;
  clienteId: string;
  onClose: () => void;
}

const IngressiDialog: React.FC<IngressiDialogProps> = ({
  open,
  onClose,
  clienteId,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { results } = useSelector((state: RootState) => state.generic);
  const userId = useSelector((state: RootState) => state.user.userId);
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredClienti, setFilteredClienti] = useState<
    { id: string; nome: string; cognome: string; numeroTessera: string }[]
  >([]);
  const [entrance, setEntrance] = useState<Entrance>({
    id: "",
    dataOra: new Date(),
    clienteId: clienteId,
    clienteName: "",
    userId: userId!,
  });

  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setEntrance({
        id: "",
        dataOra: new Date(),
        clienteId: clienteId,
        clienteName: "",
        userId: userId!,
      });
    }
  }, [open]);

  useEffect(() => {
    setFilteredClienti(results);
    clearResults();
  }, [results]);

  const handleSelectCliente = (id: string, nome: string, cognome: string) => {
    setEntrance((prev) => ({
      ...prev,
      clienteId: id,
      clienteName: `${nome} ${cognome}`,
    }));
    setSearchTerm("");
    setFilteredClienti([]);
  };

  const handleSubmit = async () => {
    const { id, ...createEntrance } = entrance;
    await dispatch(createEntranceAsync(createEntrance));

    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("ingressi_dialog.title")}</DialogTitle>

      <DialogContent>
        {!entrance.clienteName ? (
          <Box className="form-row">
            {clienteId === "" && (
              <GenericSearchTable
                tableName={TableNames.CLIENTIRICERCATRANSAZIONE}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                page={null}
                pageSize={null}
                orderBy={null}
                orderDirection={"desc"}
                userId={userId!}
                placeholder={t("ingressi_dialog.search_placeholder")}
              />
            )}
            {searchTerm && filteredClienti.length > 0 && (
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
        ) : (
          <Box className="form-row">
            <TextField
              label={
                t("ingressi_dialog.selected_cliente") || "Cliente Selezionato"
              }
              value={`${entrance.clienteName}`}
              disabled
              fullWidth
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={() =>
                      setEntrance((prev) => ({
                        ...prev,
                        clienteId: "",
                        clienteName: "",
                      }))
                    }
                    size="small"
                  >
                    <CloseIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>
        )}
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
          <DateTimePicker
            label={t("ingressi_dialog.data_ora")}
            value={entrance.dataOra}
            onChange={(newValue) => {
              if (newValue) {
                setEntrance((prev) => ({ ...prev, dataOra: newValue }));
              }
            }}
            views={["year", "month", "day"]}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </LocalizationProvider>
      </DialogContent>

      <DialogActions className="dialog-actions">
        <Button onClick={onClose} color="secondary">
          {t("common.cancel") || "Annulla"}
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          disabled={!entrance.clienteId}
        >
          {t("common.apply") || "Applica"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default IngressiDialog;
