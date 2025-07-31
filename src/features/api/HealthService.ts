import axios from "axios";
import { BASE_URL_HEALTH as API_URL } from "../../enum/RoutesEnum";

export const checkHealth = async () => {
  const response = await axios.get(`${API_URL}`);
  return {
    data: response.data.data,
  };
};
