import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Paper, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, CircularProgress, Backdrop,
  Box
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { RootState } from '../../store/store';
import { addTariffaAsync, updateTariffaAsync, removeTariffaAsync, fetchTariffe, uploadFotoAsync, getFotoHomeAsync } from '../../features/slice/settingsSlice';
import { Tariffa } from '../../features/class/Tariffa';
import { AppDispatch } from '../../store/store';
import TariffaFormDialog from '../../features/components/settingsDialog/SettingsDialog';
import ConfirmDialog from '../../features/components/generic/ConfirmDialog';
import ImageUploader from '../../features/components/ImageUploader/ImageUploader';

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tariffe = useSelector((state: RootState) => state.settings.tariffe);
  const loading = useSelector((state: RootState) => state.settings.loading);
  const userId = useSelector((state: RootState) => state.user.userId);

  const foto = useSelector((state: RootState) => state.settings.foto);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTariffa, setSelectedTariffa] = useState<Tariffa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tariffaToDelete, setTariffaToDelete] = useState<Tariffa | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchTariffe(userId!));
    dispatch(getFotoHomeAsync());
  }, [dispatch]);

  const handleOpenAddDialog = () => {
    setSelectedTariffa(null);
    setErrorCode(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (tariffa: Tariffa) => {
    setSelectedTariffa(tariffa);
    setErrorCode(null);
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (tariffa: Tariffa) => {
    setTariffaToDelete(tariffa);
    setDeleteDialogOpen(true);
  };

  const handleSubmitTariffa = async (tariffa: Tariffa) => {
    const isEdit = !!selectedTariffa;
    const action = isEdit ? updateTariffaAsync : addTariffaAsync;
  
    // Chiamata per aggiungere o aggiornare la tariffa
    const resultAction = await dispatch(action({...tariffa,userId:userId!}));
  
    if (resultAction.meta.requestStatus === 'rejected') {
      const errorMessage = resultAction.payload as string;
      if (errorMessage === 'TARIFFA_DUPLICATA') {
        setErrorCode('TARIFFA_DUPLICATA');
      }
    } else {
      // Rimuovi eventuali errori e chiudi il dialog
      setErrorCode(null);
      setDialogOpen(false);
      
      // Ricarica le tariffe dopo l'operazione di aggiunta/aggiornamento
      dispatch(fetchTariffe(userId!));
    }
  };
  
  const handleDeleteConfirmed = async () => {
    if (tariffaToDelete) {
      // Esegui la rimozione della tariffa
      const resultAction = await dispatch(removeTariffaAsync(tariffaToDelete.id));
  
      if (resultAction.meta.requestStatus === 'rejected') {
        // Puoi gestire eventuali errori qui
        console.error('Errore durante l\'eliminazione della tariffa');
      } else {
        // Ricarica le tariffe dopo l'eliminazione
        dispatch(fetchTariffe(userId!));
      }
  
      // Chiudi il dialog di conferma eliminazione
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
    <Paper sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>Gestione Tariffe</Typography>

      <Button
        variant="contained"
        color="primary"
        startIcon={<AddIcon />}
        onClick={handleOpenAddDialog}
        sx={{ mb: 2 }}
      >
        Aggiungi Tariffa
      </Button>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome Tariffa</TableCell>
              <TableCell>Durata</TableCell>
              <TableCell>Costo</TableCell>
              <TableCell>Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tariffe.map((tariffa, index) => (
              <TableRow key={index}>
                <TableCell>{tariffa.nome}</TableCell>
                <TableCell>{tariffa.durata} {tariffa.unitaDurata}</TableCell>
                <TableCell>{tariffa.costo.toFixed(2)} €</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleOpenEditDialog(tariffa)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleOpenDeleteDialog(tariffa)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TariffaFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialData={selectedTariffa}
        onSubmit={handleSubmitTariffa}
        errorCode={errorCode}
        userId = {userId!}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirmed}
        message={`Sei sicuro di voler eliminare la tariffa "${tariffaToDelete?.nome}"?`}
        title="Conferma Eliminazione"
      />

      <Backdrop open={loading} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </Paper>
      <Paper sx={{ padding: 3, mt: 4 }}>
        <Typography variant="h4" gutterBottom textAlign="left">
          Immagine Home
        </Typography>

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            minHeight: 300,
            border: '1px dashed #ccc',
            borderRadius: 2,
            padding: 2,
            backgroundColor: '#fafafa'
          }}
        >
          <ImageUploader
            onFileSelect={(file) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                dispatch(uploadFotoAsync(base64String));
              };
              reader.readAsDataURL(file);
            }}
            initialImageUrl={foto || undefined}
          />
        </Box>
      </Paper>
    </>
  );
};

export default SettingsPage;
