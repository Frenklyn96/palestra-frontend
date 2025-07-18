import React, { useState, useEffect } from "react";
import {
  LocalizationProvider,
  DateTimePicker,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import it from "date-fns/locale/it";
import {
  Button,
  Popover,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  IconButton,
  Tooltip,
} from "@mui/material";
import { format } from "date-fns";
import EventIcon from '@mui/icons-material/Event';
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

import "./DatePickerWithExternalButton.css";

interface DateRangePickerPopoverProps {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  searchTerm?: string;
  setPageGenericSearch?: (page: number) => void;
  setPage?: (page: number) => void;
  setFilterApplied?: (applied: boolean) => void;
  t: (key: string) => string;
}

const ResponsiveDateTimeRangePicker = ({
  startDate,
  endDate,
  onChange,
  searchTerm,
  setPageGenericSearch,
  setPage,
  setFilterApplied,
  t,
}: DateRangePickerPopoverProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [localStart, setLocalStart] = useState<Date | null>(startDate);
  const [localEnd, setLocalEnd] = useState<Date | null>(endDate);

  useEffect(() => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
  }, [startDate, endDate]);

  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setLocalStart(startDate);
    setLocalEnd(endDate);
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    onChange(localStart, localEnd);
    if (searchTerm && setPageGenericSearch) setPageGenericSearch(1);
    else if (setPage) setPage(1);
    if (setFilterApplied) setFilterApplied(true);
    handleClose();
  };

  const handleClear = () => {
    setLocalStart(null);
    setLocalEnd(null);
    onChange(null, null);
    if (searchTerm && setPageGenericSearch) setPageGenericSearch(1);
    else if (setPage) setPage(1);
    if (setFilterApplied) setFilterApplied(true);
    handleClose();
  };

  const formatDate = (date: Date | null) =>
    date ? format(date, "dd/MM/yyyy") : "-";

  const hasFilterApplied = Boolean(localStart || localEnd);

  const showLabel = !isSmallScreen && hasFilterApplied;

  const buttonLabel = showLabel
    ? `${formatDate(localStart)} - ${formatDate(localEnd)}`
    : null;

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleClick}
        startIcon={
          <EventIcon
            sx={{
              color: hasFilterApplied ? theme.palette.primary.main : "gray",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        }
        className={`datepicker-button ${hasFilterApplied ? "has-filter" : ""}`}
        aria-label={buttonLabel || t("transazioni_page.buttons.seleziona_intervallo")}
      >
        {buttonLabel}
      </Button>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ className: "popover-paper" }}
      >
        <Typography variant="h6" mb={1}>
          {t("transazioni_page.buttons.seleziona_intervallo")}
        </Typography>

        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={it}>
          <DateTimePicker
            label={t("transazioni_page.labels.data_inizio")}
            value={localStart}
            onChange={(newValue) => setLocalStart(newValue)}
            views={["year", "month", "day"]}
            slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
          />
          <DateTimePicker
            label={t("transazioni_page.labels.data_fine")}
            value={localEnd}
            onChange={(newValue) => setLocalEnd(newValue)}
            views={["year", "month", "day"]}
            slotProps={{ textField: { fullWidth: true, margin: "normal" } }}
          />
        </LocalizationProvider>

        <Box mt={2} display="flex" justifyContent="space-between" gap={1}>
          <Tooltip title={t("transazioni_page.buttons.rimuovi_filtri")}>
            <span>
              <IconButton
                aria-label={t("transazioni_page.buttons.rimuovi_filtri")}
                color="error"
                onClick={handleClear}
                disabled={!localStart && !localEnd}
                size="large"
                className="icon-button-large"
              >
                <CloseIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t("transazioni_page.buttons.applica_filtro")}>
            <span>
              <IconButton
                aria-label={t("transazioni_page.buttons.applica_filtro")}
                onClick={handleApply}
                disabled={!localStart && !localEnd}
                size="large"
                className="icon-button-large"
              >
                <CheckIcon sx={{ color: (!localStart && !localEnd) ? 'gray' : '#1976D2' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Popover>
    </>
  );
};

export default ResponsiveDateTimeRangePicker;
