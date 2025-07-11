import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, CircularProgress, MenuItem, TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchClienti, deleteClienteAsync, updateClienteAsync, createClienteAsync, selectCliente,
} from '../../features/slice/clientiSlice';
import {createEntranceAsync} from '../../features/slice/entrancesSlice';
import { Cliente } from '../../features/class/Cliente';
import ClienteDialog from '../../features/components/clienteDialog/ClienteDialog';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../features/components/generic/ConfirmDialog';
import GenericSearchTable, { TableNames } from '../../features/components/generic/GenericSearchTable';
import StairsIcon from '@mui/icons-material/Stairs';

type ClienteKeys = keyof Cliente;

const ClientiPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {clienti,loading,totalCount} = useSelector((state: RootState) => state.clienti);
  const { results:filteredClienti, totalCount: totalCountGeneric} = useSelector((state: RootState) => state.generic);

  // const [filteredClienti, setFilteredClienti] = useState<Cliente[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | undefined>(undefined);
  const [clienteToDelete, setClienteToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderBy, setOrderBy] = useState<ClienteKeys>('numeroTessera');
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
  const userId = useSelector((state: RootState) => state.user.userId);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [pageGenericSearch, setPageGenericSearch] = useState(1);
  // const [pageSizeGenericSearch, setPageSizeGenericSearch] = useState(20);

  const [totalPages, setTotalPages] = useState(0);
  const [clientiToRender, setClientiToRender] = useState<Cliente[]>([]);

  const navigate = useNavigate();
 
  useEffect(() => {
    const fetchData = async () => {
      await dispatch(fetchClienti({
        page,
        pageSize,
        orderBy,
        ascending: orderDirection === 'asc',
        userId: userId!
      }));
    };
    fetchData();

  }, [page, pageSize, orderBy, orderDirection, pageGenericSearch]);
  
  useEffect(() => {
        
    setTotalPages(searchTerm
      ? Math.ceil(totalCountGeneric/ pageSize)
      : Math.ceil(totalCount / pageSize)
    );
  
    setClientiToRender(searchTerm
      ? filteredClienti
      : clienti
    );
  },[clienti,searchTerm,filteredClienti]);

  const handleRemoveCliente = () => {
    if (clienteToDelete !== null) {
      dispatch(deleteClienteAsync(clienteToDelete));
      setClienteToDelete(null);
    }
  };

  const handleAddCliente = (cliente: Cliente) => {
    dispatch(createClienteAsync(cliente));
  };

  const handleEditCliente = (cliente: Cliente) => {
    dispatch(updateClienteAsync(cliente));
  };

  const handleOpenAddDialog = () => {
    setIsEditMode(false);
    setClienteToEdit(undefined);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (cliente: Cliente) => {
    setIsEditMode(true);
    setClienteToEdit(cliente);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setClienteToEdit(undefined);
  };

  const handleSelectCliente = (cliente: Cliente) => {
    dispatch(selectCliente(cliente));
    navigate(`/clienti/${cliente.id}/transazioni`);
  };

  const handleOpenDeleteDialog = (clienteId: string) => {
    setClienteToDelete(clienteId);
  };

  const handleCloseDeleteDialog = () => {
    setClienteToDelete(null);
  };

  const handleRequestSort = (property: ClienteKeys) => {
    const isAsc = orderBy === property && orderDirection === 'asc';
    setOrderDirection(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

const handleScalaEntrances = async (cliente: Cliente) => {
  try {
    await dispatch(createEntranceAsync({
      dataOra: new Date(),
      clienteId: cliente.id,
      userId: userId!
    })).unwrap(); // ottieni direttamente il payload


    // Solo se è andata bene:
    setClientiToRender(prev =>
      prev.map(c =>
        c.id === cliente.id
          ? { ...c,scadenza:new Date(), ingressiResidui: (c.ingressiResidui || 0) - 1 }
          : c
      )
    );
  } catch (error) {
    console.error("Errore nel creare l'ingresso:", error);
    // opzionalmente: mostra notifica
  }
};


  return (
    <Box sx={{ padding: 2, position: 'relative', minHeight: '200px' }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 2,
              gap: '1rem',
            }}
          >
            <h1>Clienti</h1>
            <Box sx={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="contained" color="primary" onClick={handleOpenAddDialog}>
                Aggiungi Cliente
              </Button>
              <GenericSearchTable
                tableName={TableNames.CLIENTI}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                page={pageGenericSearch}
                pageSize={pageSize}
                orderBy={orderBy}
                orderDirection={orderDirection}
                userId={userId!}
              />
            </Box>
          </Box>
  
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Attivo</TableCell>
                  <TableCell onClick={() => handleRequestSort('numeroTessera')} style={{ cursor: 'pointer' }}>Tessera</TableCell>
                  <TableCell onClick={() => handleRequestSort('nome')} style={{ cursor: 'pointer' }}>Nome</TableCell>
                  <TableCell onClick={() => handleRequestSort('cognome')} style={{ cursor: 'pointer' }}>Cognome</TableCell>
                  <TableCell onClick={() => handleRequestSort('scadenza')} style={{ cursor: 'pointer' }}>Scadenza</TableCell>
                  <TableCell>Ingressi Residui</TableCell>
                  <TableCell>Azioni</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientiToRender && clientiToRender.length > 0 ? (
                  clientiToRender.map((cliente) => {
                    const scadenzaFormatted = cliente.scadenza
                      ? new Date(cliente.scadenza).toLocaleDateString('it-IT')
                      : '';
  
                    return (
                      <TableRow key={cliente.id}>
                        <TableCell>
                          {cliente.scadenza && (
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor:
                                  new Date(cliente.scadenza) > new Date() ? 'green' : 'red',
                                display: 'inline-block',
                                marginLeft: 1,
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>{cliente.numeroTessera}</TableCell>
                        <TableCell>{cliente.nome}</TableCell>
                        <TableCell>{cliente.cognome}</TableCell>
                        <TableCell>{cliente.ingressiResidui?"":scadenzaFormatted}</TableCell>
                        <TableCell>{cliente.ingressiResidui}</TableCell>
                        <TableCell>
                          <IconButton color="primary" onClick={() => handleOpenEditDialog(cliente)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton color="success" onClick={() => handleSelectCliente(cliente)}>
                            <AttachMoneyIcon />
                          </IconButton>    
                          <IconButton color="error" onClick={() => handleOpenDeleteDialog(cliente.id)}>
                            <DeleteIcon />
                          </IconButton>
                            {cliente.ingressiResidui != null && (
                              <IconButton
                                color="secondary"
                                disabled={cliente.ingressiResidui === 0}
                                onClick={() => handleScalaEntrances(cliente)}
                              >
                                <StairsIcon />
                              </IconButton>
                            )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      Nessun cliente trovato.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
  
          {/* Pagination controls */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
            <Box>
              {/* Pagina precedente */}
              <Button
                disabled={searchTerm ? pageGenericSearch <= 1 : page <= 1}
                onClick={() => searchTerm ? setPageGenericSearch(pageGenericSearch - 1) : setPage(page - 1)}
              >
                Pagina precedente
              </Button>
  
              {/* Pagina successiva */}
              <Button
                disabled={searchTerm ? pageGenericSearch >= totalPages : page >= totalPages}
                onClick={() => searchTerm ? setPageGenericSearch(pageGenericSearch + 1) : setPage(page + 1)}
              >
                Pagina successiva
              </Button>
            </Box>
  
            {/* Elementi per pagina */}
            <TextField
              select
              label="Elementi per pagina"
              value={pageSize}
              onChange={(e) => {
                const newPageSize = Number(e.target.value);
                if (searchTerm) {
                  setPageSize(newPageSize);
                  setPageGenericSearch(1);  // Reset della pagina a 1 ogni volta che cambia la dimensione della pagina
                } else {
                  setPageSize(newPageSize);
                  setPage(1);  // Reset della pagina a 1 ogni volta che cambia la dimensione della pagina
                }
              }}
              size="small"
            >
              {[10, 20, 30, 50].map((size) => (
                <MenuItem key={size} value={size}>{size}</MenuItem>
              ))}
            </TextField>
          </Box>
  
          {openDialog && (
            <ClienteDialog
              open={openDialog}
              onClose={handleCloseDialog}
              onSubmit={isEditMode ? handleEditCliente : handleAddCliente}
              isEditMode={isEditMode}
              clienteToEdit={clienteToEdit?.id}
            />
          )}

  
  
          <ConfirmDialog
            title="Conferma Eliminazione"
            open={clienteToDelete !== null}
            onConfirm={handleRemoveCliente}
            onClose={handleCloseDeleteDialog}
          />
        </>
      )}
    </Box>
  );
};

export default ClientiPage;
