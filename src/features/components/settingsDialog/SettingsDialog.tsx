import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Tariffa, UnitaDurata } from '../../class/Tariffa';
import './SettingsDialog.css'; // Importa il file CSS

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (tariffa: Tariffa) => void;
  initialData?: Tariffa | null;
  errorCode?: string | null;
  userId: string;
};

const TariffaFormDialog: React.FC<Props> = ({ open, onClose, onSubmit, initialData, errorCode, userId }) => {
  const isEdit = !!initialData;

  // Riferimento per memorizzare i valori originali
  const initialValuesRef = useRef<Tariffa | null>(null);

  const [nome, setNome] = useState('');
  const [durata, setDurata] = useState(1);
  const [unitaDurata, setUnitaDurata] = useState<UnitaDurata>(UnitaDurata.Giorni);
  const [costo, setCosto] = useState<string>(''); // Gestiamo il costo come stringa per permettere la cancellazione
  const [toCount, setToCount] = useState(false);

  // Stato per gestire gli errori sui campi
  const [errorNome, setErrorNome] = useState(false);
  const [errorDurata, setErrorDurata] = useState(false);
  const [errorCosto, setErrorCosto] = useState(false);

  // Effetto per aggiornare i dati iniziali quando cambiano (modalità edit)
  useEffect(() => {
    if (initialData) {
      initialValuesRef.current = initialData; // Salviamo i valori originali
      setNome(initialData.nome);
      setDurata(initialData.durata);
      setUnitaDurata(initialData.unitaDurata);
      setCosto(initialData.costo.toString());
      setToCount(initialData.toCount ?? false); // Convertiamo il costo in stringa per gestirlo come input
    } else {
      // Reset dei campi quando si passa alla modalità di aggiunta (senza initialData)
      initialValuesRef.current = null; // Non c'è valore iniziale
      setNome('');
      setDurata(1);
      setUnitaDurata(UnitaDurata.Giorni);
      setCosto('');
      setToCount(false);
    }
  }, [initialData]); // Solo quando initialData cambia

  const handleSubmit = () => {
    let isValid = true;

    // Verifica i campi e imposta errori
    if (!nome) {
      setErrorNome(true);
      isValid = false;
    } else {
      setErrorNome(false);
    }

    if (durata <= 0) {
      setErrorDurata(true);
      isValid = false;
    } else {
      setErrorDurata(false);
    }

    if (costo === '' || parseFloat(costo) <= 0) {
      setErrorCosto(true);
      isValid = false;
    } else {
      setErrorCosto(false);
    }

    if (!isValid) return; // Se ci sono errori, non inviamo il form

    const tariffa = {
      ...(initialData ?? { id: '' }),  // Aggiungi l'ID se non esiste
      nome,
      durata,
      unitaDurata,
      costo: parseFloat(costo),
      userId: userId!, // Convertiamo il costo da stringa a numero
      toCount
    };

    onSubmit(tariffa);

    // ✅ Se in modalità "aggiunta", resetta il form dopo submit
    if (!isEdit) {
      setNome('');
      setDurata(1);
      setUnitaDurata(UnitaDurata.Giorni);
      setCosto('');
    }
  };

  const handleClose = () => {
    onClose(); // Chiamato per chiudere il dialog
    if (isEdit) {
      // Se siamo in modalità Modifica, ripristiniamo i valori originali
      if (initialValuesRef.current) {
        setNome(initialValuesRef.current.nome);
        setDurata(initialValuesRef.current.durata);
        setUnitaDurata(initialValuesRef.current.unitaDurata);
        setCosto(initialValuesRef.current.costo.toString());
        setToCount(initialValuesRef.current.toCount ?? false);
      }
    } else {
      // Se siamo in modalità Aggiungi, resettiamo i valori
      setNome('');
      setDurata(1);
      setUnitaDurata(UnitaDurata.Giorni);
      setCosto('');
      setToCount(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? 'Modifica Tariffa' : 'Aggiungi Tariffa'}</DialogTitle>
      <DialogContent>
        <div className="tariffa-form">
          {/* Nome Tariffa */}
          <div className="tariffa-field">
            <TextField
              fullWidth
              label="Nome Tariffa"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errorNome || !!errorCode}
              helperText={errorNome ? "Il nome è obbligatorio" : ''}
            />
            {errorCode === 'TARIFFA_DUPLICATA' && (
              <Typography color="error" variant="body2" mt={0.5}>
                Una tariffa con questo nome esiste già.
              </Typography>
            )}
          </div>

          {/* Durata e Unità sulla stessa riga */}
          <div className="durata-unita-row">
            <div className="tariffa-field">
              <TextField
                fullWidth
                type="number"
                label="Durata"
                value={durata}
                onChange={(e) => setDurata(Number(e.target.value))}
                inputProps={{ min: 1 }}
                error={errorDurata}
                helperText={errorDurata ? "La durata deve essere maggiore di 0" : ''}
              />
            </div>
            <div className="tariffa-field">
              <FormControl fullWidth>
                <InputLabel>Unità</InputLabel>
                <Select
                  value={unitaDurata}
                  label="Unità"
                  onChange={(e) => setUnitaDurata(e.target.value as UnitaDurata)}
                >
                  <MenuItem value={UnitaDurata.Giorni}>Giorni</MenuItem>
                  <MenuItem value={UnitaDurata.Mesi}>Mesi</MenuItem>
                  <MenuItem value={UnitaDurata.Anni}>Anni</MenuItem>
                </Select>
              </FormControl>
            </div>
          </div>

          {/* Costo */}
          <div className="tariffa-field">
            <TextField
              fullWidth
              type="number"
              label="Costo (€)"
              value={costo}
              onChange={(e) => setCosto(e.target.value)} // Impostiamo il valore come stringa
              inputProps={{ min: 0 }}
              error={errorCosto}
              helperText={errorCosto ? "Il costo deve essere maggiore di 0" : ''}
            />
          </div>
        </div>
       <div className="tariffa-field">
        <FormControlLabel
          control={
            <Checkbox
              checked={toCount}
              onChange={(e) => setToCount(e.target.checked)}
            />
          }
          label="Da scalare"
        />
      </div>

      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Annulla
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {isEdit ? 'Salva' : 'Aggiungi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TariffaFormDialog;
