import React, { useEffect, useState } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, Button, Typography, Box, TextField, MenuItem, CircularProgress,Tooltip
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
import ConfirmDialog from '../../features/components/generic/ConfirmDialog';
import { clearResults, updateResult } from '../../features/slice/genericSlice';
import { fetchClienteById } from '../../features/slice/clientiSlice';
import { useTranslation } from 'react-i18next';
import './TransazioniPage.css';
import PaymentIcon from '@mui/icons-material/Payment';
import ResponsiveDateTimeRangePicker from '../../features/components/DatePickerWithExternButton/ResponsiveDateTimeRangePicker';

const TransazioniPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { transazioni, totalCount, loading } = useSelector((state: RootState) => state.transazioni);
  const userId = useSelector((state: RootState) => state.user.userId);

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
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filterApplied, setFilterApplied] = useState(false);

  const [orderBy, setOrderBy] = useState<string>('DataTransazione');
  const [ascending, setAscending] = useState<boolean>(true);

  const [pageGenericSearch, setPageGenericSearch] = useState(1);
  const [transazioniToRender, setTransazioniToRender] = useState<Transazione[] | undefined>(undefined);
  const { clienteId } = useParams<{ clienteId: string }>();
  const isFilterActive = !!clienteId;
  const navigate = useNavigate();
  const { t } = useTranslation();

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
          ascending,
          userId: userId!
        }) as any);
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
    
  },[searchTerm,transazioni,resultsTransazioniFiltered]);

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
      <Box className="loading-container">
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
            className="transazioni-back-button"
          >
            {t('transazioni_page.buttons.torna_clienti')}
          </Button>
        )}

        <Box className="transazioni-header">
          <Typography variant="h4" className="transazioni-title">
            <PaymentIcon className="transazioni-page-icon" />{t('transazioni_page.table.title')}{' '}
            {isFilterActive && selectedCliente && (
              <span className="transazioni-selected-cliente">
                {selectedCliente.nome + ' ' + selectedCliente?.cognome}
              </span>
            )}
          </Typography>

          <Box className="transazioni-actions">
            

            <GenericSearchTable
              tableName={TableNames.TRANSAZIONI}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              page={pageGenericSearch}
              pageSize={pageSize}
              orderBy={orderBy}
              orderDirection={ascending ? 'asc' : 'desc'}
              userId={userId!}
              placeholder={t('transazioni_page.generic_search.search_placeholder')}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddClick} className='button-general'>
              {t('transazioni_page.buttons.aggiungi')}
            </Button>
          </Box>
        </Box>

        {/* Filtro date */}
        <Box className="transazioni-filtro-date">
         <ResponsiveDateTimeRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            searchTerm={searchTerm}
            setPageGenericSearch={setPageGenericSearch}
            setPage={setPage}
            setFilterApplied={setFilterApplied}
            t={t}
          />
        </Box>

        {/* Tabella */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell onClick={() => handleSort('clienteNome')} className="sortable-cell">
                  {t('transazioni_page.table.cliente')}
                </TableCell>
                <TableCell onClick={() => handleSort('causale')} className="sortable-cell">
                  {t('transazioni_page.table.causale')}
                </TableCell>
                <TableCell onClick={() => handleSort('metodoPagamento')} className="sortable-cell">
                  {t('transazioni_page.table.metodo_pagamento')}
                </TableCell>
                <TableCell onClick={() => handleSort('dataTransazione')} className="sortable-cell">
                  {t('transazioni_page.table.data_transazione')}
                </TableCell>
                <TableCell onClick={() => handleSort('importo')} className="sortable-cell">
                  {t('transazioni_page.table.importo')}
                </TableCell>
                <TableCell align="right">
                  {t('transazioni_page.table.azioni')}
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transazioniToRender && transazioniToRender.length > 0 ? (
                transazioniToRender.map((transazione, index) => (
                  <TableRow
                    key={index}
                    hover
                  >
                    <TableCell>{transazione.clienteNome}</TableCell>
                    <TableCell>{transazione.causale}</TableCell>
                    <TableCell>{transazione.metodoPagamento}</TableCell>
                    <TableCell>{new Date(transazione.dataTransazione).toLocaleDateString('it-IT')}</TableCell>
                    <TableCell>{transazione.importo.toFixed(2)} €</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t('transazioni_page.actions.edit')}>
                        <IconButton onClick={(e) => { e.stopPropagation(); handleEdit(transazione); }}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={t('transazioni_page.actions.delete')}>
                        <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteClick(transazione); }}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {t('transazioni_page.table.nessun_risultato')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box className="transazioni-pagination">
          <Box className="pagination-buttons">
            <Button
              disabled={!canGoToPreviousPage}
              onClick={() =>
                searchTerm ? setPageGenericSearch(pageGenericSearch - 1) : setPage(page - 1)
              }
            >
              {t('transazioni_page.buttons.pagina_precedente')}
            </Button>
            <Button
              disabled={!canGoToNextPage}
              onClick={() =>
                searchTerm ? setPageGenericSearch(pageGenericSearch + 1) : setPage(page + 1)
              }
            >
              {t('transazioni_page.buttons.pagina_successiva')}
            </Button>
          </Box>
          <TextField
            select
            label={t('transazioni_page.labels.elementi_per_pagina')}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              searchTerm ? setPageGenericSearch(1) : setPage(1);
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
          clienteNome={isFilterActive && selectedCliente ? selectedCliente?.nome + ' ' + selectedCliente?.cognome : null}
          clienteId={clienteId || null}
          isFilterActive={isFilterActive}
        />

        {/* Dialog Conferma Elimina */}
        <ConfirmDialog
          open={openDeleteDialog}
          onClose={() => setOpenDeleteDialog(false)}
          onConfirm={handleDeleteConfirm}
          title={t('transazioni_page.dialogs.conferma_eliminazione')}
        />
      </>
    )}
  </Paper>
);
};

export default TransazioniPage;
