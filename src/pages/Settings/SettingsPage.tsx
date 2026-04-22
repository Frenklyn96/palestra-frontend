import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
  Backdrop,
  Box,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import ClearIcon from "@mui/icons-material/Clear";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import { RootState } from "../../store/store";
import {
  addTariffaAsync,
  updateTariffaAsync,
  removeTariffaAsync,
  fetchTariffe,
  uploadFotoAsync,
  getFotoHomeAsync,
  uploadTemplateAsync,
  deleteTemplateAsync,
  saveTemplateFieldsAsync,
} from "../../features/slice/settingsSlice";
import { Tariffa, TemplateField } from "../../features/class/Tariffa";
import { AppDispatch } from "../../store/store";
import TariffaFormDialog from "../../features/components/settingsDialog/SettingsDialog";
import ConfirmDialog from "../../features/components/generic/ConfirmDialog";
import ImageUploader from "../../features/components/ImageUploader/ImageUploader";
import TemplateFieldEditor from "../../features/components/templateFieldEditor/TemplateFieldEditor";
import TuneIcon from "@mui/icons-material/Tune";
import { useTranslation } from "react-i18next";

import "./SettingsPage.css"; // <-- Importa qui il CSS esterno
import SettingsIcon from "@mui/icons-material/Settings";

const SettingsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const tariffe = useSelector((state: RootState) => state.settings.tariffe);
  const loading = useSelector((state: RootState) => state.settings.loading);
  const userId = useSelector((state: RootState) => state.user.userId);
  const foto = useSelector((state: RootState) => state.settings.foto);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTariffa, setSelectedTariffa] = useState<Tariffa | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tariffaToDelete, setTariffaToDelete] = useState<Tariffa | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTariffa, setEditorTariffa] = useState<Tariffa | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(fetchTariffe(userId!));
    dispatch(getFotoHomeAsync());
  }, [dispatch, userId]);

  const handleOpenAddDialog = () => {
    setSelectedTariffa(null);
    setErrorCode(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (tariffa: Tariffa) => {
    setSelectedTariffa(tariffa);
    setErrorCode(null);
    setDialogOpen(true);
  };

  const handleOpenDeleteDialog = (tariffa: Tariffa) => {
    setTariffaToDelete(tariffa);
    setDeleteDialogOpen(true);
  };

  const handleSubmitTariffa = async (tariffa: Tariffa) => {
    const isEdit = !!selectedTariffa;
    const action = isEdit ? updateTariffaAsync : addTariffaAsync;
    const resultAction = await dispatch(
      action({ ...tariffa, userId: userId! }),
    );

    if (resultAction.meta.requestStatus === "rejected") {
      const errorMessage = resultAction.payload as string;
      if (errorMessage === "TARIFFA_DUPLICATA") {
        setErrorCode("TARIFFA_DUPLICATA");
      }
    } else {
      setErrorCode(null);
      setDialogOpen(false);
      dispatch(fetchTariffe(userId!));
    }
  };

  const handleDeleteConfirmed = async () => {
    if (tariffaToDelete) {
      const resultAction = await dispatch(
        removeTariffaAsync(tariffaToDelete.id),
      );

      if (resultAction.meta.requestStatus === "rejected") {
        console.error("Errore durante l'eliminazione della tariffa");
      } else {
        dispatch(fetchTariffe(userId!));
      }
      setDeleteDialogOpen(false);
    }
  };

  const handleUploadTemplate = async (tariffa: Tariffa, file: File) => {
    await dispatch(uploadTemplateAsync({ tariffaId: tariffa.id, file }));
  };

  const handleDeleteTemplate = async (tariffa: Tariffa) => {
    await dispatch(deleteTemplateAsync(tariffa.id));
  };

  const handleSaveFields = async (fields: TemplateField[]) => {
    if (!editorTariffa) return;
    await dispatch(
      saveTemplateFieldsAsync({ tariffaId: editorTariffa.id, fields }),
    );
    setEditorOpen(false);
  };

  return (
    <>
      <Paper sx={{ padding: 2, position: "relative", minHeight: "200px" }}>
        <>
          <Box className="header-container">
            <Typography variant="h4" gutterBottom>
              <SettingsIcon className="settings-page-icon" />{" "}
              {t("settings_page.title")}
            </Typography>

            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              className="button-general"
            >
              {t("settings_page.buttons.aggiungi_tariffa")}
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t("settings_page.table.nome_tariffa")}</TableCell>
                  <TableCell>{t("settings_page.table.durata")}</TableCell>
                  <TableCell>{t("settings_page.table.costo")}</TableCell>
                  <TableCell>Template</TableCell>
                  <TableCell align="right">
                    {t("settings_page.table.azioni")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tariffe.map((tariffa, index) => (
                  <TableRow key={index}>
                    <TableCell>{tariffa.nome}</TableCell>
                    <TableCell>
                      {tariffa.durata} {tariffa.unitaDurata}
                    </TableCell>
                    <TableCell>{tariffa.costo.toFixed(2)} €</TableCell>
                    <TableCell>
                      {tariffa.templatePath ? (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <InsertDriveFileIcon
                            fontSize="small"
                            color="primary"
                          />
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ maxWidth: 120 }}
                          >
                            {tariffa.templatePath.split(/[\\/]/).pop()}
                          </Typography>
                          <Tooltip title="Configura posizioni campi">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setEditorTariffa(tariffa);
                                setEditorOpen(true);
                              }}
                            >
                              <TuneIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Rimuovi template">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteTemplate(tariffa)}
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      ) : (
                        <>
                          <input
                            id={`template-upload-${tariffa.id}`}
                            type="file"
                            accept=".png,.jpg,.jpeg"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadTemplate(tariffa, file);
                              e.target.value = "";
                            }}
                          />
                          <label htmlFor={`template-upload-${tariffa.id}`}>
                            <Tooltip title="Carica template PNG/JPG">
                              <IconButton
                                component="span"
                                size="small"
                                color="primary"
                              >
                                <UploadFileIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </label>
                        </>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("settings_page.actions.edit")}>
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenEditDialog(tariffa)}
                          className="icon-neutral"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={t("settings_page.actions.delete")}>
                        <IconButton
                          color="error"
                          onClick={() => handleOpenDeleteDialog(tariffa)}
                          className="icon-neutral"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TariffaFormDialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            initialData={selectedTariffa}
            onSubmit={handleSubmitTariffa}
            errorCode={errorCode}
          />

          <ConfirmDialog
            open={deleteDialogOpen}
            onClose={() => setDeleteDialogOpen(false)}
            onConfirm={handleDeleteConfirmed}
            title={t("settings_page.dialogs.conferma_eliminazione")}
            message={t("settings_page.dialogs.elimina_messaggio", {
              nome: tariffaToDelete?.nome || "",
            })}
          />

          <Backdrop open={loading} className="settings-backdrop">
            <CircularProgress color="inherit" />
          </Backdrop>
        </>
      </Paper>

      {editorTariffa && (
        <TemplateFieldEditor
          open={editorOpen}
          tariffa={editorTariffa}
          onClose={() => setEditorOpen(false)}
          onSave={handleSaveFields}
        />
      )}

      <Paper className="settings-paper mt-4">
        <Typography variant="h4" gutterBottom textAlign="left">
          {t("settings_page.upload.immagine_home")}
        </Typography>

        <Box className="image-uploader-container">
          <ImageUploader
            onFileSelect={(file) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = reader.result as string;
                dispatch(uploadFotoAsync(base64String));
              };
              reader.readAsDataURL(file);
            }}
            initialImageUrl={foto || undefined}
          />
        </Box>
      </Paper>
    </>
  );
};

export default SettingsPage;
