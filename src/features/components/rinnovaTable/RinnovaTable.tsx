import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress
} from '@mui/material';
import { fetchClientiAbbondamentoScaduto } from '../../api/ClienteService';
import { Cliente } from '../../class/Cliente';
import DeleteIcon from '@mui/icons-material/Delete';
import CachedIcon from '@mui/icons-material/Cached';
import ConfirmDialog from '../generic/ConfirmDialog';
import { AppDispatch, RootState } from '../../../store/store';
import { useDispatch, useSelector } from 'react-redux';
import { eliminaRinnovo, renewAbbonamentoAsync } from '../../slice/clientiSlice';
import ClienteDialog from '../clienteDialog/ClienteDialog';
import { useTranslation } from 'react-i18next';
import './rinnovaTable.css'; // ✅ Import del CSS

const RinnovaTable: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [clienteDaRinnovare, setClienteDaRinnovare] = useState<Cliente | null>(null);

  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user.userId);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchClienti = async () => {
      setLoading(true);
      try {
        const response = await fetchClientiAbbondamentoScaduto(userId!);
        setClienti(response);
      } catch (error) {
        console.error("Errore durante il recupero dei clienti:", error);
        setClienti([]);
      }
      setLoading(false);
    };

    fetchClienti();
  }, []);

  const openRinnovoDialog = (cliente: Cliente) => {
    setClienteDaRinnovare(cliente);
  };

  const closeRinnovoDialog = () => {
    setClienteDaRinnovare(null);
  };

  const handleRinnovoSubmit = (clienteAggiornato: Cliente) => {
    if (clienteAggiornato) {
      dispatch(renewAbbonamentoAsync({
        clienteId: clienteAggiornato.id,
        tariffaNome: clienteAggiornato.tariffaNome,
        scadenza: clienteAggiornato.scadenza,
        userId: userId!
      }));
      closeRinnovoDialog();
      setClienti(prev => prev.filter(c => c.id !== clienteAggiornato.id));
    }
  };

  const formatDate = (dateString: Date | null) => {
    if (dateString) {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        const giorno = date.getDate().toString().padStart(2, '0');
        const mese = (date.getMonth() + 1).toString().padStart(2, '0');
        const anno = date.getFullYear();
        return `${giorno}/${mese}/${anno}`;
      }
    }
    return 'Data non disponibile';
  };

  const openDeleteDialog = (cliente: Cliente) => {
    setClienteToDelete(cliente);
    setDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDialogOpen(false);
    setClienteToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (clienteToDelete) {
      const resultAction = await dispatch(eliminaRinnovo(clienteToDelete.id));
      if (eliminaRinnovo.fulfilled.match(resultAction)) {
        setClienti(prev => prev.filter(c => c.id !== clienteToDelete.id));
      }
      closeDeleteDialog();
    }
  };

  return (
    <Box>
      <Box className="rinnova-header">
        <Typography variant="h6">{t("rinnovaTable.title")}</Typography>
      </Box>

      {loading ? (
        <Box className="rinnova-loading">
          <CircularProgress />
        </Box>
      ) : clienti.length === 0 ? (
        <Typography>{t("rinnovaTable.no_clients")}</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table className="rinnova-table" aria-label="tabella clienti">
            <TableHead>
              <TableRow>
                <TableCell>{t("rinnovaTable.table.nome")}</TableCell>
                <TableCell>{t("rinnovaTable.table.scadenza")}</TableCell>
                <TableCell align="right">{t("rinnovaTable.table.azioni")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clienti.map((cliente) => (
                <TableRow key={cliente.id} hover>
                  <TableCell>
                    {cliente.nome} {cliente.cognome}
                  </TableCell>
                  <TableCell>{formatDate(cliente.scadenza)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title={t("rinnovaTable.buttons.rinnova")}>
                      <span>
                        <IconButton
                          onClick={() => openRinnovoDialog(cliente)}
                          className="button-general"
                        >
                          <CachedIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={t("rinnovaTable.buttons.elimina")}>
                      <span>
                        <IconButton
                          onClick={() => openDeleteDialog(cliente)}
                          className="button-general"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {clienteDaRinnovare && (
        <ClienteDialog
          open={!!clienteDaRinnovare}
          onClose={closeRinnovoDialog}
          onSubmit={handleRinnovoSubmit}
          isEditMode={false}
          isRinnovoMode={true}
          clienteToEdit={clienteDaRinnovare.id}
        />
      )}

      {clienteToDelete && (
        <ConfirmDialog
          open={dialogOpen}
          onClose={closeDeleteDialog}
          onConfirm={handleDeleteConfirm}
          title={t("rinnovaTable.confirmDialog.title")}
          message={t("rinnovaTable.confirmDialog.message", {
            nome: clienteToDelete.nome,
            cognome: clienteToDelete.cognome,
          })}
          confirmColor="primary"
        />
      )}
    </Box>
  );
};

export default RinnovaTable;
