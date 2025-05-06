import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Button, Typography, Box, TextField, MenuItem, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { fetchTransazioni, deleteTransazioneAsync } from '../../features/slice/transazioniSlice';
import { Transazione } from '../../features/class/Transazione';
import TransazioneDialog from '../../features/components/transazioneDialog/TransazioneDialog';
import { useParams, useNavigate } from 'react-router-dom';
import GenericSearchTable, { TableNames } from '../../features/components/generic/GenericSearchTable';
import ConfirmDeleteDialog from '../../features/components/generic/ConfirmDeleteDialog';
import { clearResults, updateResult } from '../../features/slice/genericSlice';
import { fetchClienteById } from '../../features/slice/clientiSlice';

const TransazioniPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { transazioni, totalCount, loading } = useSelector((state: RootState) => state.transazioni);
  const { results: resultsTransazioniFiltered, totalCount: totalCountTransazioniFIltered,} = useSelector((state: RootState) => state.generic);
  const {selectedCliente}= useSelector((state:RootState)=>state.clienti);
  const [openDialog, setOpenDialog] = useState(false);
  const [transazioneToEdit, setTransazioneToEdit] = useState<Transazione | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  // const [filteredTransazioni, setFilteredTransazioni] = useState<Transazione[]>([]);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [transazioneToDelete, setTransazioneToDelete] = useState<Transazione | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [filterApplied, setFilterApplied] = useState(false);

  const [orderBy, setOrderBy] = useState<string>('DataTransazione');
  const [ascending, setAscending] = useState<boolean>(true);

  const [pageGenericSearch, setPageGenericSearch] = useState(1);
  const [transazioniToRender, setTransazioniToRender] = useState<Transazione[] | undefined>(undefined);
  const { clienteId } = useParams<{ clienteId: string }>();
  const [isFilterActive] =useState <boolean>(clienteId!==undefined);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (filterApplied || (!startDate && !endDate)) {
        clienteId&& !selectedCliente && await dispatch(fetchClienteById(clienteId));
        await dispatch(fetchTransazioni({
          startDate,
          endDate,
          page,
          pageSize,
          clienteId,
          orderBy,
          ascending
        }) as any);
        setFilterApplied(false);
      }
    };
    
    fetchData();
  }, [page, pageSize, startDate, endDate, filterApplied, orderBy, ascending, clienteId,pageGenericSearch]);

  const handleAddClick = () => {
    setTransazioneToEdit(null);
    setOpenDialog(true);
  };

  const handleEdit = (transazione: Transazione) => {
    setTransazioneToEdit(transazione);
    setOpenDialog(true);
  };

  const handleDeleteClick = (transazione: Transazione) => {
    setTransazioneToDelete(transazione);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (transazioneToDelete) {
      try {
        await dispatch(deleteTransazioneAsync(transazioneToDelete.id));
      } catch (error) {
        console.error('Errore durante la cancellazione della transazione', error);
      }
    }
    setOpenDeleteDialog(false);
    setTransazioneToDelete(null);
  };

  useEffect(()=>{
    setTransazioniToRender(
      searchTerm
        ? (resultsTransazioniFiltered as Transazione[])
        : (transazioni as Transazione[])
    );
    
  },[searchTerm,transazioni]);

  const handleOnClose = () => {
    setOpenDialog(false);
    dispatch(searchTerm?updateResult(transazioniToRender!):clearResults());  
  };
  
  
  const totalPages = Math.ceil((searchTerm? totalCountTransazioniFIltered: totalCount) / pageSize);
  const canGoToNextPage = (searchTerm? pageGenericSearch : page) < totalPages;
  const canGoToPreviousPage = (searchTerm? pageGenericSearch : page) > 1;

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && ascending;
    setOrderBy(column);
    setAscending(!isAsc);
  };

  return (
    <Paper sx={{ padding: 2, position: 'relative', minHeight: '200px' }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {isFilterActive && (
            <Button
              size="small"
              variant="text"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/clienti')}
              sx={{ marginBottom: 1 }}
            >
              Torna alla scheda Clienti
            </Button>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h4">
              Transazioni {isFilterActive && selectedCliente && <span style={{ fontSize: '1rem', color: 'gray' }}>{ selectedCliente.nome+' '+selectedCliente?.cognome }</span>}
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick}>
                Aggiungi
              </Button>

              <GenericSearchTable
                tableName={TableNames.TRANSAZIONI}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                page={pageGenericSearch}
                pageSize={pageSize}
                orderBy={orderBy}
                orderDirection={ascending ? 'asc' : 'desc'}
              />
            </Box>
          </Box>

          {/* Filtro date */}
          <Box sx={{ display: 'flex', gap: 2, marginY: 2 }}>
            <TextField
              label="Data Inizio"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate || ''}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <TextField
              label="Data Fine"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate || ''}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <Button
              variant="outlined"
              onClick={() => {
                searchTerm?setPageGenericSearch(1):setPage(1);
                setFilterApplied(true);
              }}
              disabled={!startDate && !endDate}
            >
              Applica filtro
            </Button>
            {(startDate || endDate) && (
              <Button
                variant="text"
                color="error"
                onClick={() => {
                  setStartDate(null);
                  setEndDate(null);
                  searchTerm?setPageGenericSearch(1):setPage(1);
                  setFilterApplied(true);
                }}
              >
                Rimuovi filtri
              </Button>
            )}
          </Box>

          {/* Tabella */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell onClick={() => handleSort('clienteNome')} sx={{ cursor: 'pointer' }}>Cliente</TableCell>
                  <TableCell onClick={() => handleSort('causale')} sx={{ cursor: 'pointer' }}>Causale</TableCell>
                  <TableCell onClick={() => handleSort('metodoPagamento')} sx={{ cursor: 'pointer' }}>Metodo di Pagamento</TableCell>
                  <TableCell onClick={() => handleSort('dataTransazione')} sx={{ cursor: 'pointer' }}>Data Transazione</TableCell>
                  <TableCell onClick={() => handleSort('importo')} sx={{ cursor: 'pointer' }}>Importo</TableCell>
                  <TableCell align="right">Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transazioniToRender && transazioniToRender.length > 0 ? (
                  transazioniToRender.map((transazione, index) => (
                    <TableRow key={index} hover onClick={() => handleEdit(transazione)} style={{ cursor: 'pointer' }}>
                      <TableCell>{transazione.clienteNome}</TableCell>
                      <TableCell>{transazione.causale}</TableCell>
                      <TableCell>{transazione.metodoPagamento}</TableCell>
                      <TableCell>{new Date(transazione.dataTransazione).toLocaleDateString('it-IT')}</TableCell>
                      <TableCell>{transazione.importo.toFixed(2)} €</TableCell>
                      <TableCell align="right">
                        <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(transazione); }}>
                          <DeleteIcon />
                        </IconButton>
                        <IconButton onClick={(e) => { e.stopPropagation(); handleEdit(transazione); }}>
                          <EditIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nessuna transazione trovata.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Box>
              <Button disabled={!canGoToPreviousPage} onClick={() => searchTerm? setPageGenericSearch(pageGenericSearch-1):setPage(page - 1)}>Pagina precedente</Button>
              <Button disabled={!canGoToNextPage} onClick={() => searchTerm?  setPageGenericSearch(pageGenericSearch+1):setPage(page + 1)}>Pagina successiva</Button>
            </Box>
            <TextField
              select
              label="Elementi per pagina"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                searchTerm?setPageGenericSearch(1):setPage(1);
              }}
              size="small"
            >
              {[10, 20, 30, 50].map((size) => (
                <MenuItem key={size} value={size}>{size}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Dialog Aggiunta / Modifica */}
          <TransazioneDialog
            open={openDialog}
            onClose={() => handleOnClose()}
            transazioneToEdit={transazioneToEdit}
            isEditMode={!!transazioneToEdit}
            clienteNome={isFilterActive && selectedCliente ? selectedCliente?.nome+' '+selectedCliente?.cognome : null}
            clienteId={clienteId || null}
            isFilterActive={isFilterActive}
          />

          {/* Dialog Conferma Elimina */}
          <ConfirmDeleteDialog
            open={openDeleteDialog}
            onClose={() => setOpenDeleteDialog(false)}
            onConfirm={handleDeleteConfirm}
          />
        </>
      )}
    </Paper>
  );
};

export default TransazioniPage;
