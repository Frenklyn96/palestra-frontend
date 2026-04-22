import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  CircularProgress,
  MenuItem,
  TextField,
  Menu,
  Snackbar,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PaymentIcon from "@mui/icons-material/Payment";
import { RootState, AppDispatch } from "../../store/store";
import {
  fetchClienti,
  deleteClienteAsync,
  updateClienteAsync,
  createClienteAsync,
  selectCliente,
} from "../../features/slice/clientiSlice";
import { createEntranceAsync } from "../../features/slice/entrancesSlice";
import { Cliente } from "../../features/class/Cliente";
import ClienteDialog from "../../features/components/clienteDialog/ClienteDialog";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../../features/components/generic/ConfirmDialog";
import GenericSearchTable, {
  TableNames,
} from "../../features/components/generic/GenericSearchTable";
import LoginIcon from "@mui/icons-material/Login";
import { useTranslation } from "react-i18next";
import PeopleIcon from "@mui/icons-material/People";
import "./ClientiPage.css";
import "../../styles/MainLayout.css";
import AddIcon from "@mui/icons-material/Add";
import { Paper } from "@mui/material";
import DownloadingIcon from "@mui/icons-material/Downloading";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BadgeIcon from "@mui/icons-material/Badge";
import QRCode from "qrcode";

type ClienteKeys = keyof Cliente;

const ClientiPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { clienti, loading, totalCount } = useSelector(
    (state: RootState) => state.clienti,
  );
  const { results: filteredClienti, totalCount: totalCountGeneric } =
    useSelector((state: RootState) => state.generic);

  // const [filteredClienti, setFilteredClienti] = useState<Cliente[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [clienteToEdit, setClienteToEdit] = useState<Cliente | undefined>(
    undefined,
  );
  const [clienteToDelete, setClienteToDelete] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderBy, setOrderBy] = useState<ClienteKeys>("numeroTessera");
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("asc");
  const userId = useSelector((state: RootState) => state.user.userId);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [pageGenericSearch, setPageGenericSearch] = useState(1);
  // const [pageSizeGenericSearch, setPageSizeGenericSearch] = useState(20);

  const [totalPages, setTotalPages] = useState(0);
  const [clientiToRender, setClientiToRender] = useState<Cliente[]>([]);
  const { t } = useTranslation();

  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuCliente, setMenuCliente] = useState<Cliente | null>(null);
  const openMenu = Boolean(anchorEl);
  const [tesseraError, setTesseraError] = useState<string | null>(null);

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    cliente: Cliente,
  ) => {
    setAnchorEl(event.currentTarget);
    setMenuCliente(cliente);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuCliente(null);
  };
  useEffect(() => {
    const fetchData = async () => {
      await dispatch(
        fetchClienti({
          page,
          pageSize,
          orderBy,
          ascending: orderDirection === "asc",
          userId: userId!,
        }),
      );
    };
    fetchData();
  }, [page, pageSize, orderBy, orderDirection, pageGenericSearch]);

  useEffect(() => {
    setTotalPages(
      searchTerm
        ? Math.ceil(totalCountGeneric / pageSize)
        : Math.ceil(totalCount / pageSize),
    );

    setClientiToRender(searchTerm ? filteredClienti : clienti);
  }, [clienti, searchTerm, filteredClienti]);

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
  const handleEntrancesSelectCliente = (cliente: Cliente) => {
    dispatch(selectCliente(cliente));
    navigate(`/clienti/${cliente.id}/ingressi`);
  };

  const handleOpenDeleteDialog = (clienteId: string) => {
    setClienteToDelete(clienteId);
  };

  const handleCloseDeleteDialog = () => {
    setClienteToDelete(null);
  };

  const handleRequestSort = (property: ClienteKeys) => {
    const isAsc = orderBy === property && orderDirection === "asc";
    setOrderDirection(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleScalaEntrances = async (cliente: Cliente) => {
    try {
      await dispatch(
        createEntranceAsync({
          dataOra: new Date(),
          clienteId: cliente.id,
          userId: userId!,
        }),
      ).unwrap(); // ottieni direttamente il payload

      // Solo se è andata bene:
      setClientiToRender((prev) =>
        prev.map((c) =>
          c.id === cliente.id
            ? {
                ...c,
                scadenza:
                  c.ingressiResidui && c.ingressiResidui - 1 === 0
                    ? new Date()
                    : c.scadenza,
                ingressiResidui: (c.ingressiResidui || 0) - 1,
              }
            : c,
        ),
      );
    } catch (error) {
      console.error(t("cliente_page.errors.create_entrance"), error);
      // opzionalmente: mostra notifica
    }
  };

  const handleDownloadTessera = async (cliente: Cliente) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(cliente.id, {
        width: 512,
        margin: 2,
      });

      const response = await fetch(
        `${import.meta.env.VITE_BE_URL_LOCAL}/api/Clienti/${cliente.id}/tessera`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrDataUrl }),
        },
      );

      if (!response.ok) throw new Error(await response.text());

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tessera-${cliente.numeroTessera || cliente.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Errore download tessera", error);
      setTesseraError(
        error?.message ?? "Errore durante la generazione della tessera.",
      );
    }
  };

  return (
    <Paper sx={{ padding: 2, position: "relative", minHeight: "200px" }}>
      <Snackbar
        open={!!tesseraError}
        autoHideDuration={6000}
        onClose={() => setTesseraError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setTesseraError(null)}>
          {tesseraError}
        </Alert>
      </Snackbar>
      {loading ? (
        <Box className="loading-container">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box className="clienti-page-header">
            <h1 className="clienti-page-title">
              <PeopleIcon className="clienti-page-icon" />
              {t("cliente_page.page_title")}
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
                placeholder={t(
                  "cliente_page.generic_search.search_placeholder",
                )}
              />
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleOpenAddDialog}
                className="button-general"
              >
                {t("cliente_page.buttons.add_client")}
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    {t("cliente_page.table.headers.active")}
                  </TableCell>
                  <TableCell
                    onClick={() => handleRequestSort("numeroTessera")}
                    className="clienti-page-table-cell-sortable"
                  >
                    {t("cliente_page.table.headers.card_number")}
                  </TableCell>
                  <TableCell
                    onClick={() => handleRequestSort("nome")}
                    className="clienti-page-table-cell-sortable"
                  >
                    {t("cliente_page.table.headers.first_name")}
                  </TableCell>
                  <TableCell
                    onClick={() => handleRequestSort("cognome")}
                    className="clienti-page-table-cell-sortable"
                  >
                    {t("cliente_page.table.headers.last_name")}
                  </TableCell>
                  <TableCell
                    onClick={() => handleRequestSort("scadenza")}
                    className="clienti-page-table-cell-sortable"
                  >
                    {t("cliente_page.table.headers.expiration")}
                  </TableCell>
                  <TableCell>
                    {t("cliente_page.table.headers.remaining_entries")}
                  </TableCell>
                  <TableCell align="right">
                    {t("cliente_page.table.headers.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clientiToRender && clientiToRender.length > 0 ? (
                  clientiToRender.map((cliente) => {
                    const scadenzaFormatted = cliente.scadenza
                      ? new Date(cliente.scadenza).toLocaleDateString("it-IT")
                      : "";

                    return (
                      <TableRow key={cliente.id} hover>
                        <TableCell>
                          {cliente.scadenza && (
                            <Tooltip
                              title={
                                new Date(cliente.scadenza) <= new Date()
                                  ? t("cliente_page.table.headers.expired")
                                  : cliente.giorniTariffa &&
                                      new Date(
                                        new Date(cliente.scadenza).setDate(
                                          new Date(cliente.scadenza).getDate() -
                                            cliente.giorniTariffa,
                                        ),
                                      ) > new Date()
                                    ? t(
                                        "cliente_page.table.headers.fatureActivation",
                                      ) +
                                      " " +
                                      new Date(
                                        new Date(cliente.scadenza).setDate(
                                          new Date(cliente.scadenza).getDate() -
                                            cliente.giorniTariffa,
                                        ),
                                      ).toLocaleDateString("it-IT")
                                    : t("cliente_page.table.headers.enable")
                              }
                            >
                              <Box
                                className={`clienti-page-status-dot ${
                                  new Date(cliente.scadenza) > new Date()
                                    ? cliente.giorniTariffa &&
                                      new Date(
                                        new Date(cliente.scadenza).setDate(
                                          new Date(cliente.scadenza).getDate() -
                                            cliente.giorniTariffa,
                                        ),
                                      ) > new Date()
                                      ? "featureActivation"
                                      : "active"
                                    : "inactive"
                                }`}
                              />
                            </Tooltip>
                          )}
                        </TableCell>
                        <TableCell>{cliente.numeroTessera}</TableCell>
                        <TableCell>{cliente.nome}</TableCell>
                        <TableCell>{cliente.cognome}</TableCell>
                        <TableCell>
                          {cliente.ingressiResidui ? "" : scadenzaFormatted}
                        </TableCell>
                        <TableCell>{cliente.ingressiResidui}</TableCell>
                        <TableCell align="right" className="actions-cell">
                          <div className="actions-container">
                            {/* Bottoni singoli (grandi schermi) */}
                            <div className="actions-buttons">
                              {/* DownloadingIcon qui */}
                              {cliente.ingressiResidui != null && (
                                <Tooltip
                                  title={
                                    cliente.ingressiResidui === 0
                                      ? t(
                                          "cliente_page.actions.tooltip_enteries_zero",
                                        )
                                      : t(
                                          "cliente_page.actions.tooltip_enteries",
                                        )
                                  }
                                >
                                  <span>
                                    <IconButton
                                      color="secondary"
                                      disabled={cliente.ingressiResidui === 0}
                                      onClick={() =>
                                        handleScalaEntrances(cliente)
                                      }
                                      className="icon-neutral"
                                      size="small"
                                    >
                                      <DownloadingIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}

                              {/* Altri bottoni */}
                              <Tooltip title={t("cliente_page.actions.edit")}>
                                <IconButton
                                  onClick={() => handleOpenEditDialog(cliente)}
                                  className="icon-neutral"
                                  size="small"
                                >
                                  <EditIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip
                                title={t("cliente_page.actions.transactions")}
                              >
                                <IconButton
                                  onClick={() => handleSelectCliente(cliente)}
                                  className="icon-neutral"
                                  size="small"
                                >
                                  <PaymentIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Scarica Tessera">
                                <IconButton
                                  onClick={() => handleDownloadTessera(cliente)}
                                  className="icon-neutral"
                                  size="small"
                                >
                                  <BadgeIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip
                                title={t("cliente_page.actions.all_entrances")}
                              >
                                <IconButton
                                  onClick={() =>
                                    handleEntrancesSelectCliente(cliente)
                                  }
                                  className="icon-neutral"
                                  size="small"
                                >
                                  <LoginIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={t("cliente_page.actions.delete")}>
                                <IconButton
                                  onClick={() =>
                                    handleOpenDeleteDialog(cliente.id)
                                  }
                                  size="small"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </div>

                            {/* Menu a tendina (piccoli schermi) */}
                            <div className="actions-menu">
                              <IconButton
                                onClick={(e) => handleMenuClick(e, cliente)}
                                className="icon-neutral"
                                size="small"
                                aria-controls={
                                  openMenu
                                    ? `actions-menu-${cliente.id}`
                                    : undefined
                                }
                                aria-haspopup="true"
                                aria-expanded={openMenu ? "true" : undefined}
                              >
                                <MoreVertIcon />
                              </IconButton>

                              <Menu
                                id={`actions-menu-${cliente.id}`}
                                anchorEl={anchorEl}
                                open={
                                  openMenu && menuCliente?.id === cliente.id
                                }
                                onClose={handleMenuClose}
                                PaperProps={{
                                  sx: {
                                    boxShadow: "0px 2px 8px rgba(0,0,0,0.12)",
                                  },
                                }}
                              >
                                {/* DownloadingIcon anche nel menu */}
                                {cliente.ingressiResidui != null && (
                                  <MenuItem
                                    onClick={() => {
                                      handleScalaEntrances(cliente);
                                      handleMenuClose();
                                    }}
                                    disabled={cliente.ingressiResidui === 0}
                                  >
                                    <DownloadingIcon
                                      sx={{ mr: 1 }}
                                      fontSize="small"
                                    />{" "}
                                    {cliente.ingressiResidui === 0
                                      ? t(
                                          "cliente_page.actions.tooltip_enteries_zero",
                                        )
                                      : t(
                                          "cliente_page.actions.tooltip_enteries",
                                        )}
                                  </MenuItem>
                                )}

                                <MenuItem
                                  onClick={() => {
                                    handleOpenEditDialog(menuCliente!);
                                    handleMenuClose();
                                  }}
                                >
                                  <EditIcon sx={{ mr: 1 }} fontSize="small" />{" "}
                                  {t("cliente_page.actions.edit")}
                                </MenuItem>

                                <MenuItem
                                  onClick={() => {
                                    handleSelectCliente(menuCliente!);
                                    handleMenuClose();
                                  }}
                                >
                                  <PaymentIcon
                                    sx={{ mr: 1 }}
                                    fontSize="small"
                                  />{" "}
                                  {t("cliente_page.actions.transactions")}
                                </MenuItem>

                                <MenuItem
                                  onClick={() => {
                                    handleDownloadTessera(menuCliente!);
                                    handleMenuClose();
                                  }}
                                >
                                  <BadgeIcon sx={{ mr: 1 }} fontSize="small" />{" "}
                                  Scarica Tessera
                                </MenuItem>

                                <MenuItem
                                  onClick={() => {
                                    handleEntrancesSelectCliente(menuCliente!);
                                    handleMenuClose();
                                  }}
                                >
                                  <LoginIcon sx={{ mr: 1 }} fontSize="small" />{" "}
                                  {t("cliente_page.actions.all_entrances")}
                                </MenuItem>

                                <MenuItem
                                  onClick={() => {
                                    handleOpenDeleteDialog(menuCliente!.id);
                                    handleMenuClose();
                                  }}
                                >
                                  <DeleteIcon sx={{ mr: 1 }} fontSize="small" />{" "}
                                  {t("cliente_page.actions.delete")}
                                </MenuItem>
                              </Menu>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {t("cliente_page.table.no_clients_found")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box className="clienti-page-pagination-container">
            <Box className="pagination-buttons">
              <Button
                disabled={searchTerm ? pageGenericSearch <= 1 : page <= 1}
                onClick={() =>
                  searchTerm
                    ? setPageGenericSearch(pageGenericSearch - 1)
                    : setPage(page - 1)
                }
              >
                {t("cliente_page.buttons.previous_page")}
              </Button>

              <Button
                disabled={
                  searchTerm
                    ? pageGenericSearch >= totalPages
                    : page >= totalPages
                }
                onClick={() =>
                  searchTerm
                    ? setPageGenericSearch(pageGenericSearch + 1)
                    : setPage(page + 1)
                }
              >
                {t("cliente_page.buttons.next_page")}
              </Button>
            </Box>

            <TextField
              select
              label={t("cliente_page.pagination.items_per_page")}
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
            title={t("cliente_page.dialog.confirm_delete_title")}
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
