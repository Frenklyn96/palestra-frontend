import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress } from '@mui/material';
import { fetchClientiAbbondamentoScaduto } from '../../api/ClienteService';
import { Cliente } from '../../class/Cliente';
import DeleteIcon from '@mui/icons-material/Delete';
import CachedIcon from '@mui/icons-material/Cached';
import ConfirmDialog from '../generic/ConfirmDialog';
import { AppDispatch, RootState } from '../../../store/store';
import { useDispatch } from 'react-redux';
import { eliminaRinnovo, renewAbbonamentoAsync } from '../../slice/clientiSlice';
import ClienteDialog from '../clienteDialog/ClienteDialog';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

const RinnovaTable: React.FC = () => {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [clienteDaRinnovare, setClienteDaRinnovare] = useState<Cliente | null>(null); // ✅ nuovo stato
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
    // Aggiorna la lista localmente (rimuovi il cliente rinnovato)
    setClienti(prev => prev.filter(c => c.id !== clienteAggiornato.id));
    };
  }

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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">{t("rinnovaTable.title")}</Typography>
        {/* 
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          onClick={rinnovaTutti}
          disabled={loading}
        >
          {t("rinnovaTable.buttons.rinnova_tutti")}
        </Button> 
        */}
      </Box>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "200px",
          }}
        >
          <CircularProgress />
        </Box>
      ) : clienti.length === 0 ? (
        <Typography>{t("rinnovaTable.no_clients")}</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="tabella clienti">
            <TableHead>
              <TableRow>
                <TableCell>{t("rinnovaTable.table.nome")}</TableCell>
                <TableCell>{t("rinnovaTable.table.scadenza")}</TableCell>
                <TableCell align="center">{t("rinnovaTable.table.azioni")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clienti.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell>
                    {cliente.nome} {cliente.cognome}
                  </TableCell>
                  <TableCell>{formatDate(cliente.scadenza)}</TableCell>
                  <TableCell align="center">
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      startIcon={<CachedIcon />}
                      sx={{ marginRight: 1 }}
                      onClick={() => openRinnovoDialog(cliente)}
                    >
                      {t("rinnovaTable.buttons.rinnova")}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => openDeleteDialog(cliente)}
                    >
                      {t("rinnovaTable.buttons.elimina")}
                    </Button>
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