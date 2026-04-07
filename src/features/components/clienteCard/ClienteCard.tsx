import React from "react";
import { Card, CardContent, Typography, Box } from "@mui/material";
import { Cliente } from "../../class/Cliente";
import { format } from "date-fns";
import "./ClienteCard.css";

interface Props {
  cliente: Cliente;
  showLargeStatus?: boolean;
}

const isValid = (scadenza: Date | null | undefined) => {
  if (!scadenza) return false;
  return new Date(scadenza) > new Date();
};

const ClienteCard: React.FC<Props> = ({ cliente, showLargeStatus = true }) => {
  const valido = isValid(cliente.scadenza);

  return (
    <Card className="cliente-card">
      <CardContent>
        <Box className="card-header">
          {showLargeStatus && (
            <Box className="status">
              <Box className={`statusDot ${valido ? "green" : "red"}`} />
              <Typography variant="h5" className="statusText">
                {valido ? "Valido" : "Scaduto"}
              </Typography>
            </Box>
          )}

          <Box className="name-column">
            <Typography variant="h6">{`${cliente.nome} ${cliente.cognome}`}</Typography>
            <Typography variant="body2" color="text.secondary">
              {cliente.email || "-"}
            </Typography>
          </Box>
        </Box>

        <Box className="info-grid">
          <Typography className="info-item">
            <strong>Telefono:</strong> {cliente.telefono || "-"}
          </Typography>
          <Typography className="info-item">
            <strong>Numero Tessera:</strong> {cliente.numeroTessera || "-"}
          </Typography>
          <Typography className="info-item">
            <strong>Tariffa:</strong> {cliente.tariffaNome || "-"}
          </Typography>
          <Typography className="info-item">
            <strong>Scadenza:</strong>{" "}
            {cliente.scadenza
              ? format(new Date(cliente.scadenza), "dd/MM/yyyy")
              : "-"}
          </Typography>
          <Typography className="note">
            <strong>Note:</strong> {cliente.note || "-"}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ClienteCard;
