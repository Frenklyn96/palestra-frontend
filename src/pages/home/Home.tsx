import React, { useEffect, useState } from 'react';
import {
  Typography,
  Box,
  Paper,
  Avatar
} from '@mui/material';
import Grid from '@mui/material/Grid';
import HomeIcon from '@mui/icons-material/Home';
import {
  Person,
  People as PeopleIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import './Home.css'; // ✅ Importazione CSS corretta
import RinnovaTable from '../../features/components/rinnovaTable/RinnovaTable';
import ClienteDialog from '../../features/components/clienteDialog/ClienteDialog';
import { getFotoHomeAsync } from '../../features/slice/settingsSlice';
import {  getNumberMembersAsync } from '../../features/slice/clientiSlice';
import { createClienteAsync } from '../../features/slice/clientiSlice';
import { AppDispatch, RootState } from '../../store/store';
import { useTranslation } from 'react-i18next';
import { Cliente } from '../../features/class/Cliente';
import TransazioneDialog from '../../features/components/transazioneDialog/TransazioneDialog';

const Home: React.FC = () => {
  const {foto} = useSelector((state: RootState) => state.settings);
  const {numberMembers} = useSelector((state: RootState) => state.clienti);

  const { t } = useTranslation();

  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [openTransazioneDialog, setOpenTransazioneDialog] = useState(false);
  const dispatch =  useDispatch<AppDispatch>();

  const handleOpenTransazioneDialog = () => {
    setOpenTransazioneDialog(true);
  };

  const handleCloseTransazioneDialog = () => {
    setOpenTransazioneDialog(false);
  };

  useEffect(() => {
    dispatch(getFotoHomeAsync());
    dispatch(getNumberMembersAsync());
  }, [dispatch]);

  const handleOpenDialog = () => {
    setIsEditMode(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleAddCliente = (cliente: Cliente) => {
    dispatch(createClienteAsync(cliente));
    handleCloseDialog();
  };

  return (
    <Box className="homeContainer" sx={{ p: 3 }}>
      {/* Titolo */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <HomeIcon className='home-page-icon' sx={{ mr: 1 }} />
        <Typography variant="h5">{t('home.panoramica')}</Typography>
      </Box>

      {/* Layout a due colonne con altezza sincronizzata */}
      <Grid container spacing={3} alignItems="stretch">
        {/* Colonna sinistra */}
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          {/* Clienti tesserati */}
          <Paper elevation={3} sx={{ p: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <Person fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h6">{t('home.clientiTesserati')}</Typography>
              <Typography variant="h3">{numberMembers}</Typography>
            </Box>
          </Paper>

          {/* Azioni affiancate come card cliccabili */}
          <Grid container spacing={2}>
  {/* Aggiungi cliente */}
  <Grid
    size={{ xs: 12, md: 6 }}
    sx={{
      cursor: 'pointer',
      '&:hover': { boxShadow: 6 },
    }}
    onClick={handleOpenDialog}
  >
    <Paper
      elevation={3}
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        overflow: 'hidden',
      }}
    >
      <PeopleIcon className="clienti-page-icon" />

      <Box sx={{ whiteSpace: 'pre-line' }}>
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: '14px', sm: '15px', md: '16px' },
            lineHeight: 1.2,
          }}
        >
          {t('home.aggiungiCliente').replace(' ', '\n')}
        </Typography>
      </Box>
    </Paper>
  </Grid>

  {/* Aggiungi transazione */}
  <Grid
    size={{ xs: 12, md: 6 }}
    sx={{
      cursor: 'pointer',
      '&:hover': { boxShadow: 6 },
    }}
    onClick={handleOpenTransazioneDialog}
  >
    <Paper
      elevation={3}
      sx={{
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        overflow: 'hidden',
      }}
    >
      <PaymentIcon className="transazioni-page-icon" />

      <Box sx={{ whiteSpace: 'pre-line' }}>
        <Typography
          variant="h6"
          sx={{
            fontSize: { xs: '14px', sm: '15px', md: '16px' },
            lineHeight: 1.2,
          }}
        >
          {t('home.aggiungiTransazione').replace(' ', '\n')}
        </Typography>
      </Box>
    </Paper>
  </Grid>
</Grid>


        </Grid>

        {/* Colonna destra: immagine palestra */}
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{ display: 'flex', flexDirection: 'column' }}
        >
          <Paper elevation={3} sx={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}>
            {foto && foto.startsWith('data:') ? (
              <Box
                sx={{
                  backgroundImage: `url(${foto})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  height: '100%',
                  width: '100%',
                }}
              />
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                }}
              >
                <Typography variant="body1" className="imagePlaceholder">
                  {t('home.imagePlaceholder')}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Tabella rinnovo */}
      <Box sx={{ mt: 4 }}>
        <RinnovaTable />
      </Box>

      {/* Dialog aggiungi cliente */}
      <ClienteDialog
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleAddCliente}
        isEditMode={isEditMode}
        clienteToEdit={undefined}
      />

      {/* Dialog transazione */}
      <TransazioneDialog
        open={openTransazioneDialog}
        onClose={handleCloseTransazioneDialog}
        transazioneToEdit={null}
        isEditMode={false}
        clienteNome={null}
        clienteId={null}
        isFilterActive={false}
      />
    </Box>
  );
};

export default Home;
