import React, { useState, useEffect } from 'react';
import {
  TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, Button, Box, FormControl, InputLabel, Select, MenuItem,
  CircularProgress
} from '@mui/material';
import { Cliente } from '../../class/Cliente';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../../store/store';
import './ClienteDialog.css';
import { createClienteAsync, fetchClienteById, updateClienteAsync } from '../../slice/clientiSlice';
import { fetchTariffe } from '../../slice/settingsSlice';

interface ClienteDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (cliente: Cliente) => void;
  isEditMode: boolean;
  isRinnovoMode?: boolean;
  clienteToEdit?: string;
}

const ClienteDialog: React.FC<ClienteDialogProps> = ({
  open, onClose, isEditMode, isRinnovoMode = false, clienteToEdit, onSubmit
}) => {
  const [cliente, setCliente] = useState<Cliente>({
    id: '',
    nome: '',
    cognome: '',
    numeroTessera: '',
    scadenza: null,
    email: '',
    dataNascita: null,
    telefono: '',
    foto: '',
    tariffaNome: ''
  });

  const [tariffaSelezionata, setTariffaSelezionata] = useState('');
  const tariffe = useSelector((state: RootState) => state.settings.tariffe);
  const {selectedCliente}= useSelector((state:RootState)=> state.clienti);
  const [firstOpen,setFirstOpen] = useState(true); // ✅ Nuovo stato per gestire il primo open
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading]=useState <boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      // Prima carica le tariffe (una sola volta)
      await dispatch(fetchTariffe());
  
      // Carica i dati del cliente solo se siamo in modalità di modifica o rinnovo
      if ((isEditMode || isRinnovoMode) && clienteToEdit) {
        await dispatch(fetchClienteById(clienteToEdit));
        if (selectedCliente) {
          setCliente(selectedCliente);
          setTariffaSelezionata(selectedCliente.tariffaNome || '');
        }
      }   
    };
  
    fetchData(); // Chiamata alla funzione asincrona
    setLoading(false); 
  }, [isEditMode, isRinnovoMode, clienteToEdit]);
  
  


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCliente({ ...cliente, [name]: value });
  };

  const handleDateChange = (date: Date | null) => {
    setFirstOpen(false);
    setCliente({ ...cliente, scadenza: date });
  };

  const handleBirthDateChange = (date: Date | null) => {
    setCliente({ ...cliente, dataNascita: date });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCliente({ ...cliente, foto: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTariffaChange = (e: any) => {
    const nome = e.target.value;
    setTariffaSelezionata(nome);
    setFirstOpen (false)
    const selezionata = tariffe.find(t => t.nome === nome);

    if (selezionata) {
      const numero = selezionata.durata;
      const unita = selezionata.unitaDurata;

      const oggi = new Date();
      let scadenza = new Date(oggi);

      if (unita === 'Giorni') scadenza.setDate(oggi.getDate() + numero);
      if (unita === 'Mesi') scadenza.setMonth(oggi.getMonth() + numero);
      if (unita === 'Anni') scadenza.setFullYear(oggi.getFullYear() + numero);

      setCliente(prev => ({
        ...prev,
        scadenza,
        tariffaNome: selezionata.nome
      }));
    }
  };

  const calcolaScadenza = (dataBase: Date, nomeTariffa: string): Date => {
    const selezionata = tariffe.find(t => t.nome === nomeTariffa);
    if (!selezionata) return dataBase;
  
    const numero = selezionata.durata;
    const unita = selezionata.unitaDurata;
  
    const nuovaData = new Date(dataBase);
  
    if (unita === 'Giorni') nuovaData.setDate(nuovaData.getDate() + numero);
    if (unita === 'Mesi') nuovaData.setMonth(nuovaData.getMonth() + numero);
    if (unita === 'Anni') nuovaData.setFullYear(nuovaData.getFullYear() + numero);
  
    return nuovaData;
  };

  const isGiornaliera = () => {
    const selezionata = tariffe.find(t => t.nome === tariffaSelezionata);
    return selezionata?.durata === 1 && selezionata.unitaDurata === 'Giorni';
  };

  const handleFormSubmit = async () => {
    if (isEditMode && cliente.id) await dispatch(updateClienteAsync(cliente));
    else if (isRinnovoMode)  onSubmit(cliente);
    else{
      const { id, ...clienteSenzaId } = cliente;
      await dispatch(createClienteAsync(clienteSenzaId));
    }
    onClose();
  };

  const handleDialogClose = () => {
    setCliente({
      id: '',
      nome: '',
      cognome: '',
      numeroTessera: '',
      scadenza: null,
      email: '',
      dataNascita: null,
      telefono: '',
      foto: '',
      tariffaNome: ''
    });
    setTariffaSelezionata('');
    onClose();
  };

  return (

    <Dialog open={open} onClose={handleDialogClose} maxWidth="sm" fullWidth>
      {loading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    ) : (<>
      <DialogContent>
        <Box className="dialog-header">
          <DialogTitle>
              {isRinnovoMode ? 'Rinnova Abbonamento' : isEditMode ? 'Modifica Cliente' : 'Aggiungi Cliente'}
            </DialogTitle>
          
  
          <Box className="photo-upload" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Anteprima Foto */}
            {cliente.foto && (
              <Box sx={{ marginBottom: 1 }}>
                 <img
                  src={cliente.foto.startsWith('data:') ? cliente.foto : `${process.env.REACT_APP_API_URL}${cliente.foto}`}
                  alt="Anteprima Foto"
                  style={{ width: '100%', maxHeight: '200px', objectFit: 'cover' }}
                />
              </Box>
            )}
            {/* Bottone per caricare foto, posizionato sotto l'anteprima */}
            <Button variant="outlined" component="label" sx={{ marginTop: 1 }} disabled={isRinnovoMode}>
              Carica Foto
              <input type="file" hidden accept="image/*" onChange={handlePhotoUpload} />
            </Button>
          </Box>
        </Box>

        <TextField
          label="Nome"
          variant="outlined"
          fullWidth
          name="nome"
          value={cliente.nome}
          onChange={handleInputChange}
          sx={{ marginBottom: 2 }}
          disabled={isRinnovoMode}
        />
        <TextField
          label="Cognome"
          variant="outlined"
          fullWidth
          name="cognome"
          value={cliente.cognome}
          onChange={handleInputChange}
          sx={{ marginBottom: 2 }}
          disabled={isRinnovoMode}
        />
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          name="email"
          value={cliente.email}
          onChange={handleInputChange}
          sx={{ marginBottom: 2 }}
          disabled={isRinnovoMode}
        />

        <Box className="form-row" sx={{ marginBottom: 2 }}>
          <TextField
            label="Telefono"
            variant="outlined"
            name="telefono"
            value={cliente.telefono}
            onChange={handleInputChange}
            disabled={isRinnovoMode}
            sx={{ flex: 1, marginRight: 2 }}
          />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Data di Nascita"
              value={cliente.dataNascita ? new Date(cliente.dataNascita) : null}
              onChange={handleBirthDateChange}
              views={['year', 'month', 'day']}
              disabled={isRinnovoMode}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Box>

        <TextField
          label="Numero Tessera"
          variant="outlined"
          fullWidth
          name="numeroTessera"
          value={cliente.numeroTessera}
          onChange={handleInputChange}
          disabled={isRinnovoMode}
          sx={{ marginBottom: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2, marginBottom: 2 }}>
          <FormControl fullWidth>
            <InputLabel>Tariffa</InputLabel>
            <Select value={tariffaSelezionata} label="Tariffa" onChange={handleTariffaChange}>
              {tariffe.map((t, i) => (
                <MenuItem key={i} value={t.nome}>
                  {t.nome}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Scadenza Tessera"
              value={
                isRinnovoMode && firstOpen && cliente.scadenza && tariffaSelezionata
                  ? calcolaScadenza(new Date(),cliente.tariffaNome)
                  : cliente.scadenza ? new Date(cliente.scadenza) : null
              }              
              onChange={handleDateChange}
              disabled={isGiornaliera()}
              views={['year', 'month', 'day']}
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleDialogClose} color="secondary">Annulla</Button>
        <Button onClick={handleFormSubmit} color="primary">
          {isRinnovoMode ? 'Rinnova' : isEditMode ? 'Modifica' : 'Aggiungi'}
        </Button>
      </DialogActions>
    </>)}
    </Dialog>
  );
};

export default ClienteDialog;
