import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Typography,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LoginIcon from "@mui/icons-material/Login";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import {
  fetchEntrances,
  deleteEntranceAsync,
} from "../../features/slice/entrancesSlice";
import { useParams, useNavigate } from "react-router-dom";
import GenericSearchTable, {
  TableNames,
} from "../../features/components/generic/GenericSearchTable";
import ConfirmDialog from "../../features/components/generic/ConfirmDialog";
import { fetchClienteById } from "../../features/slice/clientiSlice";
import { useTranslation } from "react-i18next";
import ResponsiveDateTimeRangePicker from "../../features/components/DatePickerWithExternButton/ResponsiveDateTimeRangePicker";

import "./IngressiPage.css"; // <-- Import nuovo CSS con ingressi-*
import { Entrance } from "../../features/class/Entrances";
import IngressiDialog from "../../features/components/ingressiDialog/IngressiDialog";

const IngressiPage: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { entrances, totalCount, loading } = useSelector(
    (state: RootState) => state.entrance,
  );
  const userId = useSelector((state: RootState) => state.user.userId);

  const {
    results: resultsEntranceFiltered,
    totalCount: totalCountEntranceFIltered,
  } = useSelector((state: RootState) => state.generic);
  const { selectedCliente } = useSelector((state: RootState) => state.clienti);
  const [searchTerm, setSearchTerm] = useState("");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [entranceToDelete, setEntranceToDelete] = useState<Entrance | null>(
    null,
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [filterApplied, setFilterApplied] = useState(false);

  const [orderBy, setOrderBy] = useState<string>("DataOra");
  const [ascending, setAscending] = useState<boolean>(false);

  const [pageGenericSearch, setPageGenericSearch] = useState(1);
  const [entranceToRender, setEntranceiToRender] = useState<
    Entrance[] | undefined
  >(undefined);
  const { clienteId } = useParams<{ clienteId: string }>();
  const isFilterActive = !!clienteId;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [openAddDialog, setOpenAddDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (filterApplied || (!startDate && !endDate)) {
        clienteId &&
          !selectedCliente &&
          (await dispatch(fetchClienteById(clienteId)));
        await dispatch(
          fetchEntrances({
            startDate,
            endDate,
            page,
            pageSize,
            clienteId,
            orderBy,
            ascending,
            userId: userId!,
          }) as any,
        );
      }
    };

    fetchData();
  }, [
    page,
    pageSize,
    startDate,
    endDate,
    filterApplied,
    orderBy,
    ascending,
    clienteId,
    pageGenericSearch,
  ]);

  const handleOpenAddDialog = () => {
    setSearchTerm("");
    setOpenAddDialog(true);
  };

  const handleDeleteClick = (entrance: Entrance) => {
    setEntranceToDelete(entrance);
    setOpenDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (entranceToDelete) {
      try {
        await dispatch(deleteEntranceAsync(entranceToDelete.id));
      } catch (error) {
        console.error("Errore durante la cancellazione della entrance", error);
      }
    }
    setOpenDeleteDialog(false);
    setEntranceToDelete(null);
  };

  useEffect(() => {
    setEntranceiToRender(
      searchTerm
        ? (resultsEntranceFiltered as Entrance[])
        : (entrances as Entrance[]),
    );
  }, [searchTerm, entrances, resultsEntranceFiltered]);

  const totalPages = Math.ceil(
    (searchTerm ? totalCountEntranceFIltered : totalCount) / pageSize,
  );
  const canGoToNextPage = (searchTerm ? pageGenericSearch : page) < totalPages;
  const canGoToPreviousPage = (searchTerm ? pageGenericSearch : page) > 1;

  const handleSort = (column: string) => {
    const isAsc = orderBy === column && ascending;
    setOrderBy(column);
    setAscending(!isAsc);
  };
  return (
    <Paper sx={{ padding: 2, position: "relative", minHeight: "200px" }}>
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
              onClick={() => navigate("/clienti")}
              className="ingressi-back-button"
            >
              {t("ingressi_page.buttons.torna_clienti")}
            </Button>
          )}

          <Box className="ingressi-header">
            <Typography variant="h4" className="ingressi-title">
              <LoginIcon className="ingressi-page-icon" />
              {t("ingressi_page.table.title")}{" "}
              {isFilterActive && selectedCliente && (
                <span className="ingressi-selected-cliente">
                  {selectedCliente.nome + " " + selectedCliente?.cognome}
                </span>
              )}
            </Typography>

            <Box className="ingressi-actions">
              <GenericSearchTable
                tableName={TableNames.ENTRANCES} // considerare di creare TableNames.INGRESSI se necessario
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                page={pageGenericSearch}
                pageSize={pageSize}
                orderBy={orderBy}
                orderDirection={ascending ? "asc" : "desc"}
                userId={userId!}
                placeholder={t(
                  "ingressi_page.generic_search.search_placeholder",
                )}
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                className="button-general"
                onClick={handleOpenAddDialog}
              >
                {t("ingressi_page.buttons.aggiungi")}
              </Button>
            </Box>
          </Box>

          {/* Filtro date */}
          <Box className="ingressi-filtro-date">
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
                  <TableCell
                    onClick={() => handleSort("clienteNome")}
                    className="sortable-cell"
                  >
                    {t("ingressi_page.table.cliente")}
                  </TableCell>
                  <TableCell
                    onClick={() => handleSort("dataOra")}
                    className="sortable-cell"
                  >
                    {t("ingressi_page.table.data_entrance")}
                  </TableCell>
                  <TableCell align="right">
                    {t("ingressi_page.table.azioni")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entranceToRender && entranceToRender.length > 0 ? (
                  entranceToRender.map((entrance, index) => (
                    <TableRow key={index} hover>
                      <TableCell>{entrance.clienteName || ""}</TableCell>
                      <TableCell>
                        {new Date(entrance.dataOra).toLocaleDateString("it-IT")}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={t("ingressi_page.actions.delete")}>
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(entrance);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {t("ingressi_page.table.nessun_risultato")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <Box className="ingressi-pagination">
            <Box className="pagination-buttons">
              <Button
                disabled={!canGoToPreviousPage}
                onClick={() =>
                  searchTerm
                    ? setPageGenericSearch(pageGenericSearch - 1)
                    : setPage(page - 1)
                }
              >
                {t("ingressi_page.buttons.pagina_precedente")}
              </Button>
              <Button
                disabled={!canGoToNextPage}
                onClick={() =>
                  searchTerm
                    ? setPageGenericSearch(pageGenericSearch + 1)
                    : setPage(page + 1)
                }
              >
                {t("ingressi_page.buttons.pagina_successiva")}
              </Button>
            </Box>
            <TextField
              select
              label={t("ingressi_page.labels.elementi_per_pagina")}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                searchTerm ? setPageGenericSearch(1) : setPage(1);
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

          {/* Dialog Conferma Elimina */}
          <ConfirmDialog
            open={openDeleteDialog}
            onClose={() => setOpenDeleteDialog(false)}
            onConfirm={handleDeleteConfirm}
            title={t("ingressi_page.confirm.delete_title")}
            message={t("ingressi_page.confirm.delete_message")}
          />
        </>
      )}
      <IngressiDialog
        open={openAddDialog}
        clienteId={clienteId || ""}
        onClose={() => setOpenAddDialog(false)}
      />
    </Paper>
  );
};

export default IngressiPage;
