import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogActions, DialogContent, DialogTitle,
  TextField, Button, Box, List, ListItem, ListItemText
} from '@mui/material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Transazione } from '../../class/Transazione';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store/store';
import { createTransazioneAsync, updateTransazioneAsync } from '../../slice/transazioniSlice';
import './TransazioneDialog.css';
import GenericSearchTable, { TableNames } from '../generic/GenericSearchTable';
import { clearResults } from '../../slice/genericSlice';

interface TransazioneDialogProps {
  open: boolean;
  onClose: () => void;
  isEditMode: boolean;
  transazioneToEdit: Transazione | null;
  clienteId: string | null;
  clienteNome: string | null;
  isFilterActive: boolean;
}

const TransazioneDialog: React.FC<TransazioneDialogProps> = ({
  open,
  onClose,
  isEditMode,
  transazioneToEdit,
  clienteId,
  clienteNome,
  isFilterActive
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.user.userId);

  // Stato per la transazione
  const [transazione, setTransazione] = useState<Transazione>({
    id: '',
    dataTransazione: new Date(),
    metodoPagamento: '',
    causale: '',
    importo: 0,
    clienteId: clienteId || null,
    clienteNome: clienteNome || '',
    userId: userId!  // Nome completo cliente (nome + cognome)
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClienti, setFilteredClienti] = useState<{ id: string; nome: string; cognome: string; numeroTessera: string }[]>([]);
  const { results} = useSelector((state: RootState) => state.generic);

  // Gestione dei dati da visualizzare quando il dialogo si apre
  useEffect(() => {
    if (open) {
      if (isEditMode && transazioneToEdit) {
        // Se siamo in modalità modifica, carica i dati della transazione da modificare
        setTransazione(transazioneToEdit);
      } else {
        // Se siamo in modalità aggiungi, resetta il form a valori vuoti
        setTransazione({
          id: '',
          dataTransazione: new Date(),
          metodoPagamento: '',
          causale: '',
          importo: 0,
          clienteId: clienteId || null,
          clienteNome: clienteNome || '', 
          userId: userId!
        });
      }
    }
  }, [open, isEditMode, transazioneToEdit, clienteId, clienteNome]);

  useEffect(()=>{
    setFilteredClienti(results);
    clearResults();
  },[results] )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTransazione((prev) => ({
      ...prev,
      [name]: name === 'importo' ? parseFloat(value) : value,
    }));
  };

  const handleDateChange = (date: Date | null) => {
    setTransazione((prev) => ({ ...prev, dataTransazione: date ? date : new Date() }));
  };

  const handleSelectCliente = (id: string, nome: string, cognome: string) => {
    setTransazione((prev) => ({
      ...prev,
      clienteId: id,
      clienteNome: `${nome} ${cognome}`,  // Concatenare nome e cognome
    }));
    setSearchTerm('');
    setFilteredClienti([]);
  };

  const handleSubmit = async () => {
    if (isEditMode && transazione.id) {
      await dispatch(updateTransazioneAsync(transazione));
    } else {
      const { id, clienteNome, ...createTransazione } = transazione;
      await dispatch(createTransazioneAsync(createTransazione));
    }
    onClose(); // Chiusura del dialogo dopo il submit
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{isEditMode ? 'Modifica Transazione' : 'Aggiungi Transazione'}</DialogTitle>
      <DialogContent>
        <Box className="form-row">
          {/* Cliente */}
          {clienteNome || isFilterActive ? (
            <TextField
              label="Cliente Selezionato"
              value={transazione.clienteNome}
              disabled
              fullWidth
              className="text-field"
            />
          ) : (
            <Box className="form-row">
              <GenericSearchTable
                  tableName={TableNames.CLIENTIRICERCATRANSAZIONE}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm} 
                  page={null} 
                  pageSize={null} 
                  orderBy={null}
                  orderDirection={'desc'}
                  userId={userId!}
              />
              {searchTerm && filteredClienti && filteredClienti.length > 0 && (
                <List>
                  {filteredClienti.map((cliente) => (
                    <ListItem
                      key={cliente.id}
                      component="button"
                      onClick={() => handleSelectCliente(cliente.id, cliente.nome, cliente.cognome)}
                    >
                      <ListItemText primary={`${cliente.nome} ${cliente.cognome} - ${cliente.numeroTessera}`} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          )}

          <TextField
            label="Causale"
            name="causale"
            value={transazione.causale}
            onChange={handleChange}
            fullWidth
            className="text-field"
          />
          <TextField
            label="Metodo di Pagamento"
            name="metodoPagamento"
            value={transazione.metodoPagamento}
            onChange={handleChange}
            fullWidth
            className="text-field"
          />
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DateTimePicker
              label="Data Transazione"
              value={transazione.dataTransazione ? new Date(transazione.dataTransazione) : new Date()}
              onChange={handleDateChange}
              views={['year', 'month', 'day']}
            />
          </LocalizationProvider>
          <TextField
            label="Importo"
            name="importo"
            type="number"
            value={transazione.importo}
            onChange={handleChange}
            fullWidth
            className="text-field-importo"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">Annulla</Button>
        <Button onClick={handleSubmit} color="primary">
          {isEditMode ? 'Salva' : 'Aggiungi'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransazioneDialog;
