export const decrementPeopleCounter = async (): Promise<void> => {
  const apiUrl = import.meta.env.VITE_AI_API_URL || "http://localhost:8000/api";
  try {
    const response = await fetch(`${apiUrl}/decrement`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error(
      "Errore nel decremento del contatore remoto in api service:",
      error,
    );
    throw error;
  }
};
