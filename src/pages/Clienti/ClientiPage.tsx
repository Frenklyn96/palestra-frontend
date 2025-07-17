import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, IconButton, CircularProgress, MenuItem, TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PaymentIcon from '@mui/icons-material/Payment';
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
import LoginIcon  from '@mui/icons-material/Login';
import { useTranslation } from 'react-i18next';
import PeopleIcon from '@mui/icons-material/People';
import './ClientiPage.css';
import '../../styles/MainLayout.css'
import AddIcon from '@mui/icons-material/Add';
import { Paper } from '@mui/material';

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
  const { t } = useTranslation();

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
          ? { ...c,scadenza:c.ingressiResidui && c.ingressiResidui-1===0?new Date():c.scadenza, ingressiResidui: (c.ingressiResidui || 0) - 1 }
          : c
      )
    );
  } catch (error) {
    console.error("Errore nel creare l'ingresso:", error);
    // opzionalmente: mostra notifica
  }
};


  return (
  <Paper sx={{ padding: 2, position: 'relative', minHeight: '200px' }}>
    {loading ? (
      <Box className="loading-container">
        <CircularProgress />
      </Box>
    ) : (
      <>
        <Box className="clienti-page-header">
          <h1 className="clienti-page-title">
            <PeopleIcon className="clienti-page-icon" />
            {t('cliente_page.page_title')}
          </h1>

          <Box className="clienti-page-controls">    
            <GenericSearchTable
              tableName={TableNames.CLIENTI}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              page={pageGenericSearch}
              pageSize={pageSize}
              orderBy={orderBy}
              orderDirection={orderDirection}
              userId={userId!}
              placeholder={t('cliente_page.generic_search.search_placeholder')}
            />
             <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              className="button-general"
            >
              {t('cliente_page.buttons.add_client')}
            </Button>
          </Box>
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{t('cliente_page.table.headers.active')}</TableCell>
                <TableCell
                  onClick={() => handleRequestSort('numeroTessera')}
                  className="clienti-page-table-cell-sortable"
                >
                  {t('cliente_page.table.headers.card_number')}
                </TableCell>
                <TableCell
                  onClick={() => handleRequestSort('nome')}
                  className="clienti-page-table-cell-sortable"
                >
                  {t('cliente_page.table.headers.first_name')}
                </TableCell>
                <TableCell
                  onClick={() => handleRequestSort('cognome')}
                  className="clienti-page-table-cell-sortable"
                >
                  {t('cliente_page.table.headers.last_name')}
                </TableCell>
                <TableCell
                  onClick={() => handleRequestSort('scadenza')}
                  className="clienti-page-table-cell-sortable"
                >
                  {t('cliente_page.table.headers.expiration')}
                </TableCell>
                <TableCell>{t('cliente_page.table.headers.remaining_entries')}</TableCell>
                <TableCell align="right">{t('cliente_page.table.headers.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientiToRender && clientiToRender.length > 0 ? (
                clientiToRender.map((cliente) => {
                  const scadenzaFormatted = cliente.scadenza
                    ? new Date(cliente.scadenza).toLocaleDateString('it-IT')
                    : '';

                  return (
                    <TableRow 
                      key={cliente.id} 
                      hover
                    >
                      <TableCell>
                        {cliente.scadenza && (
                          <Box
                            className={`clienti-page-status-dot ${
                              new Date(cliente.scadenza) > new Date()
                                ? 'active'
                                : 'inactive'
                            }`}
                          />
                        )}
                      </TableCell>
                      <TableCell>{cliente.numeroTessera}</TableCell>
                      <TableCell>{cliente.nome}</TableCell>
                      <TableCell>{cliente.cognome}</TableCell>
                      <TableCell>{cliente.ingressiResidui ? '' : scadenzaFormatted}</TableCell>
                      <TableCell>{cliente.ingressiResidui}</TableCell>
                      <TableCell align="right">
                        {cliente.ingressiResidui != null && (
                          <Tooltip title={cliente.ingressiResidui === 0 ? t('cliente_page.actions.tooltip_enteries_zero'): t('cliente_page.actions.tooltip_enteries')}>
                            <span>
                              <IconButton
                                color="secondary"
                                disabled={cliente.ingressiResidui === 0}
                                onClick={() => handleScalaEntrances(cliente)}
                                className="icon-neutral"
                              >
                                <LoginIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title={t('cliente_page.actions.edit')}>
                          <IconButton onClick={() => handleOpenEditDialog(cliente)} className="icon-neutral">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={t('cliente_page.actions.transactions')}>
                          <IconButton onClick={() => handleSelectCliente(cliente)} className="icon-neutral">
                            <PaymentIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title={t('cliente_page.actions.delete')}>
                          <IconButton onClick={() => handleOpenDeleteDialog(cliente.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>  
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t('cliente_page.table.no_clients_found')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Box className="clienti-page-pagination-container">
          <Box className= "pagination-buttons">
            <Button
              disabled={searchTerm ? pageGenericSearch <= 1 : page <= 1}
              onClick={() =>
                searchTerm
                  ? setPageGenericSearch(pageGenericSearch - 1)
                  : setPage(page - 1)
              }
            >
              {t('cliente_page.buttons.previous_page')}
            </Button>

            <Button
              disabled={searchTerm ? pageGenericSearch >= totalPages : page >= totalPages}
              onClick={() =>
                searchTerm
                  ? setPageGenericSearch(pageGenericSearch + 1)
                  : setPage(page + 1)
              }
            >
              {t('cliente_page.buttons.next_page')}
            </Button>
          </Box>

          <TextField
            select
            label={t('cliente_page.pagination.items_per_page')}
            value={pageSize}
            onChange={(e) => {
              const newPageSize = Number(e.target.value);
              if (searchTerm) {
                setPageSize(newPageSize);
                setPageGenericSearch(1);
              } else {
                setPageSize(newPageSize);
                setPage(1);
              }
            }}
            size="small"
          >
            {[10, 20, 30, 50].map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
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
            title={t('cliente_page.dialog.confirm_delete_title')}
            open={clienteToDelete !== null}
            onConfirm={handleRemoveCliente}
            onClose={handleCloseDeleteDialog}
          />
        </>
      )}
   </Paper>
  );

};

export default ClientiPage;
