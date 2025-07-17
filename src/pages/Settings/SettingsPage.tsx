import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Paper, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, IconButton, CircularProgress, Backdrop, Box,Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { RootState } from '../../store/store';
import {
  addTariffaAsync, updateTariffaAsync, removeTariffaAsync, fetchTariffe,
  uploadFotoAsync, getFotoHomeAsync
} from '../../features/slice/settingsSlice';
import { Tariffa } from '../../features/class/Tariffa';
import { AppDispatch } from '../../store/store';
import TariffaFormDialog from '../../features/components/settingsDialog/SettingsDialog';
import ConfirmDialog from '../../features/components/generic/ConfirmDialog';
import ImageUploader from '../../features/components/ImageUploader/ImageUploader';
import { useTranslation } from 'react-i18next';

import './SettingsPage.css';  // <-- Importa qui il CSS esterno
import SettingsIcon from '@mui/icons-material/Settings';

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
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(fetchTariffe(userId!));
    dispatch(getFotoHomeAsync());
  }, [dispatch, userId]);

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
    const resultAction = await dispatch(action({ ...tariffa, userId: userId! }));

    if (resultAction.meta.requestStatus === 'rejected') {
      const errorMessage = resultAction.payload as string;
      if (errorMessage === 'TARIFFA_DUPLICATA') {
        setErrorCode('TARIFFA_DUPLICATA');
      }
    } else {
      setErrorCode(null);
      setDialogOpen(false);
      dispatch(fetchTariffe(userId!));
    }
  };

  const handleDeleteConfirmed = async () => {
    if (tariffaToDelete) {
      const resultAction = await dispatch(removeTariffaAsync(tariffaToDelete.id));

      if (resultAction.meta.requestStatus === 'rejected') {
        console.error('Errore durante l\'eliminazione della tariffa');
      } else {
        dispatch(fetchTariffe(userId!));
      }
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Paper sx={{ padding: 2, position: 'relative', minHeight: '200px' }}>
        <>
        <Box className="header-container">
          <Typography variant="h4" gutterBottom>
            <SettingsIcon className='settings-page-icon' /> {t("settings_page.title")}
          </Typography>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            className='button-general'
          >
            {t("settings_page.buttons.aggiungi_tariffa")}
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t("settings_page.table.nome_tariffa")}</TableCell>
                <TableCell>{t("settings_page.table.durata")}</TableCell>
                <TableCell>{t("settings_page.table.costo")}</TableCell>
                <TableCell align="right">{t("settings_page.table.azioni")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tariffe.map((tariffa, index) => (
                <TableRow key={index}>
                  <TableCell>{tariffa.nome}</TableCell>
                  <TableCell>{tariffa.durata} {tariffa.unitaDurata}</TableCell>
                  <TableCell>{tariffa.costo.toFixed(2)} €</TableCell>
                  <TableCell align="right">
                    <Tooltip title={t('settings_page.actions.edit')}>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenEditDialog(tariffa)}
                        className="icon-neutral"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={t('settings_page.actions.delete')}>
                      <IconButton
                        color="error"
                        onClick={() => handleOpenDeleteDialog(tariffa)}
                        className="icon-neutral"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
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
          userId={userId!}
        />

        <ConfirmDialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onConfirm={handleDeleteConfirmed}
          title={t("settings_page.dialogs.conferma_eliminazione")}
          message={t("settings_page.dialogs.elimina_messaggio", { nome: tariffaToDelete?.nome || "" })}
        />

        <Backdrop open={loading} className="settings-backdrop">
          <CircularProgress color="inherit" />
        </Backdrop>
        </>
      </Paper>

      <Paper className="settings-paper mt-4">
        <Typography variant="h4" gutterBottom textAlign="left">
          {t("settings_page.upload.immagine_home")}
        </Typography>

        <Box className="image-uploader-container">
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
