import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

interface ImageUploaderProps {
  onFileSelect: (file: File) => void;
  initialImageUrl?: string;  // URL o base64
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, initialImageUrl }) => {
  const [preview, setPreview] = useState<string | null>(null);

  // Gestisce il caricamento iniziale dell'immagine, controllando se è base64 o URL
  useEffect(() => {
    if (initialImageUrl) {
      // Se è una stringa base64 (inizia con 'data:')
      if (initialImageUrl && initialImageUrl.startsWith('data:')) {
        setPreview(initialImageUrl);
      } else {
        // Se è un URL relativo, lo completiamo con il dominio base
        setPreview(`${process.env.REACT_APP_API_URL}${initialImageUrl}`);
      }
    }
  }, [initialImageUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Creiamo un URL per il file e lo impostiamo come anteprima
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);  // Anteprima per il file caricato
      onFileSelect(file);     // Passa il file caricato al parent
    }
  };

  return (
    <Box textAlign="center">
      <input
        accept="image/*"
        style={{ display: 'none' }}
        id="upload-image-input"
        type="file"
        onChange={handleFileChange}
      />
      <label htmlFor="upload-image-input">
        <Box
          sx={{
            border: '2px dashed #ccc',
            borderRadius: '8px',
            padding: 3,
            display: 'inline-block',
            cursor: 'pointer',
            width: 200,
            height: 200,
          }}
        >
          {preview ? (
            <Avatar
              src={preview}
              variant="rounded"
              sx={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <AddPhotoAlternateIcon fontSize="large" />
              <Typography variant="body2">Carica immagine</Typography>
            </Box>
          )}
        </Box>
      </label>
    </Box>
  );
};

export default ImageUploader;
