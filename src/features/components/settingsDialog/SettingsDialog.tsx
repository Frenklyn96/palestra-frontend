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
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
      <DialogTitle>
        {isEdit ? t("settings_dialog.title.edit") : t("settings_dialog.title.add")}
      </DialogTitle>

      <DialogContent>
        <div className="tariffa-form">
          {/* Nome Tariffa */}
          <div className="tariffa-field">
            <TextField
              fullWidth
              label={t("settings_dialog.labels.nome")}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              error={errorNome || !!errorCode}
              helperText={errorNome ? t("settings_dialog.helperText.nome_required") : ''}
            />
            {errorCode === 'TARIFFA_DUPLICATA' && (
              <Typography color="error" variant="body2" mt={0.5}>
                {t("settings_dialog.helperText.tariffa_duplicata")}
              </Typography>
            )}
          </div>

          {/* Durata e Unità */}
          <div className="durata-unita-row">
            <div className="tariffa-field">
              <TextField
                fullWidth
                type="number"
                label={t("settings_dialog.labels.durata")}
                value={durata}
                onChange={(e) => setDurata(Number(e.target.value))}
                inputProps={{ min: 1 }}
                error={errorDurata}
                helperText={errorDurata ? t("settings_dialog.helperText.durata_positive") : ''}
              />
            </div>

            <div className="tariffa-field">
              <FormControl fullWidth>
                <InputLabel>{t("settings_dialog.labels.unita")}</InputLabel>
                <Select
                  value={toCount ? UnitaDurata.Giorni : unitaDurata}
                  label={t("settings_dialog.labels.unita")}
                  onChange={(e) => setUnitaDurata(e.target.value as UnitaDurata)}
                  disabled={toCount}
                >
                  <MenuItem value={UnitaDurata.Giorni}>{t("settings_dialog.selectOptions.giorni")}</MenuItem>
                  <MenuItem value={UnitaDurata.Mesi}>{t("settings_dialog.selectOptions.mesi")}</MenuItem>
                  <MenuItem value={UnitaDurata.Anni}>{t("settings_dialog.selectOptions.anni")}</MenuItem>
                </Select>
              </FormControl>
            </div>
          </div>

          {/* Costo */}
          <div className="tariffa-field">
            <TextField
              fullWidth
              type="number"
              label={t("settings_dialog.labels.costo")}
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              inputProps={{ min: 0 }}
              error={errorCosto}
              helperText={errorCosto ? t("settings_dialog.helperText.costo_positive") : ''}
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
            label={t("settings_dialog.labels.toCount")}
          />
        </div>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit" className='button-general'>
          {t("settings_dialog.buttons.cancel")}
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" className='button-general'>
          {isEdit ? t("settings_dialog.buttons.save") : t("settings_dialog.buttons.add")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default TariffaFormDialog;
