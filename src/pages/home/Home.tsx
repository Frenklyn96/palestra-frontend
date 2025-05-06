import React, { useEffect } from 'react';
import { Typography, Box } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import './Home.css';
import RinnovaTable from '../../features/components/rinnovaTable/RinnovaTable';
import { getFotoHomeAsync } from '../../features/slice/settingsSlice';
import { AppDispatch, RootState } from '../../store/store';

const Home: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const fotoHome = useSelector((state: RootState) => state.settings.foto);

  useEffect(() => {
    dispatch(getFotoHomeAsync());
  }, [dispatch]);

  return (
    <div className="homeContainer">
      <Typography variant="h4" className="homeTitle" gutterBottom>
        Benvenuto nella tua palestra
      </Typography>

      {fotoHome && fotoHome.startsWith('data:') ? (
        <div
          className="homeImage"
          style={{ backgroundImage: `url(${fotoHome})` }}
        />
      ) : (
        <Typography variant="body1" className="imagePlaceholder">
          Carica un'immagine nel pannello delle impostazioni.
        </Typography>
      )}

      <Box sx={{ mt: 4 }}>
        <RinnovaTable />
      </Box>
    </div>
  );
};

export default Home;
