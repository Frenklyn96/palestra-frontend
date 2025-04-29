import React from 'react';
import { Typography, Box } from '@mui/material';
import './Home.css';
import RinnovaTable from '../../features/components/rinnovaTable/RinnovaTable'; // Assicurati che il path sia corretto

const Home: React.FC = () => {
  return (
    <div className="homeContainer">
      <Typography variant="h4" className="homeTitle" gutterBottom>
        Benvenuto nella tua palestra
      </Typography>
      <Box sx={{ mt: 4 }}>
        <RinnovaTable />
      </Box>
    </div>
  );
};

export default Home;
